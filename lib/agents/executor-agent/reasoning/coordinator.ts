/**
 * Coordinator - LLM-Driven Step Coordination
 * 
 * Replaces static pattern matching with semantic LLM reasoning
 */

import { CoordinationResult, StepExecutionContext } from '../types'
import { logger } from '@/utils/logger'
import { formatMCPToolsForPrompt, findToolByName, getToolParameters, detectLookupFlow, isValidMongoDBObjectId, formatArrayResultsForExtraction } from '../utils/tool-schema-formatter'
import { createInternalAgent, InternalLLMAgent } from '../utils/internal-llm-agent'
import { validateToolParameters } from '../adapters/mcp-tool-adapter'

export class Coordinator {
  private agent: InternalLLMAgent
  
  /**
   * Build dynamic system prompt with MCP context
   */
  private buildSystemPrompt(mcpContext?: any): string {
    const basePrompt = `You are a Step Coordination Agent. Your job is to analyze execution steps and determine what parameters are needed and where to get them.

You understand:
- The user's goal and intent
- What each step is trying to accomplish
- What data is available from previous steps
- How to intelligently extract and transform data
- Available MCP tools and their exact parameter requirements (from tool schemas below)
- Available MCP prompts/workflow templates and their exact argument requirements (from prompt schemas below)
- When step action is a prompt, extract arguments the same way as tool parameters

When analyzing a step:
1. Understand what the step is trying to accomplish (semantic understanding)
2. Identify what parameters/arguments are needed by checking the tool's or prompt's schema (REQUIRED vs optional)
3. Determine if data can be extracted from previous step results
4. If a tool/prompt requires an ID parameter but you have a name/value, discover lookup tools from available MCP tools
5. Provide alternatives if data isn't available
6. Make intelligent recommendations about how to proceed

CRITICAL: Use EXACT parameter/argument names from tool/prompt schemas. Do not invent parameter names.
- For tools: Use parameter names exactly as shown in tool schema
- For prompts: Use argument names exactly as shown in prompt schema (e.g., "shipmentId" not "shipment_id")
- Extraction works the same way for prompts as for tools - extract _id from previous step results and map to required argument name

Respond with JSON only:
{
  "needsCoordination": boolean,
  "reasoning": "Your analysis of what's needed and what was extracted",
  "parameters": {...},  // Updated parameters with EXACT schema field names only (e.g., if tool needs 'id', use 'id', not 'facilityId' or 'facilityName')
  "extractedValues": {...},  // What was successfully extracted from previous results (e.g., {"id": "123"} extracted from array item)
  "missingParams": [...],  // Parameters that couldn't be found (use exact schema names)
  "alternatives": [...],  // Alternative approaches if data unavailable
  "recommendation": "proceed|adapt|ask-user"
}

CRITICAL: In "parameters" and "extractedValues", only include fields that exist in the tool or prompt schema. 
- For tools: Use exact parameter names from tool schema
- For prompts: Use exact argument names from prompt schema (match case exactly - e.g., "shipmentId" not "shipment_id")
If the tool/prompt requires an ID parameter (e.g., 'id', 'shipmentId'), extract the FULL '_id' value from the matching array item (the complete 24-character MongoDB ObjectId).
DO NOT add fields like 'facilityName', 'name', etc. unless they are in the tool/prompt schema.
DO NOT use placeholder or shortened ID values - always use the complete MongoDB ObjectId string.
When extracting for prompts, map the _id field to the exact argument name required (e.g., if prompt needs "shipmentId", extract _id and set "shipmentId": "_id_value").

Example: If get_facility(id: string) needs an ID, and you found:
  Item 1:
    ⭐ _id: "6905db9211cc522275d5f013" (MongoDB ObjectId)
    name: "Hannover"
  
  Then:
  → Set "parameters": {"id": "6905db9211cc522275d5f013"} (the FULL 24-character _id)
  → DO NOT set "parameters": {"id": "123"} or {"id": "6905db"} (these are wrong)
  → DO NOT set "parameters": {"id": "6905db9211cc522275d5f013", "facilityName": "Hannover"}`

    // Add MCP tool schemas dynamically
    const mcpToolsSection = formatMCPToolsForPrompt(mcpContext)
    
    return basePrompt + mcpToolsSection
  }

