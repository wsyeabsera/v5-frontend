'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GeneratePlanDialog } from '@/components/v2/plans/GeneratePlanDialog'
import { ListChecks, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

interface GeneratePlanButtonProps {
  thoughtId: string
  agentConfigId?: string
  onPlanGenerated?: (planId: string) => void
}

export function GeneratePlanButton({ thoughtId, agentConfigId, onPlanGenerated }: GeneratePlanButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['v2', 'plans'] })
    setDialogOpen(false)
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setDialogOpen(true)}
      >
        <ListChecks className="w-4 h-4 mr-2" />
        Generate Plan
      </Button>
      <GeneratePlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={handleSuccess}
        initialThoughtId={thoughtId}
        initialAgentConfigId={agentConfigId}
      />
    </>
  )
}

