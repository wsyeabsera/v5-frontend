'use client'

import { useState } from 'react'
import { OrchestrationChat } from '@/components/v2/orchestrator/orchestrations/OrchestrationChat'
import { OrchestrationList } from '@/components/v2/orchestrator/orchestrations/OrchestrationList'
import { Button } from '@/components/ui/button'
import { Play, List } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export default function OrchestrationsPage() {
  const [viewMode, setViewMode] = useState<'chat' | 'list'>('chat')
  const [selectedOrchestratorId, setSelectedOrchestratorId] = useState<string | undefined>()
  const queryClient = useQueryClient()

  const handleExecutionComplete = (executionId: string) => {
    // Invalidate orchestrations query to refresh the list
    queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestrations'] })
    queryClient.invalidateQueries({ queryKey: ['orchestrator', 'orchestration-executions'] })
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Play className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">Orchestrations</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chat')}
            >
              <Play className="w-4 h-4 mr-2" />
              Chat
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          {viewMode === 'chat'
            ? 'Execute orchestrators in a conversational chat interface. The orchestrator will ask for additional information when needed.'
            : 'View execution history and manage orchestrations. Each execution goes through thought, plan, execute, and summary phases.'}
        </p>
      </div>

      {viewMode === 'chat' ? (
        <OrchestrationChat
          orchestratorId={selectedOrchestratorId}
          onExecutionComplete={handleExecutionComplete}
        />
      ) : (
        <OrchestrationList />
      )}
    </div>
  )
}

