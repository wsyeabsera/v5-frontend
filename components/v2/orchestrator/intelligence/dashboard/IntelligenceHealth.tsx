'use client'

import { useIntelligenceHealth } from '@/lib/queries-v2'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'

export function IntelligenceHealth() {
  const { data: health, isLoading } = useIntelligenceHealth()

  if (isLoading) {
    return (
      <Card className="p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </Card>
    )
  }

  const healthData = health || {
    pinecone: { status: 'unknown', message: 'Not checked' },
    ollama: { status: 'unknown', message: 'Not checked' },
    embeddings: { status: 'unknown', message: 'Not checked' },
    search: { status: 'unknown', message: 'Not checked' },
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-600">Healthy</Badge>
      case 'degraded':
        return <Badge variant="default" className="bg-yellow-600">Degraded</Badge>
      case 'error':
        return <Badge variant="destructive">Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const services = [
    { name: 'Pinecone', key: 'pinecone' },
    { name: 'Ollama', key: 'ollama' },
    { name: 'Embeddings', key: 'embeddings' },
    { name: 'Semantic Search', key: 'search' },
  ]

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-lg mb-4">System Health</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => {
          const serviceHealth = healthData[service.key as keyof typeof healthData] as any
          return (
            <div key={service.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(serviceHealth?.status || 'unknown')}
                <div>
                  <p className="font-medium text-sm">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{serviceHealth?.message || 'Not checked'}</p>
                </div>
              </div>
              {getStatusBadge(serviceHealth?.status || 'unknown')}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

