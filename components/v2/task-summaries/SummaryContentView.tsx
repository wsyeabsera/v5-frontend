'use client'

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { JsonViewer } from '@/components/ui/json-viewer'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Code2, FileJson } from 'lucide-react'
import React from 'react'

interface SummaryContentViewProps {
  content: string
  className?: string
}

/**
 * Detects if content is JSON and extracts the summary text
 */
function detectAndExtractSummary(content: string): {
  isJson: boolean
  summaryText: string
  jsonData?: any
} {
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(content)
    
    // Check if it's a nested result structure (result.result.summary)
    if (parsed?.result?.result?.summary) {
      return {
        isJson: false, // The summary is markdown, not JSON
        summaryText: parsed.result.result.summary,
        jsonData: parsed,
      }
    }
    
    // Check if it's result.summary
    if (parsed?.result?.summary) {
      return {
        isJson: false, // The summary is markdown, not JSON
        summaryText: parsed.result.summary,
        jsonData: parsed,
      }
    }
    
    // Check if it's a direct summary property
    if (parsed?.summary && typeof parsed.summary === 'string') {
      return {
        isJson: false,
        summaryText: parsed.summary,
        jsonData: parsed,
      }
    }
    
    // If it's valid JSON but no summary found, treat as JSON to display
    return {
      isJson: true,
      summaryText: content,
      jsonData: parsed,
    }
  } catch {
    // Not JSON, treat as markdown
    return {
      isJson: false,
      summaryText: content,
    }
  }
}

/**
 * Properly unescapes JSON strings (handles multiple levels of escaping)
 * Must handle escaped backslashes first before other escapes
 */
function unescapeJsonString(str: string, levels: number = 1): string {
  let result = str
  // Apply unescaping multiple times if needed for deeply escaped content
  for (let i = 0; i < levels; i++) {
    // Order matters: must handle escaped backslashes first
    result = result
      .replace(/\\\\/g, '\u0000')  // Temporarily replace \\ with placeholder
      .replace(/\\n/g, '\n')       // Replace \n with newline
      .replace(/\\"/g, '"')        // Replace \" with "
      .replace(/\\t/g, '\t')       // Replace \t with tab
      .replace(/\\r/g, '\r')       // Replace \r with carriage return
      .replace(/\u0000/g, '\\')    // Restore single backslashes
  }
  return result
}

/**
 * Tries to find and extract JSON-like content from a string
 * Handles cases where JSON might be deeply nested or escaped
 */
function findJsonInString(str: string): { found: boolean; json?: any; remaining?: string } {
  const trimmed = str.trim()
  
  // Try direct parse first
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      return { found: true, json: parsed }
    } catch {
      // Continue to try unescaping
    }
  }
  
  // Try with single level unescaping
  try {
    const unescaped = unescapeJsonString(trimmed, 1)
    if (unescaped.startsWith('{') || unescaped.startsWith('[')) {
      const parsed = JSON.parse(unescaped)
      return { found: true, json: parsed }
    }
  } catch {
    // Continue to try double unescaping
  }
  
  // Try with double level unescaping (for double-escaped content)
  try {
    const unescaped = unescapeJsonString(trimmed, 2)
    if (unescaped.startsWith('{') || unescaped.startsWith('[')) {
      const parsed = JSON.parse(unescaped)
      return { found: true, json: parsed }
    }
  } catch {
    // Not JSON
  }
  
  // Try to find JSON pattern within the string
  const jsonMatch = trimmed.match(/^[^\[\{]*?(\[[\s\S]*\]|\{[\s\S]*\})/)
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1])
      return { found: true, json: parsed, remaining: trimmed.slice(0, jsonMatch.index) }
    } catch {
      // Try unescaping the matched portion
      try {
        const unescaped = unescapeJsonString(jsonMatch[1], 1)
        const parsed = JSON.parse(unescaped)
        return { found: true, json: parsed, remaining: trimmed.slice(0, jsonMatch.index) }
      } catch {
        try {
          const unescaped = unescapeJsonString(jsonMatch[1], 2)
          const parsed = JSON.parse(unescaped)
          return { found: true, json: parsed, remaining: trimmed.slice(0, jsonMatch.index) }
        } catch {
          // Couldn't parse
        }
      }
    }
  }
  
  return { found: false }
}

/**
 * Recursively processes a parsed JSON object to find and parse nested JSON strings
 * More aggressive in detecting JSON strings, even if they don't start with { or [
 */