  constructor() {
    // Use executor-agent config (same as main executor)
    this.agent = createInternalAgent('executor-agent')
  }

  /**
   * Determine if step needs coordination - LLM-driven with dynamic MCP context
   */
  async shouldCoordinateStep(
    context: StepExecutionContext
  ): Promise<CoordinationResult> {
    const { step, state, previousResults } = context

    // Check tool or prompt schema to understand requirements
    const tool = findToolByName(state.mcpContext, step.action)
    const mcpPrompt = state.mcpContext?.prompts?.find(p => p.name === step.action)
    const toolParams = tool ? getToolParameters(tool) : null
    const lookupFlow = detectLookupFlow(state.mcpContext, step.action)

    let toolInfo = ''
    if (tool) {
      toolInfo = `\nTOOL SCHEMA INFORMATION:
- Tool: ${tool.name}
- Description: ${tool.description}
- Required parameters: ${toolParams?.required.join(', ') || 'none'}
- Optional parameters: ${toolParams?.optional.join(', ') || 'none'}`
      
      if (lookupFlow.needsLookup) {
        toolInfo += `\n- ⚠️ LOOKUP NEEDED: ${lookupFlow.reason}`
        if (lookupFlow.lookupTool) {
          toolInfo += `\n- Suggested lookup tool: ${lookupFlow.lookupTool}`
        }
      }
    } else if (mcpPrompt) {
      const requiredArgs = mcpPrompt.arguments?.filter((a: any) => a.required).map((a: any) => a.name) || []
      const optionalArgs = mcpPrompt.arguments?.filter((a: any) => !a.required).map((a: any) => a.name) || []
      toolInfo = `\nPROMPT/WORKFLOW TEMPLATE INFORMATION:
- Prompt: ${mcpPrompt.name}
- Description: ${mcpPrompt.description || 'No description'}
- Required arguments: ${requiredArgs.join(', ') || 'none'}
- Optional arguments: ${optionalArgs.join(', ') || 'none'}
- Note: This is a workflow template that may call multiple tools internally`
    } else {
      toolInfo = `\n⚠️ Action "${step.action}" not found in available MCP tools or prompts. Check available tools and prompts in system context.`
    }

    // Extract user query context for better matching
    const userQuery = state.requestContext.userQuery || ''
    const userQueryContext = userQuery 
      ? `\nUSER'S ORIGINAL QUERY: "${userQuery}"\nThis context helps identify which facility/item the user is looking for when matching names from arrays.`
      : ''

    const prompt = `STEP COORDINATION ANALYSIS

USER'S GOAL: ${state.plan.goal}
${userQueryContext}

CURRENT STEP:
- Step ${step.order}: ${step.description}
- Action: ${step.action}
- Parameters: ${JSON.stringify(step.parameters || {})}
${toolInfo}

PREVIOUS STEP RESULTS (use these to extract needed values):
${Object.entries(previousResults).length > 0
  ? Object.entries(previousResults)
      .map(([stepId, result]) => {
        const stepInfo = state.plan.steps.find(s => s.id === stepId)
        const stepAction = stepInfo?.action || 'unknown'
        
        // Format result more clearly for extraction with emphasis on _id fields
        let resultStr = ''
        if (typeof result === 'string') {
          resultStr = result
        } else if (Array.isArray(result)) {
          // Check if array is empty first
          if (result.length === 0) {
            resultStr = '⚠️ EMPTY ARRAY: No items found in previous step result.\nThis means the lookup/search failed.\nDO NOT try to extract IDs from empty arrays.\nSet missingParams and recommendation: "ask-user" instead.'
          } else {
            // Use specialized array formatter that highlights _id fields
            resultStr = formatArrayResultsForExtraction(result, 3)
          }
        } else if (result && typeof result === 'object') {
          // For single objects, highlight _id if present
          if (result._id) {
            resultStr = `Object with _id field:\n  ⭐ _id: "${result._id}" (MongoDB ObjectId - use this for 'id' parameter)\n`
            const otherFields = { ...result }
            delete otherFields._id
            if (Object.keys(otherFields).length > 0) {
              resultStr += `  Other fields: ${JSON.stringify(otherFields, null, 2).substring(0, 500)}${JSON.stringify(otherFields).length > 500 ? '...' : ''}\n`
            }
          } else {
            resultStr = JSON.stringify(result, null, 2)
          }
        } else {
          resultStr = String(result)
        }
        
        // Limit length but preserve structure
        if (resultStr.length > 1500) {
          resultStr = resultStr.substring(0, 1500) + '\n... (truncated)'
        }
        
        return `Step ${stepInfo?.order || stepId} (${stepAction}):\n${resultStr}`
      })
      .join('\n\n---\n\n')
  : 'No previous results'}

IMPORTANT: When you see ⭐ _id fields above, those are MongoDB ObjectIds (24 hex characters). 
Use these EXACT values when the tool requires an 'id' parameter. Do NOT use placeholder values like "123".

EXECUTION CONTEXT:
- Steps completed: ${state.executedSteps.size}/${state.plan.steps.length}
- Errors so far: ${state.errors.length}
- Questions asked: ${state.questionsAsked.length}

ANALYSIS QUESTIONS:
1. What is this step trying to accomplish? (Understand intent)
2. What parameters does this step need? Check tool schema for REQUIRED parameters
3. Are any REQUIRED parameters missing, incomplete, or need extraction from previous results?
4. If tool requires an ID parameter but you have a name/value, can you find a lookup tool from available MCP tools?
5. Can we extract needed values from previous step results? 
   - **CRITICAL: Check if array is empty first**
     * If previous step returned EMPTY ARRAY [] or array with 0 items:
       → Set needsCoordination: true
       → Set missingParams: [list of required params]
       → Set recommendation: "ask-user"
       → DO NOT set extractedValues or parameters with null/empty values
       → DO NOT extract string "null" - this is wrong
   - If previous step returned an ARRAY with items, find the matching item by comparing:
     * **CRITICAL NAME MATCHING**: Use the user's original query and step description to identify what to match
     * Example: If user query mentions "Central Waste Processing Hub" and step description says "Get the facility ID for 'Central Waste Processing Hub'":
       → Search array for item with name field containing "Central Waste Processing Hub" (case-insensitive, partial match OK)
       → Try exact match first, then partial match (e.g., "Central Waste" matches "Central Waste Processing Hub")
       → Remove common words like "the", "facility", "hub" for matching if needed
     * User query mentions "Hannover" → find item with name matching "Hannover" (case-insensitive, partial match OK)
     * User query mentions location → find item with location matching
     * User query mentions shortCode → find item with shortCode matching
     * **Fuzzy matching rules**:
       - Case-insensitive: "Hannover" = "hannover" = "HANNOVER"
       - Partial match: "Central Waste" matches "Central Waste Processing Hub"
       - Word order doesn't matter: "Waste Processing Central" still matches "Central Waste Processing Hub"
       - Ignore punctuation and extra spaces
     * If multiple matches, use the first one that matches the user's intent
   - Once you find the matching item, extract the EXACT field needed:
     * If tool needs 'id' parameter → extract '_id' field from the matching array item
     * Use the FULL 24-character MongoDB ObjectId value, never use empty strings or placeholders
     * The _id field is marked with ⭐ in the results above for easy identification
   - DO NOT add arbitrary fields - only use fields that exist in tool schema
   - If you cannot find a match in the array (array has items but none match), set missingParams and recommendation to "ask-user"
   - NEVER return empty string ("") or string "null" for extracted values - if you can't extract, set missingParams instead
6. If data isn't available, what alternatives exist? (Other tools, ask user)

CRITICAL EXTRACTION RULES:
- **FIRST CHECK**: Is the array empty?
  * If array is empty [] or has 0 items:
    → DO NOT try to extract anything
    → Set missingParams: [required parameter names]
    → Set recommendation: "ask-user"
    → DO NOT set extractedValues or parameters
    → DO NOT extract "null" string - this is an error
- If previous step returned an array WITH items and current step needs an ID:
  1. **Find the matching item** in the array using these strategies (in order):
     a. **Exact match**: Check if any item's name field exactly matches what the user is looking for (case-insensitive)
     b. **Partial match**: Check if any item's name field contains the key words from user query/step description
       - Example: User wants "Central Waste Processing Hub" → match item with name containing "Central Waste" or "Waste Processing Hub"
     c. **Fuzzy match**: Try matching even if word order differs or extra words present
     d. **Context-based match**: Use step description to understand what to match (e.g., "Get facility ID for 'Central Waste Processing Hub'")
     e. **If array has only 1 item**: Use that item (user likely wants the only available option)
  2. **Extract the '_id' field** from the MATCHED item (marked with ⭐ in the results above)
     - The '_id' field is a MongoDB ObjectId: exactly 24 hexadecimal characters (0-9, a-f)
     - Use the EXACT '_id' value (all 24 characters) in the parameters - DO NOT shorten, modify, or use placeholder values
     - If you see '_id: "6905db9211cc522275d5f013"', use the ENTIRE string "6905db9211cc522275d5f013", not "123" or any part of it
  3. **If no matching item found** (array has items but none match after trying all strategies):
     - Set missingParams: [required parameter name]
     - Set recommendation: "ask-user"
     - Include in reasoning: "Could not find matching item in array. Available items: [list item names]"
- Example: If list_facilities returned:
  Item 1:
    ⭐ _id: "6905db9211cc522275d5f013" (MongoDB ObjectId - use this for 'id' parameter)
    name: "Hannover"
  
  And get_facility(id: string) needs 'id':
  → Extract 'id' = "6905db9211cc522275d5f013" (the FULL 24-character _id value)
  → DO NOT use "123", "HAN", or any shortened/modified version
  → DO NOT add 'facilityName' or other fields that aren't in tool schema
  → Only add parameters that the tool schema actually requires

Remember: 
- Use EXACT parameter names from tool schemas (shown in system context)
- Extract actual values from previous results, don't invent field names
- If tool requires ID but you have name, find the matching item in array results and extract its ID field
- Think semantically about what's needed, not just pattern matching`

    try {
      await this.agent.initialize()
      
      // Build system prompt with dynamic MCP context
      const systemPrompt = this.buildSystemPrompt(state.mcpContext)
      
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: prompt },
      ]

