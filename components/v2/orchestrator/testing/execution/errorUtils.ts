/**
 * Utility functions for extracting and formatting errors from execution data
 */

export interface ExtractedError {
  message: string
  stack?: string
  phase?: string
  errorType?: string
  code?: string
  raw?: any
}

/**
 * Extract error from phase content
 */
export function extractPhaseError(phaseContent: any, phaseId: string): ExtractedError | null {
  if (!phaseContent) return null

  // Check if content itself is an error
  if (typeof phaseContent === 'string' && phaseContent.toLowerCase().includes('error')) {
    return {
      message: phaseContent,
      phase: phaseId,
      raw: phaseContent,
    }
  }

  // Check for error object with message property
  if (typeof phaseContent === 'object' && phaseContent !== null) {
    // Direct error object
    if ('message' in phaseContent && typeof phaseContent.message === 'string') {
      return {
        message: phaseContent.message,
        stack: typeof phaseContent.stack === 'string' ? phaseContent.stack : undefined,
        phase: phaseId,
        errorType: typeof phaseContent.errorType === 'string' ? phaseContent.errorType : undefined,
        code: typeof phaseContent.code === 'string' ? phaseContent.code : undefined,
        raw: phaseContent,
      }
    }

    // Nested error property
    if ('error' in phaseContent) {
      const error = phaseContent.error
      if (typeof error === 'string') {
        return {
          message: error,
          phase: phaseId,
          raw: error,
        }
      }
      if (typeof error === 'object' && error !== null && 'message' in error) {
        return {
          message: typeof error.message === 'string' ? error.message : String(error.message),
          stack: typeof error.stack === 'string' ? error.stack : undefined,
          phase: phaseId,
          errorType: typeof error.errorType === 'string' ? error.errorType : undefined,
          code: typeof error.code === 'string' ? error.code : undefined,
          raw: error,
        }
      }
    }

    // Check for error array
    if (Array.isArray(phaseContent.errors) && phaseContent.errors.length > 0) {
      const firstError = phaseContent.errors[0]
      if (typeof firstError === 'string') {
        return {
          message: firstError,
          phase: phaseId,
          raw: firstError,
        }
      }
      if (typeof firstError === 'object' && firstError !== null && 'message' in firstError) {
        return {
          message: typeof firstError.message === 'string' ? firstError.message : String(firstError.message),
          stack: typeof firstError.stack === 'string' ? firstError.stack : undefined,
          phase: phaseId,
          errorType: typeof firstError.errorType === 'string' ? firstError.errorType : undefined,
          code: typeof firstError.code === 'string' ? firstError.code : undefined,
          raw: firstError,
        }
      }
    }

    // Check for executionCode/executionMessage pattern
    if ('executionCode' in phaseContent && 'executionMessage' in phaseContent) {
      const code = phaseContent.executionCode
      const message = phaseContent.executionMessage
      if (code && code !== 'ORCHESTRATION_SUCCESS' && message) {
        return {
          message: typeof message === 'string' ? message : String(message),
          code: typeof code === 'string' ? code : String(code),
          phase: phaseId,
          raw: phaseContent,
        }
      }
    }
  }

  return null
}

/**
 * Extract error from execution object
 */
export function extractExecutionError(execution: any): ExtractedError | null {
  if (!execution) return null

  const exec = execution?.data || execution

  // Check execution-level error
  if (exec.results?.error) {
    const error = exec.results.error
    if (typeof error === 'string') {
      return {
        message: error,
        raw: error,
      }
    }
    if (typeof error === 'object' && error !== null) {
      return {
        message: typeof error.message === 'string' ? error.message : String(error.message || 'Unknown error'),
        stack: typeof error.stack === 'string' ? error.stack : undefined,
        errorType: typeof error.errorType === 'string' ? error.errorType : undefined,
        code: typeof error.code === 'string' ? error.code : undefined,
        raw: error,
      }
    }
  }

    // Check executionCode and executionMessage
    if (exec.executionCode && exec.executionCode !== 'ORCHESTRATION_SUCCESS' && exec.executionMessage) {
      return {
        message: typeof exec.executionMessage === 'string' ? exec.executionMessage : String(exec.executionMessage),
        code: typeof exec.executionCode === 'string' ? exec.executionCode : String(exec.executionCode),
        raw: { executionCode: exec.executionCode, executionMessage: exec.executionMessage },
      }
    }
    
    // Check for phase-specific error codes
    if (exec.executionCode === 'EXECUTION_PHASE_ERROR' || exec.executionCode === 'SUMMARY_PHASE_ERROR') {
      return {
        message: typeof exec.executionMessage === 'string' ? exec.executionMessage : String(exec.executionMessage || 'Phase error occurred'),
        code: exec.executionCode,
        phase: exec.executionCode === 'EXECUTION_PHASE_ERROR' ? 'execution' : 'summary',
        raw: { executionCode: exec.executionCode, executionMessage: exec.executionMessage },
      }
    }

  // Check for failed status with no explicit error
  if (exec.status === 'failed' && !exec.results?.error && !exec.executionMessage) {
    return {
      message: 'Execution failed without detailed error information',
      code: exec.executionCode || 'UNKNOWN_ERROR',
      raw: exec,
    }
  }

  return null
}

/**
 * Extract phase-specific errors from execution results
 */
export function extractPhaseErrors(execution: any): Record<string, ExtractedError | null> {
  if (!execution) return {}

  const exec = execution?.data || execution
  const results = exec?.results || {}

  const phaseErrors: Record<string, ExtractedError | null> = {}

  // Check each phase for errors
  const phases = ['thought', 'plan', 'execution', 'summary']
  phases.forEach((phaseId) => {
    if (results[phaseId]) {
      phaseErrors[phaseId] = extractPhaseError(results[phaseId], phaseId)
    }
  })

  return phaseErrors
}

/**
 * Format error for display
 */
export function formatError(error: ExtractedError | null): string {
  if (!error) return ''

  let formatted = error.message || 'Unknown error'

  if (error.code && error.code !== 'UNKNOWN_ERROR') {
    formatted = `[${error.code}] ${formatted}`
  }

  if (error.phase) {
    formatted = `${formatted} (Phase: ${error.phase})`
  }

  return formatted
}

/**
 * Check if content contains an error
 */
export function hasError(content: any): boolean {
  if (!content) return false

  if (typeof content === 'string') {
    return content.toLowerCase().includes('error') || content.toLowerCase().includes('failed')
  }

  if (typeof content === 'object' && content !== null) {
    return (
      'error' in content ||
      'errors' in content ||
      ('message' in content && typeof content.message === 'string' && content.message.toLowerCase().includes('error')) ||
      ('executionCode' in content && content.executionCode && content.executionCode !== 'ORCHESTRATION_SUCCESS')
    )
  }

  return false
}