function processNestedJsonStrings(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 10) return obj
  
  if (typeof obj === 'string') {
    // Check if string looks like JSON (starts with { or [)
    const trimmed = obj.trim()
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && trimmed.length > 10) {
      const jsonResult = findJsonInString(obj)
      if (jsonResult.found && jsonResult.json) {
        // Recursively process the parsed JSON
        return processNestedJsonStrings(jsonResult.json, depth + 1)
      }
    }
    
    // Also check for JSON-like patterns that might be embedded
    // Look for patterns like: "text": "[\n  {...}]"
    if (trimmed.length > 20) {
      // Check if it contains JSON-like structures (balanced braces/brackets)
      const jsonMatch = trimmed.match(/(\[[\s\S]{20,}\]|\{[\s\S]{20,}\})/)
      if (jsonMatch) {
        const jsonResult = findJsonInString(jsonMatch[1])
        if (jsonResult.found && jsonResult.json) {
          // Replace the JSON portion with parsed version
          const before = trimmed.slice(0, jsonMatch.index)
          const after = trimmed.slice((jsonMatch.index || 0) + jsonMatch[1].length)
          return {
            _beforeText: before || undefined,
            _parsedJson: processNestedJsonStrings(jsonResult.json, depth + 1),
            _afterText: after || undefined,
          }
        }
      }
    }
    
    return obj
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => processNestedJsonStrings(item, depth + 1))
  }
  
  if (obj && typeof obj === 'object') {
    const processed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      processed[key] = processNestedJsonStrings(value, depth + 1)
    }
    return processed
  }
  
  return obj
}

/**
 * Detects and parses tool call patterns like: 9:{"toolCallId":...}a:{"result":...}
 * Returns combined structure with step number, tool call, and result
 */
function parseToolCallPattern(text: string): { success: boolean; data?: any; start?: number; end?: number } {
  // Pattern: number:{...}letter:{...}
  // More flexible pattern that handles the actual structure
  const pattern = /(\d+):\s*(\{[\s\S]*?"toolCallId"[\s\S]*?\})\s*[a-z]:\s*(\{[\s\S]*?"result"[\s\S]*?\})/g
  const match = pattern.exec(text)
  
  if (match && match.index !== undefined) {
    const stepNum = parseInt(match[1], 10)
    const toolCallStr = match[2]
    const resultStr = match[3]
    
    try {
      // Try to parse both JSON objects
      let toolCall, result
      
      // Parse tool call
      try {
        toolCall = JSON.parse(toolCallStr)
      } catch {
        try {
          toolCall = JSON.parse(unescapeJsonString(toolCallStr, 1))
        } catch {
          toolCall = JSON.parse(unescapeJsonString(toolCallStr, 2))
        }
      }
      
      // Parse result
      try {
        result = JSON.parse(resultStr)
      } catch {
        try {
          result = JSON.parse(unescapeJsonString(resultStr, 1))
        } catch {
          result = JSON.parse(unescapeJsonString(resultStr, 2))
        }
      }
      
      // Process nested JSON in result
      result = processNestedJsonStrings(result)
      
      // Combine into structured object
      const combined = {
        step: stepNum,
        toolCall: toolCall,
        result: result,
        toolName: toolCall.toolName || 'Unknown Tool',
      }
      
      return {
        success: true,
        data: combined,
        start: match.index,
        end: match.index + match[0].length,
      }
    } catch {
      // Parsing failed
    }
  }
  
  return { success: false }
}

/**
 * Attempts to extract and parse JSON from a string
 * Handles escaped JSON strings and nested JSON
 */
function tryParseJson(text: string): { success: boolean; data?: any; cleanedText?: string } {
  // First, try parsing directly
  try {
    const parsed = JSON.parse(text)
    // Process nested JSON strings recursively
    const processed = processNestedJsonStrings(parsed)
    return { success: true, data: processed }
  } catch {
    // If direct parse fails, try unescaping first
    try {
      const unescaped = unescapeJsonString(text, 1)
      const parsed = JSON.parse(unescaped)
      const processed = processNestedJsonStrings(parsed)
      return { success: true, data: processed }
    } catch {
      // Try double unescaping
      try {
        const unescaped = unescapeJsonString(text, 2)
        const parsed = JSON.parse(unescaped)
        const processed = processNestedJsonStrings(parsed)
        return { success: true, data: processed }
      } catch {
        // If still fails, try to find JSON-like structures in the text
        // Look for JSON objects or arrays (balanced braces/brackets)
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1])
            const processed = processNestedJsonStrings(parsed)
            return { success: true, data: processed, cleanedText: text }
          } catch {
            // Try unescaping the matched JSON
            try {
              const unescaped = unescapeJsonString(jsonMatch[1], 1)
              const parsed = JSON.parse(unescaped)
              const processed = processNestedJsonStrings(parsed)
              return { success: true, data: processed, cleanedText: text }
            } catch {
              try {
                const unescaped = unescapeJsonString(jsonMatch[1], 2)
                const parsed = JSON.parse(unescaped)
                const processed = processNestedJsonStrings(parsed)
                return { success: true, data: processed, cleanedText: text }
              } catch {
                // All parsing attempts failed
              }
            }
          }
        }
      }
    }
  }
  
  return { success: false }
}

