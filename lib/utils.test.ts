import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should combine class names correctly', () => {
    const result = cn('btn', 'btn-primary')
    expect(result).toBe('btn btn-primary')
  })

  it('should handle conditional classes', () => {
    const result = cn('btn', false && 'hidden', 'active')
    expect(result).toBe('btn active')
  })

  it('should merge conflicting Tailwind classes', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle undefined and null values', () => {
    const result = cn('btn', undefined, null, 'active')
    expect(result).toBe('btn active')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['btn', 'btn-primary'], 'active')
    expect(result).toBe('btn btn-primary active')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

