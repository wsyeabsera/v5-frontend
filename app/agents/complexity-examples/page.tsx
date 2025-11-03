'use client'

import { useState, useEffect } from 'react'
import { ComplexityExample } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ExampleForm } from '@/components/complexity/ExampleForm'
import { ExampleList } from '@/components/complexity/ExampleList'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Loader2, Trash2 } from 'lucide-react'
import { DeleteAllDialog } from '@/components/ui/delete-all-dialog'

export default function ComplexityExamplesPage() {
  const [examples, setExamples] = useState<ComplexityExample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false)
  const [editingExample, setEditingExample] = useState<ComplexityExample | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadExamples = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/complexity-examples')
      if (!response.ok) {
        throw new Error('Failed to load examples')
      }
      const data = await response.json()
      setExamples(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load examples')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExamples()
  }, [])

  const handleCreate = () => {
    setEditingExample(null)
    setIsFormOpen(true)
  }

  const handleEdit = (example: ComplexityExample) => {
    setEditingExample(example)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this example?')) return

    try {
      const response = await fetch(`/api/complexity-examples?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete example')
      }

      await loadExamples()
    } catch (err: any) {
      setError(err.message || 'Failed to delete example')
    }
  }

  const handleSubmit = async (
    exampleData: Omit<ComplexityExample, 'id' | 'embedding' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ) => {
    try {
      if (editingExample) {
        // Update existing
        const response = await fetch('/api/complexity-examples', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingExample.id,
            query: exampleData.query,
            config: exampleData.config,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to update example')
        }
      } else {
        // Create new
        const response = await fetch('/api/complexity-examples', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exampleData),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create example')
        }
      }

      setIsFormOpen(false)
      setEditingExample(null)
      await loadExamples()
    } catch (err: any) {
      setError(err.message || 'Failed to save example')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const response = await fetch('/api/complexity-examples?all=true', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all examples')
      }

      const result = await response.json()
      setError(null)
      await loadExamples()
      alert(`Successfully deleted ${result.count} example${result.count !== 1 ? 's' : ''}`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete all examples')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Breadcrumbs items={[
          { label: 'Training Data', href: '/agents/pipeline' },
          { label: 'Complexity Examples' },
        ]} />
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-1">Complexity Examples</h1>
            <p className="text-[13px] text-muted-foreground">
              Manage example queries for semantic complexity detection
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadExamples}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            {examples.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteAllOpen(true)}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </Button>
            )}
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Example
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Examples List */}
        <Card>
          <CardHeader>
            <CardTitle>Examples ({examples.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ExampleList
              examples={examples}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExample ? 'Edit Example' : 'Create Example'}
              </DialogTitle>
            </DialogHeader>
            <ExampleForm
              example={editingExample || undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsFormOpen(false)
                setEditingExample(null)
              }}
              isLoading={isLoading}
            />
          </DialogContent>
        </Dialog>

        {/* Delete All Dialog */}
        <DeleteAllDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onConfirm={handleDeleteAll}
          title="Delete All Complexity Examples"
          description="Are you sure you want to delete all complexity examples? This will remove all examples from Pinecone and cannot be undone."
          itemCount={examples.length}
          itemName="examples"
        />
      </div>
    </div>
  )
}

