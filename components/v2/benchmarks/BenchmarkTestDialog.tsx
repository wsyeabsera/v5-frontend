'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateBenchmarkTest } from '@/lib/queries-intelligence/benchmarks'
import { Loader2 } from 'lucide-react'

interface BenchmarkTestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  test?: any
}

export function BenchmarkTestDialog({ open, onOpenChange, test }: BenchmarkTestDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('crud')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [expectedType, setExpectedType] = useState<'success' | 'failure' | 'partial'>('success')
  const [maxDuration, setMaxDuration] = useState(5000)

  const createTest = useCreateBenchmarkTest()

  useEffect(() => {
    if (open) {
      if (test) {
        setName(test.name || '')
        setDescription(test.description || '')
        setQuery(test.query || '')
        setCategory(test.category || 'crud')
        setPriority(test.priority || 'medium')
        setExpectedType(test.expectedOutcome?.type || 'success')
        setMaxDuration(test.expectedOutcome?.maxDuration || 5000)
      } else {
        setName('')
        setDescription('')
        setQuery('')
        setCategory('crud')
        setPriority('medium')
        setExpectedType('success')
        setMaxDuration(5000)
      }
    }
  }, [open, test])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !description || !query) {
      return
    }

    try {
      await createTest.mutateAsync({
        name,
        description,
        query,
        expectedOutcome: {
          type: expectedType,
          maxDuration,
        },
        category,
        priority,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create benchmark test:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{test ? 'Edit Benchmark Test' : 'Create Benchmark Test'}</DialogTitle>
          <DialogDescription>
            Define a benchmark test to measure agent performance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Test Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CRUD Operations"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this test does..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="query">Query *</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter the query to test..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crud">CRUD</SelectItem>
                  <SelectItem value="complex">Complex</SelectItem>
                  <SelectItem value="error">Error Handling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h4 className="font-semibold">Expected Outcome</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expected-type">Type</Label>
                <Select value={expectedType} onValueChange={(v) => setExpectedType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failure">Failure</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-duration">Max Duration (ms)</Label>
                <Input
                  id="max-duration"
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(parseInt(e.target.value) || 5000)}
                  min={0}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTest.isPending}>
              {createTest.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Test'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