/**
 * Custom code component for ReactMarkdown that detects and formats JSON
 */
function CodeBlock({ children, className, ...props }: any) {
  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : ''
  const code = String(children).replace(/\n$/, '')
  
  // Check if it's JSON or looks like JSON
  const isJsonLanguage = language === 'json'
  const looksLikeJson = !language && (code.trim().startsWith('{') || code.trim().startsWith('['))
  
  if (isJsonLanguage || looksLikeJson) {
    // Try to parse as JSON (handles escaped JSON)
    const parseResult = tryParseJson(code)
    
    if (parseResult.success && parseResult.data) {
      return (
        <Card className="my-4 border-2 overflow-hidden">
          <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
            <FileJson className="w-4 h-4 text-primary" />
            <Badge variant="outline" className="text-xs">JSON</Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              {Array.isArray(parseResult.data) ? `${parseResult.data.length} items` : 'Object'}
            </span>
          </div>
          <div className="p-4 max-h-[600px] overflow-auto">
            <JsonViewer
              data={parseResult.data}
              collapsible={true}
              defaultExpanded={false}
              searchable={true}
              showCopyButton={true}
              maxHeight="600px"
            />
          </div>
        </Card>
      )
    }
  }
  
  // For non-JSON code blocks, render with enhanced styling
  return (
    <Card className="my-4 border-2 overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
        <Code2 className="w-4 h-4 text-primary" />
        {language && <Badge variant="outline" className="text-xs">{language}</Badge>}
      </div>
      <pre className="p-4 overflow-x-auto bg-muted/30 text-sm font-mono">
        <code className={className} {...props}>
          {code}
        </code>
      </pre>
    </Card>
  )
}

/**
 * Recursively extracts text content from React children
 */
function extractTextFromChildren(children: any): string {
  if (typeof children === 'string') {
    return children
  }
  if (Array.isArray(children)) {
    return children.map(child => extractTextFromChildren(child)).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren(children.props?.children || '')
  }
  return ''
}

/**
 * Finds balanced JSON-like structures in text
 * Returns array of {start, end, content} for each match
 * Enhanced to handle escaped content better
 */
function findJsonStructures(text: string): Array<{ start: number; end: number; content: string }> {
  const results: Array<{ start: number; end: number; content: string }> = []
  let i = 0
  
  while (i < text.length) {
    // Look for opening brace or bracket
    if (text[i] === '{' || text[i] === '[') {
      const openChar = text[i]
      const closeChar = openChar === '{' ? '}' : ']'
      let depth = 1
      let j = i + 1
      let inString = false
      let escapeNext = false
      
      while (j < text.length && depth > 0) {
        if (escapeNext) {
          escapeNext = false
          j++
          continue
        }
        
        if (text[j] === '\\') {
          escapeNext = true
          j++
          continue
        }
        
        if (text[j] === '"' && !escapeNext) {
          inString = !inString
          j++
          continue
        }
        
        if (!inString) {
          if (text[j] === openChar) {
            depth++
          } else if (text[j] === closeChar) {
            depth--
          }
        }
        
        j++
      }
      
      if (depth === 0) {
        // Found balanced structure
        const content = text.slice(i, j)
        // Only include if it's substantial (at least 20 chars) and looks like JSON
        // Check for JSON-like content (quotes, colons, etc.)
        if (content.length >= 20 && (content.includes('"') || content.includes("'"))) {
          // Additional check: should have at least one colon (key-value pair) or comma (array element)
          if (content.includes(':') || content.includes(',')) {
            results.push({
              start: i,
              end: j,
              content: content,
            })
          }
        }
        i = j
      } else {
        i++
      }
    } else {
      i++
    }
  }
  
  return results
}

/**
 * Finds tool call patterns in text
 * Returns array of {start, end, content} for each match
 */