      const response = await this.agent.callLLMPublic(messages, {
        temperature: 0.2,
        maxTokens: 1500,
        responseFormat: { type: 'json_object' },
      })

      // Parse JSON response
      const cleanResponse = response.trim()
      let jsonStart = cleanResponse.indexOf('{')
      if (jsonStart === -1) {
        throw new Error('No JSON object found in coordination response')
      }

      let braceCount = 0
      let jsonEnd = -1
      for (let i = jsonStart; i < cleanResponse.length; i++) {
        if (cleanResponse[i] === '{') braceCount++
        if (cleanResponse[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            jsonEnd = i + 1
            break
          }
        }
      }

      if (jsonEnd === -1) {
        throw new Error('Incomplete JSON object in coordination response')
      }

      const jsonStr = cleanResponse.substring(jsonStart, jsonEnd)
      const coordination = JSON.parse(jsonStr)

      logger.debug(`[Coordinator] Coordination analysis`, {
        stepId: step.id,
        needsCoordination: coordination.needsCoordination,
        recommendation: coordination.recommendation,
      })

      return {
        needsCoordination: coordination.needsCoordination || false,
        reasoning: coordination.reasoning,
        parameters: coordination.parameters,
        extractedValues: coordination.extractedValues,
        missingParams: coordination.missingParams,
        alternatives: coordination.alternatives,
        recommendation: coordination.recommendation || 'proceed',
      }
    } catch (error: any) {
      logger.error(`[Coordinator] Failed to analyze coordination`, {
        stepId: step.id,
        error: error.message,
      })

      // Fallback: return safe default
      return {
        needsCoordination: false,
        recommendation: 'proceed',
      }
    }
  }

  /**
   * Extract and coordinate parameters - LLM-driven with schema validation
   */
  async coordinateParameters(
    context: StepExecutionContext,
    coordinationResult: CoordinationResult
  ): Promise<{ 
    parameters: Record<string, any>; 
    wasUpdated: boolean; 
    originalParameters: Record<string, any>; 
    extractionImpossible?: boolean; 
    reason?: string;
    remainingPlaceholders?: string[];
    extractionAttempts?: Array<{ param: string; success: boolean; reason?: string }>;
  }> {
    const { step, state, previousResults } = context
    const originalParameters = { ...(step.parameters || {}) }
    const parameters = { ...originalParameters }

    if (!coordinationResult.needsCoordination) {
      return { parameters, wasUpdated: false, originalParameters }
    }

    // Task 1.1: Check for empty arrays and error arrays in previous results before attempting extraction
    // If a parameter needs extraction from previous step but that step returned empty array or error array,
    // we cannot extract and should ask user instead
    for (const [stepId, previousResult] of Object.entries(previousResults)) {
      // Check if this is an empty array
      if (Array.isArray(previousResult) && previousResult.length === 0) {
        // Check if any parameter references this step or needs extraction
        const needsExtractionFromThisStep = Object.entries(parameters).some(([key, value]) => {
          // Check if parameter is a placeholder referencing this step
          if (typeof value === 'string') {
            const stepRefPattern = new RegExp(`(extracted|from|step)[_-]?${stepId}`, 'i')
            if (stepRefPattern.test(value) || value.toLowerCase().includes('extracted_from')) {
              return true
            }
          }
          // Check if parameter is null/empty and could be extracted
          if (value === null || value === undefined || value === '') {
            return true
          }
          return false
        })

        if (needsExtractionFromThisStep) {
          logger.warn(`[Coordinator] Cannot extract parameters: previous step ${stepId} returned empty array`, {
            stepId: step.id,
            previousStepId: stepId,
            parameters: Object.keys(parameters),
          })

          return {
            parameters,
            wasUpdated: false,
            originalParameters,
            extractionImpossible: true,
            reason: `Cannot extract parameters from step ${stepId}: previous step returned empty array. No data available to extract.`,
          }
        }
      }
      
      // Bug 3: Check if this is an error array (contains error strings)
      if (Array.isArray(previousResult) && previousResult.length > 0) {
        const hasErrorStrings = previousResult.some(item => 
          typeof item === 'string' && item.includes('Error executing tool')
        )
        
        if (hasErrorStrings) {
          // Check if any parameter references this step or needs extraction
          const needsExtractionFromThisStep = Object.entries(parameters).some(([key, value]) => {
            // Check if parameter is a placeholder referencing this step
            if (typeof value === 'string') {
              const stepRefPattern = new RegExp(`(extracted|from|step)[_-]?${stepId}`, 'i')
              if (stepRefPattern.test(value) || value.toLowerCase().includes('extracted_from')) {
                return true
              }
            }
            // Check if parameter is null/empty and could be extracted
            if (value === null || value === undefined || value === '') {
              return true
            }
            return false
          })
          
          if (needsExtractionFromThisStep) {
            logger.warn(`[Coordinator] Cannot extract parameters: previous step ${stepId} returned error`, {
              stepId: step.id,
              previousStepId: stepId,
              parameters: Object.keys(parameters),
              errorMessage: previousResult[0],
            })

            return {
              parameters,
              wasUpdated: false,
              originalParameters,
              extractionImpossible: true,
              reason: `Cannot extract parameters from step ${stepId}: previous step returned error: ${previousResult[0]}`,
            }
          }
        }
      }
    }

    // Get tool or prompt schema to validate parameters
    const tool = findToolByName(state.mcpContext, step.action)
    const prompt = state.mcpContext?.prompts?.find(p => p.name === step.action)
    
    // Get parameters from either tool or prompt
    const toolParams = tool ? getToolParameters(tool) : null
    const promptParams = prompt ? {
      required: prompt.arguments?.filter((a: any) => a.required).map((a: any) => a.name) || [],
      optional: prompt.arguments?.filter((a: any) => !a.required).map((a: any) => a.name) || [],
      all: prompt.arguments?.map((a: any) => ({ name: a.name, schema: {}, required: a.required })) || []
    } : null
    
    // Use prompt params if tool params not available
    const params = toolParams || promptParams
    
    // Create set of valid parameter names from tool or prompt schema
    const validParamNames = new Set<string>()
    if (params) {
      params.all.forEach((param: any) => {
        const paramName = typeof param === 'string' ? param : param.name
        validParamNames.add(paramName)
      })
    }

    // Task 1.2: Track placeholder values before extraction
    const placeholderParams = new Set<string>()
    for (const [key, value] of Object.entries(originalParameters)) {
      if (typeof value === 'string') {
        // Detect placeholder patterns
        if (value.toLowerCase().includes('extracted') ||
            value.toLowerCase().includes('extract') ||
            value.toLowerCase().includes('from_step') ||
            value.toLowerCase().includes('from step') ||
            value.toLowerCase().includes('placeholder') ||
            value.match(/extract.*step/i)) {
          placeholderParams.add(key)
        }
      } else if (value === null || value === undefined || value === '') {
        // Null/empty parameters might need extraction
        placeholderParams.add(key)
      }
    }

    // Use extracted values from coordination result (validate against schema and MongoDB ObjectId format)
    let wasUpdated = false
    const extractionAttempts: Array<{ param: string; success: boolean; reason?: string }> = []
    
    if (coordinationResult.extractedValues) {
      for (const [key, value] of Object.entries(coordinationResult.extractedValues)) {
        const hadPlaceholder = placeholderParams.has(key)
        let extractionSuccess = false
        let skipReason = ''

        // Skip empty strings, null, undefined, and string "null" - these indicate extraction failure
        if (value === '' || value === null || value === undefined || value === 'null') {
          skipReason = 'empty/null value'
          logger.warn(`[Coordinator] Skipping empty/null extracted value`, {
            stepId: step.id,
            parameter: key,
            tool: step.action,
            value: String(value),
          })
          extractionAttempts.push({ param: key, success: false, reason: skipReason })
          continue
        }
        
        // Reject if value is the string "null" (4 chars)
        if (typeof value === 'string' && value.toLowerCase() === 'null' && value.length === 4) {
          skipReason = 'string "null" value'
          logger.warn(`[Coordinator] Rejecting string "null" extraction - this indicates extraction failure`, {
            stepId: step.id,
            parameter: key,
            tool: step.action,
          })
          extractionAttempts.push({ param: key, success: false, reason: skipReason })
          continue
        }
        
        // Only add parameters that exist in tool/prompt schema
        if (params && !validParamNames.has(key)) {
          skipReason = 'parameter not in tool/prompt schema'
          logger.warn(`[Coordinator] Skipping invalid parameter not in tool/prompt schema`, {
            stepId: step.id,
            parameter: key,
            action: step.action,
            isPrompt: !!prompt,
            validParams: Array.from(validParamNames),
          })
          extractionAttempts.push({ param: key, success: false, reason: skipReason })
          continue
        }
        
        // Validate MongoDB ObjectId format if parameter is an ID field
        if (key.toLowerCase().includes('id') && typeof value === 'string') {
          if (!isValidMongoDBObjectId(value)) {
            if (value.length < 20) {
              skipReason = `ID too short (${value.length} chars, expected 24)`
              logger.warn(`[Coordinator] Extracted ID is too short (likely invalid): "${value}" (${value.length} chars)`, {
                stepId: step.id,
                parameter: key,
                value: value,
                length: value.length,
              })
              extractionAttempts.push({ param: key, success: false, reason: skipReason })
              // Skip invalid IDs - don't update parameter with wrong value
              continue
            } else {
              logger.warn(`[Coordinator] Extracted ID may have invalid format: "${value}"`, {
                stepId: step.id,
                parameter: key,
                value: value,
              })
              // Continue anyway for IDs > 20 chars (might be valid but not standard format)
            }
          } else {
            logger.debug(`[Coordinator] Validated MongoDB ObjectId`, {
              stepId: step.id,
              parameter: key,
              value: value,
            })
          }
        }
        
        // Task 1.2: Replace placeholder values - ensure actual replacement happens
        const oldValue = parameters[key]
        if (oldValue !== value && value !== null && value !== undefined && value !== '') {
          parameters[key] = value
          wasUpdated = true
          extractionSuccess = true
          
          // Remove from placeholder set since it was successfully replaced
          placeholderParams.delete(key)
          
          logger.info(`[Coordinator] Extracted parameter`, {
            stepId: step.id,
            parameter: key,
            oldValue: oldValue,
            newValue: value,
            hadPlaceholder,
            isValidObjectId: (key.toLowerCase().includes('id') && isValidMongoDBObjectId(value)) || undefined,
          })
        }
        
        extractionAttempts.push({ param: key, success: extractionSuccess, reason: extractionSuccess ? 'success' : 'value unchanged' })
      }
    }
    
    // Task 1.2: Detect if placeholder values still remain after extraction attempt
    let remainingPlaceholders: string[] = []
    for (const [key, value] of Object.entries(parameters)) {
      if (placeholderParams.has(key) && typeof value === 'string') {
        // Check if value is still a placeholder
        if (value.toLowerCase().includes('extracted') ||
            value.toLowerCase().includes('extract') ||
            value.toLowerCase().includes('from_step') ||
            value.toLowerCase().includes('from step') ||
            value.toLowerCase().includes('placeholder') ||
            value.match(/extract.*step/i)) {
          remainingPlaceholders.push(key)
        }
      }
    }
    
    if (remainingPlaceholders.length > 0) {
      logger.warn(`[Coordinator] Placeholder values remain after extraction attempt`, {
        stepId: step.id,
        remainingPlaceholders,
        extractionAttempts: extractionAttempts.filter(a => !a.success),
      })
      
      // Step 3: Programmatic fallback for ID extraction if LLM failed
      // This helps when LLM doesn't extract IDs properly from array results
      const successfullyExtracted: string[] = []
      for (const paramName of remainingPlaceholders) {
        logger.debug(`[Coordinator] Programmatic fallback check`, {
          stepId: step.id,
          remainingPlaceholders,
          paramName: paramName,
          previousResultsKeys: Object.keys(previousResults),
          isPrompt: !!prompt,
        })
        
        if (paramName.toLowerCase().includes('id')) {
          // Try to find ID in previous results
          // Check if placeholder references a specific step (e.g., EXTRACT_FROM_STEP_2, EXTRACT_FROM_STEP-2)
          const placeholderValue = originalParameters[paramName]?.toString() || ''
          const stepRefMatch = placeholderValue.match(/step[_-]?(\d+)/i)
          const targetStepRef = stepRefMatch ? `step-${stepRefMatch[1]}` : null
          
          logger.debug(`[Coordinator] Programmatic ID extraction attempt`, {
            stepId: step.id,
            paramName,
            placeholderValue,
            targetStepRef,
            availableSteps: Object.keys(previousResults),
          })
          
          for (const [stepId, result] of Object.entries(previousResults)) {
            // If placeholder references specific step, only check that step
            if (targetStepRef && stepId !== targetStepRef) {
              continue
            }
            
            if (Array.isArray(result) && result.length > 0) {
              const firstItem = result[0]
              if (firstItem._id && typeof firstItem._id === 'string') {
                // Found valid ID - use it
                const oldValue = parameters[paramName]
                parameters[paramName] = firstItem._id
                wasUpdated = true
                successfullyExtracted.push(paramName)
                extractionAttempts.push({ 
                  param: paramName, 
                  success: true, 
                  reason: `programmatic extraction from step ${stepId}` 
                })
                
                logger.info(`[Coordinator] Programmatic ID extraction succeeded`, {
                  stepId: step.id,
                  parameter: paramName,
                  oldValue: oldValue,
                  newValue: firstItem._id,
                  sourceStep: stepId,
                  wasTargeted: !!targetStepRef,
                })
                break
              }
            }
          }
        }
      }
      // Remove successfully extracted params from remaining
      remainingPlaceholders = remainingPlaceholders.filter(p => !successfullyExtracted.includes(p))
    }

    // If coordinator provided updated parameters directly (validate against schema)
    if (coordinationResult.parameters) {
      for (const [key, value] of Object.entries(coordinationResult.parameters)) {
        // Only add parameters that exist in tool/prompt schema
        if (params && !validParamNames.has(key)) {
          logger.warn(`[Coordinator] Skipping invalid parameter not in tool/prompt schema`, {
            stepId: step.id,
            parameter: key,
            action: step.action,
            isPrompt: !!prompt,
            validParams: Array.from(validParamNames),
          })
          continue
        }
        
        if (parameters[key] !== value) {
          parameters[key] = value
          wasUpdated = true
          logger.info(`[Coordinator] Updated parameter from coordination result`, {
            stepId: step.id,
            parameter: key,
            oldValue: originalParameters[key],
            newValue: value,
          })
        }
      }
    }

    // MCP Validation: Validate coordinated parameters using MCP server
    if (state.mcpContext && tool) {
      try {
        // Extract context for MCP validation
        const execContext: Record<string, any> = {}
        if (state.requestContext.userQuery) {
          const shortCodeMatch = state.requestContext.userQuery.match(/\b([A-Z]{2,4})\b/g)
          if (shortCodeMatch) {
            execContext.shortCode = shortCodeMatch[0]
            execContext.facilityCode = shortCodeMatch[0]
          }
        }
        
        // Extract from previous step results
        for (const [stepId, result] of Object.entries(previousResults)) {
          if (Array.isArray(result) && result.length > 0) {
            const firstItem = result[0]
            if (firstItem._id && !execContext.facilityId) {
              execContext.facilityId = firstItem._id
            }
          } else if (result && typeof result === 'object' && result._id) {
            if (!execContext.facilityId) {
              execContext.facilityId = result._id
            }
          }
        }

        const validation = await validateToolParameters(
          step.action,
          parameters,
          execContext
        )

        if (validation.missingParams.length > 0) {
          logger.debug(`[Coordinator] MCP validation detected missing parameters`, {
            stepId: step.id,
            missingParams: validation.missingParams,
            categorization: validation.categorization,
          })
          
          // Note: We don't resolve parameters here - that's done in step-executor
          // But we can log the categorization for debugging
        } else if (validation.validation.isValid) {
          logger.debug(`[Coordinator] MCP validation passed`, {
            stepId: step.id,
            providedParams: validation.providedParams,
          })
        }
      } catch (error: any) {
        // Don't fail coordination if validation fails - step-executor will handle it
        logger.debug(`[Coordinator] MCP validation failed (non-critical):`, error.message)
      }
    }

    return { 
      parameters, 
      wasUpdated, 
      originalParameters,
      remainingPlaceholders: remainingPlaceholders.length > 0 ? remainingPlaceholders : undefined,
      extractionAttempts: extractionAttempts.length > 0 ? extractionAttempts : undefined,
    }
  }
}

