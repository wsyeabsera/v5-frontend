'use client'

import { useState } from 'react'
import { useOrchestrators, useDeleteOrchestrator } from '@/lib/queries-v2'
import { OrchestratorCard } from './OrchestratorCard'
import { OrchestratorDialog } from './OrchestratorDialog'
import { OrchestratorViewDialog } from './OrchestratorViewDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export function OrchestratorList() {
  const [nameFilter, setNameFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedOrchestrator, setSelectedOrchestrator] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orchestratorToDelete, setOrchestratorToDelete] = useState<any>(null)

  const filters = {
    ...(nameFilter.trim() && { name: nameFilter.trim() }),
    ...(statusFilter.trim() && { status: statusFilter.trim() }),
  }
  const { data: orchestrators, isLoading, error } = useOrchestrators(Object.keys(filters).length > 0 ? filters : undefined)
  const deleteMutation = useDeleteOrchestrator()

  const filteredOrchestrators = Array.isArray(orchestrators) ? orchestrators : []

  const handleView = (orchestrator: any) => {
    setSelectedOrchestrator(orchestrator)
    setViewDialogOpen(true)
  }

  const handleEdit = (orchestrator: any) => {
    setSelectedOrchestrator(orchestrator)
    setDialogOpen(true)
  }

  const handleDelete = (orchestrator: any) => {
    setOrchestratorToDelete(orchestrator)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (orchestratorToDelete) {
      try {
        await deleteMutation.mutateAsync(orchestratorToDelete._id)
        setDeleteDialogOpen(false)
        setOrchestratorToDelete(null)
      } catch (error) {
        console.error('Failed to delete orchestrator:', error)
      }
    }
  }

  const handleCreate = () => {
    setSelectedOrchestrator(null)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">Loading orchestrators...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
        <div>
          <div className="font-semibold text-red-900 dark:text-red-100">Failed to load orchestrators</div>
          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Orchestrators</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredOrchestrators.length} orchestrator{filteredOrchestrators.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Orchestrator
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="name-filter">Filter by Name</Label>
          <Input
            id="name-filter"
            placeholder="Search by name..."
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
        </div>
        <div className="max-w-xs">
          <Label htmlFor="status-filter">Filter by Status</Label>
          <Input
            id="status-filter"
            placeholder="Search by status..."
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Orchestrators Grid */}
      {filteredOrchestrators.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 rounded-lg bg-muted/30 border border-dashed border-border">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-muted-foreground" />
            <div className="text-center">
              <div className="font-semibold text-lg mb-1">No orchestrators found</div>
              <div className="text-sm text-muted-foreground">
                {nameFilter || statusFilter
                  ? 'Try adjusting your filters'
                  : 'Create your first orchestrator to get started'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrchestrators.map((orchestrator: any, index: number) => (
            <div
              key={orchestrator._id || index}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <OrchestratorCard
                orchestrator={orchestrator}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <OrchestratorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orchestrator={selectedOrchestrator}
      />

      {/* View Dialog */}
      <OrchestratorViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        orchestrator={selectedOrchestrator}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Orchestrator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {orchestratorToDelete?.name}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

