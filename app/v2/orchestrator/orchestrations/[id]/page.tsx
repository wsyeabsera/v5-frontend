'use client'

import { useParams, useRouter } from 'next/navigation'
import { OrchestrationDetailView } from '@/components/v2/orchestrator/orchestrations/OrchestrationDetailView'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function OrchestrationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/v2/orchestrator/orchestrations')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orchestrations
        </Button>
        <h1 className="text-4xl font-bold tracking-tight">Orchestration Execution Details</h1>
        <p className="text-muted-foreground mt-2">
          Detailed view of orchestration execution history and all phases
        </p>
      </div>

      {id ? (
        <OrchestrationDetailView executionId={id} />
      ) : (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-sm text-muted-foreground">Loading...</span>
        </div>
      )}
    </div>
  )
}