function findToolCallPatterns(text: string): Array<{ start: number; end: number; content: string; parsed?: any }> {
  const results: Array<{ start: number; end: number; content: string; parsed?: any }> = []
  
  // Use the same pattern as parseToolCallPattern but with global flag
  const pattern = /(\d+):\s*(\{[\s\S]*?"toolCallId"[\s\S]*?\})\s*[a-z]:\s*(\{[\s\S]*?"result"[\s\S]*?\})/g
  let match
  
  while ((match = pattern.exec(text)) !== null) {
    if (match.index !== undefined && match[0]) {
      // Parse the matched pattern directly
      const stepNum = parseInt(match[1], 10)
      const toolCallStr = match[2]
      const resultStr = match[3]
      
      try {
        // Try to parse both JSON objects
        let toolCall, result
        
        // Parse tool call
        try {
          toolCall = JSON.parse(toolCallStr)
        } catch {
          try {
            toolCall = JSON.parse(unescapeJsonString(toolCallStr, 1))
          } catch {
            toolCall = JSON.parse(unescapeJsonString(toolCallStr, 2))
          }
        }
        
        // Parse result
        try {
          result = JSON.parse(resultStr)
        } catch {
          try {
            result = JSON.parse(unescapeJsonString(resultStr, 1))
          } catch {
            result = JSON.parse(unescapeJsonString(resultStr, 2))
          }
        }
        
        // Process nested JSON in result
        result = processNestedJsonStrings(result)
        
        // Combine into structured object
        const combined = {
          step: stepNum,
          toolCall: toolCall,
          result: result,
          toolName: toolCall.toolName || 'Unknown Tool',
        }
        
        results.push({
          start: match.index,
          end: match.index + match[0].length,
          content: match[0],
          parsed: combined,
        })
      } catch {
        // Parsing failed, skip this match
      }
    }
  }
  
  return results
}

/**
 * Custom paragraph component that detects embedded JSON
 * Enhanced to handle tool call patterns and display them nicely
 */
function Paragraph({ children, ...props }: any) {
  // Extract text content from React children
  const textContent = extractTextFromChildren(children)
  
  // Find tool call patterns first (they take priority)
  const toolCallPatterns = findToolCallPatterns(textContent)
  
  // Find JSON structures using balanced matching
  const jsonStructures = findJsonStructures(textContent)
  
  // Combine all matches, prioritizing tool call patterns
  const allMatches: Array<{ 
    start: number
    end: number
    content: string
    isToolCall?: boolean
    parsed?: any
  }> = [
    ...toolCallPatterns.map(tc => ({ 
      start: tc.start, 
      end: tc.end, 
      content: tc.content,
      isToolCall: true,
      parsed: tc.parsed,
    })),
    ...jsonStructures.map(s => ({ 
      start: s.start, 
      end: s.end, 
      content: s.content,
      isToolCall: false,
    })),
  ]
  
  // Sort by start position and remove overlaps (tool calls take priority)
  allMatches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start
    // If same start, prioritize tool calls
    if (a.isToolCall && !b.isToolCall) return -1
    if (!a.isToolCall && b.isToolCall) return 1
    return 0
  })
  
  const filteredMatches: Array<{ 
    start: number
    end: number
    content: string
    isToolCall?: boolean
    parsed?: any
  }> = []
  let lastEnd = 0
  for (const match of allMatches) {
    if (match.start >= lastEnd) {
      filteredMatches.push(match)
      lastEnd = match.end
    }
  }
  
  // If no JSON found, render as normal paragraph
  if (filteredMatches.length === 0) {
    return <p {...props}>{children}</p>
  }
  
  // Split text and render JSON blocks
  const parts: (string | React.ReactNode)[] = []
  let lastIndex = 0
  
  for (const match of filteredMatches) {
    // Add text before JSON
    if (match.start > lastIndex) {
      const textBefore = textContent.slice(lastIndex, match.start)
      if (textBefore.trim()) {
        parts.push(textBefore)
      }
    }
    
    // Render tool call pattern with special formatting
    if (match.isToolCall && match.parsed) {
      parts.push(
        <Card key={`toolcall-${match.start}`} className="my-4 border-2 overflow-hidden border-primary/20">
          <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
            <Code2 className="w-4 h-4 text-primary" />
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              Step {match.parsed.step}: {match.parsed.toolName}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Tool Call & Result
            </span>
          </div>
          <div className="p-4 max-h-[500px] overflow-auto">
            <JsonViewer
              data={match.parsed}
              collapsible={true}
              defaultExpanded={false}
              searchable={false}
              showCopyButton={true}
              maxHeight="500px"
            />
          </div>
        </Card>
      )
    } else {
      // Try to parse and render JSON
      const parseResult = tryParseJson(match.content)
      
      if (parseResult.success && parseResult.data) {
        parts.push(
          <Card key={`json-${match.start}`} className="my-4 border-2 overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
              <FileJson className="w-4 h-4 text-primary" />
              <Badge variant="outline" className="text-xs">JSON</Badge>
            </div>
            <div className="p-4 max-h-[400px] overflow-auto">
              <JsonViewer
                data={parseResult.data}
                collapsible={true}
                defaultExpanded={false}
                searchable={false}
                showCopyButton={true}
                maxHeight="400px"
              />
            </div>
          </Card>
        )
      } else {
        // Couldn't parse, keep as text
        parts.push(match.content)
      }
    }
    
    lastIndex = match.end
  }
  
  // Add remaining text
  if (lastIndex < textContent.length) {
    const remainingText = textContent.slice(lastIndex)
    if (remainingText.trim()) {
      parts.push(remainingText)
    }
  }
  
  // Render with mixed content
  return (
    <div className="my-4 space-y-2">
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return (
            <p key={`text-${index}`} className="mb-2" {...props}>
              {part}
            </p>
          )
        }
        return part
      })}
    </div>
  )
}

