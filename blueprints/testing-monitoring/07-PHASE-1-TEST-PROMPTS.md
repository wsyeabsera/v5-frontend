# Phase 1: Test Prompt Management Page

## Overview

Build a comprehensive page for managing test prompts - creating, viewing, editing, and deleting test prompts with user input configuration, categories, tags, and expected outcomes.

## Page: `app/v2/orchestrator/testing/test-prompts/page.tsx`

```typescript
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Prompts"
        description="Manage test prompts for orchestrator testing. Create prompts with user input configuration, expected outcomes, and metadata."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
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
                onSuccess={() => {
                  setIsFormOpen(false)
                  setEditingPrompt(null)
                }}
                onCancel={() => {
                  setIsFormOpen(false)
                  setEditingPrompt(null)
                }}
              />
            </DialogContent>
          </Dialog>
        }
      >
        <TestPromptList
          onEdit={(promptId) => {
            setEditingPrompt(promptId)
            setIsFormOpen(true)
          }}
        />
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-prompts/TestPromptList.tsx`

```typescript
'use client'

import { useTestPrompts } from '@/lib/queries-v2'
import { TestPromptCard } from './TestPromptCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, Search, Filter } from 'lucide-react'
import { useState } from 'react'

interface TestPromptListProps {
  onEdit: (promptId: string) => void
}

export function TestPromptList({ onEdit }: TestPromptListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  const [versionFilter, setVersionFilter] = useState<string>('all')

  const { data: prompts, isLoading, error, refetch } = useTestPrompts({
    tags: tagFilter !== 'all' ? [tagFilter] : undefined,
    categories: categoryFilter !== 'all' ? [categoryFilter] : undefined,
    version: versionFilter !== 'all' ? versionFilter : undefined,
  })

  const filteredPrompts = prompts?.data?.filter((prompt) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        prompt.query.toLowerCase().includes(query) ||
        prompt.name?.toLowerCase().includes(query) ||
        prompt.description?.toLowerCase().includes(query)
      )
    }
    return true
  }) || []

  const allCategories = Array.from(
    new Set(prompts?.data?.flatMap((p) => p.categories || []) || [])
  )
  const allTags = Array.from(
    new Set(prompts?.data?.flatMap((p) => p.tags || []) || [])
  )
  const allVersions = Array.from(
    new Set(prompts?.data?.map((p) => p.version) || [])
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600">Error loading prompts: {error.message}</div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={versionFilter} onValueChange={setVersionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Versions</SelectItem>
              {allVersions.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Prompts</div>
          <div className="text-2xl font-bold">{prompts?.data?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Categories</div>
          <div className="text-2xl font-bold">{allCategories.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Tags</div>
          <div className="text-2xl font-bold">{allTags.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">With User Inputs</div>
          <div className="text-2xl font-bold">
            {prompts?.data?.filter((p) => p.userInputs && p.userInputs.length > 0).length || 0}
          </div>
        </Card>
      </div>

      {/* Prompt List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.map((prompt) => (
          <TestPromptCard
            key={prompt.promptId}
            prompt={prompt}
            onEdit={onEdit}
            onDelete={refetch}
          />
        ))}
      </div>

      {filteredPrompts.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">No prompts found</div>
        </Card>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-prompts/TestPromptCard.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, Play, FileText } from 'lucide-react'
import { useDeleteTestPrompt } from '@/lib/queries-v2'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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

interface TestPrompt {
  promptId: string
  query: string
  name?: string
  description?: string
  categories: string[]
  tags: string[]
  version: string
  userInputs?: Array<{
    stepId?: string
    field: string
    value: any
    description?: string
    order?: number
  }>
  stats?: {
    executionCount: number
    successCount: number
    failureCount: number
    averageLatency: number
  }
}

interface TestPromptCardProps {
  prompt: TestPrompt
  onEdit: (promptId: string) => void
  onDelete: () => void
}

export function TestPromptCard({ prompt, onEdit, onDelete }: TestPromptCardProps) {
  const router = useRouter()
  const deleteMutation = useDeleteTestPrompt()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(prompt.promptId)
    onDelete()
    setShowDeleteDialog(false)
  }

  const successRate = prompt.stats?.executionCount
    ? ((prompt.stats.successCount / prompt.stats.executionCount) * 100).toFixed(1)
    : 'N/A'

  return (
    <>
      <Card className="p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">
              {prompt.name || prompt.promptId}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {prompt.query}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(prompt.promptId)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/v2/orchestrator/testing/execution?promptId=${prompt.promptId}`)}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Test
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {prompt.categories.map((cat) => (
            <Badge key={cat} variant="secondary">
              {cat}
            </Badge>
          ))}
          {prompt.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          {prompt.tags.length > 3 && (
            <Badge variant="outline">+{prompt.tags.length - 3}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>v{prompt.version}</span>
          </div>
          {prompt.userInputs && prompt.userInputs.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {prompt.userInputs.length} inputs
            </Badge>
          )}
        </div>

        {prompt.stats && prompt.stats.executionCount > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t text-sm">
            <div>
              <div className="text-muted-foreground">Executions</div>
              <div className="font-semibold">{prompt.stats.executionCount}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Success Rate</div>
              <div className="font-semibold">{successRate}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Latency</div>
              <div className="font-semibold">
                {Math.round(prompt.stats.averageLatency)}ms
              </div>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Prompt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{prompt.name || prompt.promptId}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-prompts/TestPromptForm.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserInputConfig } from './UserInputConfig'
import { ExpectedOutcomeEditor } from './ExpectedOutcomeEditor'
import { useCreateTestPrompt, useUpdateTestPrompt, useGetTestPrompt } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

const testPromptSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  categories: z.array(z.string()).min(1, 'At least one category is required'),
  tags: z.array(z.string()).default([]),
  version: z.string().default('v1.0'),
  userInputs: z.array(z.object({
    stepId: z.string().optional(),
    field: z.string().min(1),
    value: z.any(),
    description: z.string().optional(),
    order: z.number().optional(),
  })).optional(),
  expectedOutcome: z.object({
    success: z.boolean(),
    expectedPhases: z.array(z.string()).optional(),
    maxDuration: z.number().optional(),
    expectedResults: z.any().optional(),
  }).optional(),
  metadata: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    source: z.string().optional(),
    domain: z.string().optional(),
    author: z.string().optional(),
  }).optional(),
})

