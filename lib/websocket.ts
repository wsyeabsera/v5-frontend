'use client'

import { useEffect, useState } from 'react'
import { ActivityData, StatsData } from '@/types'

const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost:3000'

export function useWebSocket() {
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource(`${SSE_URL}/sse`)

    es.addEventListener('open', () => {
      console.log('[SSE] Connected')
      setConnected(true)
    })

    es.addEventListener('error', () => {
      console.log('[SSE] Error or disconnected')
      setConnected(false)
    })

    setEventSource(es)

    return () => {
      es.close()
    }
  }, [])

  return { eventSource, connected }
}

export function useActivityFeed() {
  const { eventSource } = useWebSocket()
  const [activity, setActivity] = useState<ActivityData | null>(null)

  useEffect(() => {
    if (!eventSource) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'activity') {
          setActivity(data.data)
        }
      } catch (error) {
        console.error('[SSE] Error parsing activity message:', error)
      }
    }

    eventSource.addEventListener('message', handleMessage)

    return () => {
      eventSource.removeEventListener('message', handleMessage)
    }
  }, [eventSource])

  return activity
}

export function useStats() {
  const { eventSource } = useWebSocket()
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    if (!eventSource) return

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'stats') {
          setStats(data.data)
        }
      } catch (error) {
        console.error('[SSE] Error parsing stats message:', error)
      }
    }

    eventSource.addEventListener('message', handleMessage)

    return () => {
      eventSource.removeEventListener('message', handleMessage)
    }
  }, [eventSource])

  return stats
}