/**
 * Custom inline code component
 */
function InlineCode({ children, ...props }: any) {
  const code = String(children)
  
  // Check if it's a short JSON string that could be formatted
  if ((code.startsWith('{') || code.startsWith('[')) && code.length < 200) {
    const parseResult = tryParseJson(code)
    if (parseResult.success && parseResult.data) {
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {JSON.stringify(parseResult.data, null, 2)}
        </code>
      )
    }
  }
  
  return (
    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
      {children}
    </code>
  )
}

export function SummaryContentView({ content, className = '' }: SummaryContentViewProps) {
  const { isJson, summaryText, jsonData } = useMemo(
    () => detectAndExtractSummary(content),
    [content]
  )

  if (isJson) {
    // Display JSON using JsonViewer
    return (
      <div className={`flex-1 overflow-y-auto p-6 bg-background ${className}`}>
        <div className="max-w-5xl mx-auto">
          <JsonViewer
            data={jsonData || JSON.parse(content)}
            collapsible={true}
            defaultExpanded={true}
            searchable={true}
            showCopyButton={true}
            maxHeight="100%"
          />
        </div>
      </div>
    )
  }

  // Display Markdown with custom components (no pre-processing)
  return (
    <div className={`flex-1 overflow-y-auto min-h-0 p-8 bg-background ${className}`}>
      <div className="max-w-4xl mx-auto prose prose-base dark:prose-invert 
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:scroll-mt-8
        prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-8 prose-h1:border-b prose-h1:border-border prose-h1:pb-3
        prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-6 prose-h2:text-primary
        prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
        prose-h4:text-lg prose-h4:mb-2 prose-h4:mt-4
        prose-p:leading-7 prose-p:mb-4 prose-p:text-foreground
        prose-strong:font-semibold prose-strong:text-foreground
        prose-em:italic prose-em:text-foreground
        prose-code:font-mono prose-code:text-sm prose-code:bg-muted prose-code:text-foreground
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-transparent prose-pre:border-0 prose-pre:p-0 prose-pre:my-0
        prose-pre code:bg-transparent prose-pre code:p-0 prose-pre code:before:content-[''] prose-pre code:after:content-['']
        prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-6 prose-blockquote:pr-4 prose-blockquote:py-2 prose-blockquote:my-4
        prose-blockquote:bg-muted/50 prose-blockquote:rounded-r-lg prose-blockquote:italic
        prose-a:text-primary prose-a:font-medium prose-a:underline-offset-4 hover:prose-a:underline prose-a:decoration-2
        prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-ul:space-y-2
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4 prose-ol:space-y-2
        prose-li:my-1 prose-li:leading-7
        prose-hr:border-border prose-hr:my-8
        prose-table:w-full prose-table:my-4 prose-table:border-collapse
        prose-th:bg-muted prose-th:border prose-th:border-border prose-th:p-3 prose-th:text-left prose-th:font-semibold
        prose-td:border prose-td:border-border prose-td:p-3
        prose-img:rounded-lg prose-img:shadow-md prose-img:my-4
        prose-figure:my-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, className, children, ...props }: any) {
              const inline = (props as any).inline
              if (inline) {
                return <InlineCode className={className} {...props}>{children}</InlineCode>
              }
              return <CodeBlock className={className} {...props}>{children}</CodeBlock>
            },
            p({ node, children, ...props }) {
              return <Paragraph {...props}>{children}</Paragraph>
            },
          }}
        >
          {summaryText}
        </ReactMarkdown>
      </div>
    </div>
  )
}
