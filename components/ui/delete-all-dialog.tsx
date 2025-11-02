'use client'

import { useState } from 'react'
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
import { AlertTriangle } from 'lucide-react'

interface DeleteAllDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  itemCount: number
  itemName: string // e.g., "requests", "examples", "detections"
  confirmationText?: string // Text user must type to confirm (default: "DELETE ALL")
}

export function DeleteAllDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemCount,
  itemName,
  confirmationText = 'DELETE ALL',
}: DeleteAllDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    if (confirmationInput !== confirmationText) {
      return
    }

    setIsDeleting(true)
    try {
      await onConfirm()
      setConfirmationInput('')
      onOpenChange(false)
    } catch (error) {
      console.error('Delete all failed:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setConfirmationInput('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg bg-destructive/10 border border-destructive/50 p-4">
            <p className="text-sm font-medium text-destructive">
              This will permanently delete <strong>{itemCount}</strong> {itemName}.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Type <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{confirmationText}</code> to confirm:
            </label>
            <Input
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={confirmationText}
              disabled={isDeleting}
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmationInput !== confirmationText || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

