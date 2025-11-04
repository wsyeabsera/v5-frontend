/**
 * Token Counting Utility
 * 
 * Provides token estimation for LLM requests to help prevent exceeding token limits.
 * Uses conservative estimation (4 characters per token) which works well for most models.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Estimate token count for a text string
 * 
 * Uses a conservative estimation: ~4 characters per token
 * This is a safe approximation for most models (GPT, Claude, Groq, etc.)
 * 
 * @param text - Text to count tokens for
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) {
    return 0
  }

  // Conservative estimation: 4 characters per token
  // This accounts for:
  // - Word boundaries and punctuation
  // - Encoding overhead
  // - Special tokens (system/user/assistant markers)
  // - Model-specific tokenization overhead
  
  // More accurate estimation:
  // - Split by whitespace and count words
  // - Add ~1.3 tokens per word (accounts for punctuation, encoding)
  // - Add overhead for special characters
  
  const words = text.trim().split(/\s+/).filter(Boolean)
  
  // More accurate estimation: average word length affects token count
  // Longer words = fewer tokens per word, shorter words = more tokens per word
  const avgWordLength = words.length > 0 
    ? text.trim().length / words.length 
    : 4
  
  // Base tokens per word varies by average word length
  // Very short words (like "a", "the") = ~1 token each
  // Long words = ~1 token per 4-5 characters
  let tokensPerWord = 1.3
  if (avgWordLength < 3) {
    tokensPerWord = 1.1 // Very short words
  } else if (avgWordLength > 6) {
    tokensPerWord = 1.5 // Longer words
  }
  
  const wordTokenEstimate = words.length * tokensPerWord
  
  // Add overhead for special characters, punctuation, etc.
  const specialCharCount = (text.match(/[^\w\s]/g) || []).length
  const specialCharOverhead = specialCharCount * 0.5
  
  // Add base overhead for message formatting
  const baseOverhead = 10
  
  // For Groq/OpenAI models, be more conservative - add 20% buffer
  // This accounts for actual tokenization differences
  // However, we've found Groq's actual tokenization can be 1.5-2x our estimate
  // So we use a more conservative multiplier
  const conservativeEstimate = Math.ceil((wordTokenEstimate + specialCharOverhead + baseOverhead) * 1.75)
  
  return conservativeEstimate
}

/**
 * Count tokens in an array of messages
 * 
 * Counts tokens for all messages plus overhead for message formatting.
 * 
 * @param messages - Array of messages to count tokens for
 * @returns Total estimated token count
 */
export function countTokensInMessages(messages: Message[]): number {
  if (!messages || messages.length === 0) {
    return 0
  }

  // Count tokens for each message content
  let totalTokens = 0
  for (const message of messages) {
    totalTokens += estimateTokenCount(message.content)
  }

  // Add overhead for message formatting (role markers, JSON structure, etc.)
  // Each message adds ~5 tokens for formatting
  const formattingOverhead = messages.length * 5

  return totalTokens + formattingOverhead
}

/**
 * Get token count breakdown for debugging
 * 
 * @param messages - Array of messages to analyze
 * @returns Breakdown of token counts per message
 */
export function getTokenBreakdown(messages: Message[]): {
  total: number
  perMessage: Array<{ role: string; tokens: number; content: string }>
} {
  const perMessage = messages.map(msg => ({
    role: msg.role,
    tokens: estimateTokenCount(msg.content),
    content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
  }))

  const total = countTokensInMessages(messages)

  return {
    total,
    perMessage
  }
}

