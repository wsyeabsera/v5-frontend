/**
 * Token Counter Tests
 * 
 * Basic tests for token counting functionality
 */

import { describe, it, expect } from 'vitest'
import { estimateTokenCount, countTokensInMessages, Message } from './token-counter'

describe('Token Counter', () => {
  describe('estimateTokenCount', () => {
    it('should return 0 for empty string', () => {
      expect(estimateTokenCount('')).toBe(0)
    })

    it('should return 0 for null/undefined', () => {
      expect(estimateTokenCount('')).toBe(0)
    })

    it('should estimate tokens for short text', () => {
      const text = 'Hello world'
      const tokens = estimateTokenCount(text)
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10)
    })

    it('should estimate tokens for longer text', () => {
      const text = 'This is a longer piece of text that should result in more tokens being counted. '.repeat(10)
      const tokens = estimateTokenCount(text)
      expect(tokens).toBeGreaterThan(20)
    })

    it('should handle special characters', () => {
      const text = 'Hello, world! How are you? I\'m fine. "Great!"'
      const tokens = estimateTokenCount(text)
      expect(tokens).toBeGreaterThan(0)
    })
  })

  describe('countTokensInMessages', () => {
    it('should return 0 for empty array', () => {
      expect(countTokensInMessages([])).toBe(0)
    })

    it('should count tokens for single message', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello, world!' }
      ]
      const tokens = countTokensInMessages(messages)
      expect(tokens).toBeGreaterThan(0)
    })

    it('should count tokens for multiple messages', () => {
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is the weather today?' }
      ]
      const tokens = countTokensInMessages(messages)
      expect(tokens).toBeGreaterThan(countTokensInMessages([messages[0]]))
    })

    it('should add formatting overhead', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test' }
      ]
      const tokens = countTokensInMessages(messages)
      // Should be more than just the content tokens due to formatting overhead
      expect(tokens).toBeGreaterThan(estimateTokenCount('Test'))
    })
  })
})

