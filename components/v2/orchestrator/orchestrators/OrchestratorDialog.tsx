'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  useCreateOrchestrator,
  useUpdateOrchestrator,
} from '@/lib/queries-v2'
import { OrchestratorConfigBuilder } from './OrchestratorConfigBuilder'
import { Loader2 } from 'lucide-react'

interface OrchestratorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orchestrator?: any
}

export function OrchestratorDialog({ open, onOpenChange, orchestrator }: OrchestratorDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [config, setConfig] = useState<any>(undefined)

  const createMutation = useCreateOrchestrator()
  const updateMutation = useUpdateOrchestrator()

  const isEditing = !!orchestrator
  const isLoading = createMutation.isPending || updateMutation.isPending

  useEffect(() => {
    if (orchestrator) {
      setName(orchestrator.name || '')
      setDescription(orchestrator.description || '')
      setStatus(orchestrator.status || '')
      setConfig(orchestrator.config)
    } else {
      setName('')
      setDescription('')
      setStatus('')
      setConfig(undefined)
    }
  }, [orchestrator, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    try {
      const data: any = {
        name: name.trim(),
      }

      if (description.trim()) {
        data.description = description.trim()
      }

      if (status.trim()) {
        data.status = status.trim()
      }

      if (config) {
        data.config = config
      }

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: orchestrator._id,
          updates: data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to save orchestrator:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Orchestrator' : 'Create New Orchestrator'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the orchestrator configuration below.'
              : 'Create a new orchestrator to manage agent workflows.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Default Orchestrator"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the orchestrator's purpose..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    placeholder="e.g., active, inactive"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <OrchestratorConfigBuilder config={config} onChange={setConfig} />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