type TestPromptFormData = z.infer<typeof testPromptSchema>

interface TestPromptFormProps {
  promptId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function TestPromptForm({ promptId, onSuccess, onCancel }: TestPromptFormProps) {
  const { data: existingPrompt, isLoading: isLoadingPrompt } = useGetTestPrompt(promptId || '')
  const createMutation = useCreateTestPrompt()
  const updateMutation = useUpdateTestPrompt()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TestPromptFormData>({
    resolver: zodResolver(testPromptSchema),
    defaultValues: {
      categories: [],
      tags: [],
      version: 'v1.0',
      userInputs: [],
    },
  })

  const categories = watch('categories')
  const tags = watch('tags')
  const userInputs = watch('userInputs')
  const expectedOutcome = watch('expectedOutcome')

  useEffect(() => {
    if (existingPrompt?.data) {
      reset({
        query: existingPrompt.data.query,
        name: existingPrompt.data.name,
        description: existingPrompt.data.description,
        categories: existingPrompt.data.categories || [],
        tags: existingPrompt.data.tags || [],
        version: existingPrompt.data.version || 'v1.0',
        userInputs: existingPrompt.data.userInputs || [],
        expectedOutcome: existingPrompt.data.expectedOutcome,
        metadata: existingPrompt.data.metadata,
      })
    }
  }, [existingPrompt, reset])

  const onSubmit = async (data: TestPromptFormData) => {
    try {
      if (promptId) {
        await updateMutation.mutateAsync({
          promptId,
          ...data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving prompt:', error)
    }
  }

  const addCategory = (category: string) => {
    if (category && !categories.includes(category)) {
      setValue('categories', [...categories, category])
    }
  }

  const removeCategory = (category: string) => {
    setValue('categories', categories.filter((c) => c !== category))
  }

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setValue('tags', [...tags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter((t) => t !== tag))
  }

  if (isLoadingPrompt) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="query">Query *</Label>
        <Textarea
          id="query"
          {...register('query')}
          placeholder="Enter the test prompt query..."
          rows={4}
        />
        {errors.query && (
          <p className="text-sm text-red-600">{errors.query.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Optional name for this prompt"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            {...register('version')}
            placeholder="v1.0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Optional description..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Categories *</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {categories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-2">
              {cat}
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Add category (press Enter)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const value = e.currentTarget.value.trim()
              if (value) {
                addCategory(value)
                e.currentTarget.value = ''
              }
            }
          }}
        />
        {errors.categories && (
          <p className="text-sm text-red-600">{errors.categories.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="gap-2">
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-600"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Add tag (press Enter)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const value = e.currentTarget.value.trim()
              if (value) {
                addTag(value)
                e.currentTarget.value = ''
              }
            }
          }}
        />
      </div>

      <UserInputConfig
        value={userInputs || []}
        onChange={(inputs) => setValue('userInputs', inputs)}
      />

      <ExpectedOutcomeEditor
        value={expectedOutcome}
        onChange={(outcome) => setValue('expectedOutcome', outcome)}
      />

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : promptId ? (
            'Update Prompt'
          ) : (
            'Create Prompt'
          )}
        </Button>
      </div>
    </form>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-prompts/UserInputConfig.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface UserInput {
  stepId?: string
  field: string
  value: any
  description?: string
  order?: number
}

interface UserInputConfigProps {
  value: UserInput[]
  onChange: (inputs: UserInput[]) => void
}

export function UserInputConfig({ value, onChange }: UserInputConfigProps) {
  const addInput = () => {
    onChange([
      ...value,
      {
        field: '',
        value: '',
        order: value.length + 1,
      },
    ])
  }

  const updateInput = (index: number, updates: Partial<UserInput>) => {
    const newInputs = [...value]
    newInputs[index] = { ...newInputs[index], ...updates }
    onChange(newInputs)
  }

  const removeInput = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>User Inputs Configuration</Label>
        <Button type="button" variant="outline" size="sm" onClick={addInput}>
          <Plus className="w-4 h-4 mr-2" />
          Add Input
        </Button>
      </div>

      {value.length === 0 && (
        <Card className="p-4 text-center text-muted-foreground">
          No user inputs configured. Click "Add Input" to configure inputs that will be automatically provided during test execution.
        </Card>
      )}

      <div className="space-y-3">
        {value.map((input, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor={`field-${index}`}>Field Name *</Label>
                    <Input
                      id={`field-${index}`}
                      value={input.field}
                      onChange={(e) => updateInput(index, { field: e.target.value })}
                      placeholder="e.g., facility_id"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`stepId-${index}`}>Step ID (optional)</Label>
                    <Input
                      id={`stepId-${index}`}
                      value={input.stepId || ''}
                      onChange={(e) => updateInput(index, { stepId: e.target.value || undefined })}
                      placeholder="e.g., step1"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`value-${index}`}>Value *</Label>
                  <Input
                    id={`value-${index}`}
                    value={typeof input.value === 'string' ? input.value : JSON.stringify(input.value)}
                    onChange={(e) => {
                      let parsedValue: any = e.target.value
                      try {
                        parsedValue = JSON.parse(e.target.value)
                      } catch {
                        // Keep as string if not valid JSON
                      }
                      updateInput(index, { value: parsedValue })
                    }}
                    placeholder="Enter value (JSON supported)"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={input.description || ''}
                    onChange={(e) => updateInput(index, { description: e.target.value || undefined })}
                    placeholder="Optional description..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor={`order-${index}`} className="w-20">Order:</Label>
                  <Input
                    id={`order-${index}`}
                    type="number"
                    value={input.order || index + 1}
                    onChange={(e) => updateInput(index, { order: parseInt(e.target.value) || index + 1 })}
                    className="w-20"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeInput(index)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-prompts/ExpectedOutcomeEditor.tsx`

```typescript
'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'

interface ExpectedOutcome {
  success: boolean
  expectedPhases?: string[]
  maxDuration?: number
  expectedResults?: any
}

interface ExpectedOutcomeEditorProps {
  value?: ExpectedOutcome
  onChange: (outcome: ExpectedOutcome | undefined) => void
}

const PHASES = ['thought', 'plan', 'execution', 'summary']

export function ExpectedOutcomeEditor({ value, onChange }: ExpectedOutcomeEditorProps) {
  const outcome = value || { success: true }

  const updateField = <K extends keyof ExpectedOutcome>(
    field: K,
    val: ExpectedOutcome[K]
  ) => {
    onChange({ ...outcome, [field]: val })
  }

  const togglePhase = (phase: string) => {
    const phases = outcome.expectedPhases || []
    const newPhases = phases.includes(phase)
      ? phases.filter((p) => p !== phase)
      : [...phases, phase]
    updateField('expectedPhases', newPhases.length > 0 ? newPhases : undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Expected Outcome (Optional)</Label>
        <Checkbox
          checked={!!value}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange({ success: true })
            } else {
              onChange(undefined)
            }
          }}
        />
      </div>

      {value && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="expected-success"
              checked={outcome.success}
              onCheckedChange={(checked) => updateField('success', checked as boolean)}
            />
            <Label htmlFor="expected-success">Expected to succeed</Label>
          </div>

          <div className="space-y-2">
            <Label>Expected Phases</Label>
            <div className="flex flex-wrap gap-2">
              {PHASES.map((phase) => (
                <Badge
                  key={phase}
                  variant={outcome.expectedPhases?.includes(phase) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePhase(phase)}
                >
                  {phase}
                  {outcome.expectedPhases?.includes(phase) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-duration">Max Duration (ms)</Label>
            <Input
              id="max-duration"
              type="number"
              value={outcome.maxDuration || ''}
              onChange={(e) =>
                updateField('maxDuration', e.target.value ? parseInt(e.target.value) : undefined)
              }
              placeholder="Optional maximum duration"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-results">Expected Results (JSON)</Label>
            <Textarea
              id="expected-results"
              value={
                outcome.expectedResults
                  ? JSON.stringify(outcome.expectedResults, null, 2)
                  : ''
              }
              onChange={(e) => {
                try {
                  const parsed = e.target.value ? JSON.parse(e.target.value) : undefined
                  updateField('expectedResults', parsed)
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              placeholder="Optional expected results structure (JSON)"
              rows={4}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
```

## API Integration

### Extend `lib/mcp-client-orchestrator.ts`

```typescript
async createTestPrompt(data: {
  query: string
  name?: string
  description?: string
  categories: string[]
  tags?: string[]
  version?: string
  userInputs?: Array<{
    stepId?: string
    field: string
    value: any
    description?: string
    order?: number
  }>
  expectedOutcome?: {
    success: boolean
    expectedPhases?: string[]
    maxDuration?: number
    expectedResults?: any
  }
  metadata?: {
    difficulty?: 'easy' | 'medium' | 'hard'
    priority?: 'low' | 'medium' | 'high'
    source?: string
    domain?: string
    author?: string
  }
}) {
  return this.callTool('create_test_prompt', { ...data, stream: false })
}

async getTestPrompt(promptId: string) {
  return this.callTool('get_test_prompt', { promptId, stream: false })
}

async listTestPrompts(filters?: {
  categories?: string[]
  tags?: string[]
  version?: string
  limit?: number
  skip?: number
}) {
  return this.callTool('list_test_prompts', { ...filters, stream: false })
}

async updateTestPrompt(
  promptId: string,
  data: Partial<Parameters<typeof this.createTestPrompt>[0]>
) {
  return this.callTool('update_test_prompt', { promptId, ...data, stream: false })
}

async deleteTestPrompt(promptId: string) {
  return this.callTool('delete_test_prompt', { promptId, stream: false })
}
```

### Extend `lib/queries-v2.ts`

```typescript
export function useTestPrompts(filters?: {
  categories?: string[]
  tags?: string[]
  version?: string
}) {
  return useQuery({
    queryKey: ['test-prompts', filters],
    queryFn: () => mcpClient.listTestPrompts(filters),
  })
}

export function useGetTestPrompt(promptId: string) {
  return useQuery({
    queryKey: ['test-prompt', promptId],
    queryFn: () => mcpClient.getTestPrompt(promptId),
    enabled: !!promptId,
  })
}

export function useCreateTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClient.createTestPrompt>[0]) =>
      mcpClient.createTestPrompt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
    },
  })
}

export function useUpdateTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      promptId,
      ...data
    }: {
      promptId: string
    } & Partial<Parameters<typeof mcpClient.createTestPrompt>[0]>) =>
      mcpClient.updateTestPrompt(promptId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
      queryClient.invalidateQueries({ queryKey: ['test-prompt', variables.promptId] })
    },
  })
}

export function useDeleteTestPrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (promptId: string) => mcpClient.deleteTestPrompt(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-prompts'] })
    },
  })
}
```

## Sidebar Integration

Add to `components/layout/Sidebar.tsx`:

```typescript
{
  group: 'Testing',
  items: [
    { name: 'Test Prompts', href: '/v2/orchestrator/testing/test-prompts', icon: FileText },
    { name: 'Test Suites', href: '/v2/orchestrator/testing/test-suites', icon: Folder },
    { name: 'Test Execution', href: '/v2/orchestrator/testing/execution', icon: Play },
    { name: 'Test Runs', href: '/v2/orchestrator/testing/runs', icon: History },
    { name: 'Comparison', href: '/v2/orchestrator/testing/comparison', icon: GitCompare },
    { name: 'Analytics', href: '/v2/orchestrator/testing/analytics', icon: BarChart3 },
  ]
}
```

## Implementation Steps

1. Create page component at `app/v2/orchestrator/testing/test-prompts/page.tsx`
2. Create component directory `components/v2/orchestrator/testing/test-prompts/`
3. Implement `TestPromptList` component with filtering and search
4. Implement `TestPromptCard` component for displaying prompts
5. Implement `TestPromptForm` component with all fields
6. Implement `UserInputConfig` component for configuring user inputs
7. Implement `ExpectedOutcomeEditor` component
8. Extend `MCPClientOrchestrator` with test prompt methods
9. Add query hooks to `queries-v2.ts`
10. Add navigation items to sidebar
11. Test CRUD operations
12. Test user input configuration
13. Test filtering and search

## Success Criteria

- ✅ Create, read, update, delete test prompts
- ✅ Configure user inputs with field names, values, and descriptions
- ✅ Set expected outcomes with phases and duration
- ✅ Filter by categories, tags, and version
- ✅ Search prompts by query, name, or description
- ✅ View execution statistics on prompt cards
- ✅ Navigate to execution page from prompt card

