'use client'

/**
 * SSE Client for handling Server-Sent Events from orchestrator server
 * Handles the format: event: <type>\ndata: <json>\n\n
 * Supports both GET (EventSource) and POST (fetch with streaming)
 */
export class SSEClient {
  private eventSource: EventSource | null = null
  private abortController: AbortController | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private onErrorCallback?: (error: Event) => void
  private onCompleteCallback?: () => void
  private requestBody?: any

  constructor(private url: string, requestBody?: any) {
    this.requestBody = requestBody
  }

  connect() {
    if (this.eventSource || this.abortController) {
      this.disconnect()
    }

    // If requestBody is provided, use fetch with streaming (POST)
    if (this.requestBody) {
      this.connectWithFetch()
      return this
    }

    // Otherwise use EventSource (GET)
    this.eventSource = new EventSource(this.url)

    this.eventSource.onerror = (error) => {
      console.error('[SSE Client] Error:', error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
    }

    // Handle all event types
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('message', data)
      } catch (error) {
        console.error('[SSE Client] Failed to parse message:', error)
      }
    }

    // Handle specific event types (orchestration and test events)
    const eventTypes = [
      'thought', 'plan', 'step', 'user_input_required', 'summary', 'error', 'complete',
      'test_started', 'test_phase', 'test_user_input_required', 'test_complete'
    ]
    eventTypes.forEach((eventType) => {
      this.eventSource!.addEventListener(eventType, (event: any) => {
        try {
          const data = JSON.parse(event.data)
          this.emit(eventType, data)
          
          if (eventType === 'complete') {
            if (this.onCompleteCallback) {
              this.onCompleteCallback()
            }
          }
        } catch (error) {
          console.error(`[SSE Client] Failed to parse ${eventType} event:`, error)
        }
      })
    })

    return this
  }

  private async connectWithFetch() {
    this.abortController = new AbortController()

    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.requestBody),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          if (this.onCompleteCallback) {
            this.onCompleteCallback()
          }
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = 'message'
        let currentData = ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim()
          } else if (line.startsWith('data:')) {
            currentData = line.substring(5).trim()
            if (currentData) {
              try {
                const data = JSON.parse(currentData)
                this.emit(currentEvent, data)
                currentData = ''
                currentEvent = 'message'
              } catch (error) {
                console.error('[SSE Client] Failed to parse data:', error)
              }
            }
          } else if (line === '') {
            // Empty line indicates end of event
            if (currentData) {
              try {
                const data = JSON.parse(currentData)
                this.emit(currentEvent, data)
                currentData = ''
                currentEvent = 'message'
              } catch (error) {
                console.error('[SSE Client] Failed to parse data:', error)
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('[SSE Client] Fetch error:', error)
        if (this.onErrorCallback) {
          this.onErrorCallback(error as Event)
        }
      }
    }
  }

  on(eventType: string, callback: (data: any) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
    return this
  }

  off(eventType: string, callback: (data: any) => void) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.delete(callback)
    }
    return this
  }

  onError(callback: (error: Event) => void) {
    this.onErrorCallback = callback
    return this
  }

  onComplete(callback: () => void) {
    this.onCompleteCallback = callback
    return this
  }

  private emit(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data)
        } catch (error) {
          console.error(`[SSE Client] Error in ${eventType} listener:`, error)
        }
      })
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    this.listeners.clear()
    this.onErrorCallback = undefined
    this.onCompleteCallback = undefined
  }
}

