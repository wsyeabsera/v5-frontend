'use client'

import { useState } from 'react'
import { TestPromptList } from '@/components/v2/orchestrator/testing/test-prompts/TestPromptList'
import { TestPromptForm } from '@/components/v2/orchestrator/testing/test-prompts/TestPromptForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FileText, Plus } from 'lucide-react'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'

export default function TestPromptsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)

  const handleDialogChange = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      // Reset editing state when dialog closes
      setEditingPrompt(null)
    }
  }

  const handleEdit = (promptId: string) => {
    setEditingPrompt(promptId)
    setIsFormOpen(true)
  }

  const handleSuccess = () => {
    setIsFormOpen(false)
    setEditingPrompt(null)
  }

  const handleCancel = () => {
    setIsFormOpen(false)
    setEditingPrompt(null)
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Prompts"
        description="Manage test prompts for orchestrator testing. Create prompts with user input configuration, expected outcomes, and metadata."
        actions={
          <Dialog open={isFormOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPrompt(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Test Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPrompt ? 'Edit Test Prompt' : 'Create Test Prompt'}
                </DialogTitle>
              </DialogHeader>
              <TestPromptForm
                promptId={editingPrompt}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </DialogContent>
          </Dialog>
        }
      >
        <TestPromptList onEdit={handleEdit} />
      </DashboardLayout>
    </div>
  )
}

