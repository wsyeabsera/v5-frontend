import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWebSocket, useActivityFeed, useStats } from './websocket'

// Mock EventSource
class MockEventSource {
  url: string
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  readyState: number = 0
  
  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) this.onopen({})
    }, 0)
  }
  
  close() {
    this.readyState = 2
  }
  
  addEventListener(event: string, handler: (event: any) => void) {
    if (event === 'open') this.onopen = handler
    if (event === 'message') this.onmessage = handler
    if (event === 'error') this.onerror = handler
  }
  
  removeEventListener() {}
}

global.EventSource = MockEventSource as any

describe('useWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should connect to SSE endpoint', () => {
    const { result } = renderHook(() => useWebSocket())
    
    expect(result.current.eventSource).toBeDefined()
    expect(result.current.eventSource?.url).toBe('http://localhost:3000/sse')
  })

  it('should set connected to true when connection opens', async () => {
    const { result } = renderHook(() => useWebSocket())
    
    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })
  })

  it('should cleanup on unmount', () => {
    const { result, unmount } = renderHook(() => useWebSocket())
    const closeSpy = vi.spyOn(result.current.eventSource!, 'close')
    
    unmount()
    
    expect(closeSpy).toHaveBeenCalled()
  })
})

describe('useActivityFeed', () => {
  it('should return null initially', () => {
    const { result } = renderHook(() => useActivityFeed())
    
    expect(result.current).toBeNull()
  })
})

describe('useStats', () => {
  it('should return null initially', () => {
    const { result } = renderHook(() => useStats())
    
    expect(result.current).toBeNull()
  })
})

