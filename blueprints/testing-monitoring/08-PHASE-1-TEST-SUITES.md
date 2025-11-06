# Phase 1: Test Suite Management Page

## Overview

Build a comprehensive page for managing test suites - creating, viewing, editing, and deleting test suites with test case management, versioning, and organization.

## Page: `app/v2/orchestrator/testing/test-suites/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { TestSuiteList } from '@/components/v2/orchestrator/testing/test-suites/TestSuiteList'
import { TestSuiteForm } from '@/components/v2/orchestrator/testing/test-suites/TestSuiteForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Folder, Plus } from 'lucide-react'
import { DashboardLayout } from '@/components/v2/orchestrator/dashboard/DashboardLayout'

export default function TestSuitesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSuite, setEditingSuite] = useState<string | null>(null)

  return (
    <div className="container mx-auto py-8 px-4 max-w-[95vw]">
      <DashboardLayout
        title="Test Suites"
        description="Organize test prompts into testable suites. Create suites with multiple test cases, manage versions, and track execution results."
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Test Suite
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSuite ? 'Edit Test Suite' : 'Create Test Suite'}
                </DialogTitle>
              </DialogHeader>
              <TestSuiteForm
                suiteId={editingSuite}
                onSuccess={() => {
                  setIsFormOpen(false)
                  setEditingSuite(null)
                }}
                onCancel={() => {
                  setIsFormOpen(false)
                  setEditingSuite(null)
                }}
              />
            </DialogContent>
          </Dialog>
        }
      >
        <TestSuiteList
          onEdit={(suiteId) => {
            setEditingSuite(suiteId)
            setIsFormOpen(true)
          }}
        />
      </DashboardLayout>
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-suites/TestSuiteList.tsx`

```typescript
'use client'

import { useTestSuites } from '@/lib/queries-v2'
import { TestSuiteCard } from './TestSuiteCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'

interface TestSuiteListProps {
  onEdit: (suiteId: string) => void
}

export function TestSuiteList({ onEdit }: TestSuiteListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [versionFilter, setVersionFilter] = useState<string>('all')

  const { data: suites, isLoading, error, refetch } = useTestSuites({
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    version: versionFilter !== 'all' ? versionFilter : undefined,
  })

  const filteredSuites = suites?.data?.filter((suite) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        suite.name.toLowerCase().includes(query) ||
        suite.description?.toLowerCase().includes(query) ||
        suite.suiteId.toLowerCase().includes(query)
      )
    }
    return true
  }) || []

  const allCategories = Array.from(
    new Set(suites?.data?.map((s) => s.category).filter(Boolean) || [])
  )
  const allVersions = Array.from(
    new Set(suites?.data?.map((s) => s.version) || [])
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
        <div className="text-red-600">Error loading suites: {error.message}</div>
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
              placeholder="Search suites..."
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
          <div className="text-sm text-muted-foreground">Total Suites</div>
          <div className="text-2xl font-bold">{suites?.data?.length || 0}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Test Cases</div>
          <div className="text-2xl font-bold">
            {suites?.data?.reduce((sum, s) => sum + (s.testCases?.length || 0), 0) || 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Categories</div>
          <div className="text-2xl font-bold">{allCategories.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Avg Cases/Suite</div>
          <div className="text-2xl font-bold">
            {suites?.data?.length
              ? Math.round(
                  suites.data.reduce((sum, s) => sum + (s.testCases?.length || 0), 0) /
                    suites.data.length
                )
              : 0}
          </div>
        </Card>
      </div>

      {/* Suite List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuites.map((suite) => (
          <TestSuiteCard
            key={suite.suiteId}
            suite={suite}
            onEdit={onEdit}
            onDelete={refetch}
          />
        ))}
      </div>

      {filteredSuites.length === 0 && (
        <Card className="p-12 text-center">
          <div className="text-muted-foreground">No test suites found</div>
        </Card>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-suites/TestSuiteCard.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreVertical, Edit, Trash2, Play, Folder } from 'lucide-react'
import { useDeleteTestSuite } from '@/lib/queries-v2'
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

interface TestSuite {
  suiteId: string
  name: string
  description?: string
  category?: string
  version: string
  testCases: Array<{
    id: string
    promptId: string
    query: string
  }>
}

interface TestSuiteCardProps {
  suite: TestSuite
  onEdit: (suiteId: string) => void
  onDelete: () => void
}

export function TestSuiteCard({ suite, onEdit, onDelete }: TestSuiteCardProps) {
  const router = useRouter()
  const deleteMutation = useDeleteTestSuite()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(suite.suiteId)
    onDelete()
    setShowDeleteDialog(false)
  }

  return (
    <>
      <Card className="p-4 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Folder className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">{suite.name}</h3>
            </div>
            {suite.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {suite.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(suite.suiteId)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/v2/orchestrator/testing/execution?suiteId=${suite.suiteId}`)}
              >
                <Play className="w-4 h-4 mr-2" />
                Run Suite
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

        <div className="flex items-center gap-2 mb-3">
          {suite.category && (
            <Badge variant="secondary">{suite.category}</Badge>
          )}
          <Badge variant="outline">v{suite.version}</Badge>
          <Badge variant="outline">{suite.testCases.length} cases</Badge>
        </div>

        <div className="text-sm text-muted-foreground">
          <div className="font-medium mb-1">Test Cases:</div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {suite.testCases.slice(0, 3).map((testCase) => (
              <div key={testCase.id} className="text-xs truncate">
                • {testCase.query.substring(0, 50)}
                {testCase.query.length > 50 ? '...' : ''}
              </div>
            ))}
            {suite.testCases.length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{suite.testCases.length - 3} more
              </div>
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Suite?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{suite.name}"? This action cannot be undone.
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

## Component: `components/v2/orchestrator/testing/test-suites/TestSuiteForm.tsx`

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
import { TestCaseManager } from './TestCaseManager'
import { useCreateTestSuite, useUpdateTestSuite, useGetTestSuite, useTestPrompts } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const testSuiteSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  version: z.string().default('v1.0'),
  testCases: z.array(z.object({
    id: z.string(),
    promptId: z.string(),
    query: z.string(),
    expectedOutcome: z.object({
      success: z.boolean(),
      expectedResults: z.any().optional(),
      expectedPhases: z.array(z.string()).optional(),
      maxDuration: z.number().optional(),
    }).optional(),
    metadata: z.object({
      tags: z.array(z.string()).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      category: z.string().optional(),
      description: z.string().optional(),
    }).optional(),
  })).min(1, 'At least one test case is required'),
  metadata: z.object({
    author: z.string().optional(),
    source: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }).optional(),
})

type TestSuiteFormData = z.infer<typeof testSuiteSchema>

interface TestSuiteFormProps {
  suiteId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

export function TestSuiteForm({ suiteId, onSuccess, onCancel }: TestSuiteFormProps) {
  const { data: existingSuite, isLoading: isLoadingSuite } = useGetTestSuite(suiteId || '')
  const { data: availablePrompts } = useTestPrompts()
  const createMutation = useCreateTestSuite()
  const updateMutation = useUpdateTestSuite()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TestSuiteFormData>({
    resolver: zodResolver(testSuiteSchema),
    defaultValues: {
      version: 'v1.0',
      testCases: [],
    },
  })

  const testCases = watch('testCases')

  useEffect(() => {
    if (existingSuite?.data) {
      reset({
        name: existingSuite.data.name,
        description: existingSuite.data.description,
        category: existingSuite.data.category,
        version: existingSuite.data.version || 'v1.0',
        testCases: existingSuite.data.testCases || [],
        metadata: existingSuite.data.metadata,
      })
    }
  }, [existingSuite, reset])

  const onSubmit = async (data: TestSuiteFormData) => {
    try {
      if (suiteId) {
        await updateMutation.mutateAsync({
          suiteId,
          ...data,
        })
      } else {
        await createMutation.mutateAsync(data)
      }
      onSuccess()
    } catch (error) {
      console.error('Error saving suite:', error)
    }
  }

  if (isLoadingSuite) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Test suite name"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
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
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          {...register('category')}
          placeholder="e.g., general, facility-ops, inspection"
        />
      </div>

      <div className="space-y-2">
        <Label>Test Cases *</Label>
        <TestCaseManager
          value={testCases || []}
          onChange={(cases) => setValue('testCases', cases)}
          availablePrompts={availablePrompts?.data || []}
        />
        {errors.testCases && (
          <p className="text-sm text-red-600">{errors.testCases.message}</p>
        )}
      </div>

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
          ) : suiteId ? (
            'Update Suite'
          ) : (
            'Create Suite'
          )}
        </Button>
      </div>
    </form>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-suites/TestCaseManager.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TestCaseCard } from './TestCaseCard'

interface TestCase {
  id: string
  promptId: string
  query: string
  expectedOutcome?: {
    success: boolean
    expectedResults?: any
    expectedPhases?: string[]
    maxDuration?: number
  }
  metadata?: {
    tags?: string[]
    difficulty?: 'easy' | 'medium' | 'hard'
    category?: string
    description?: string
  }
}

interface TestPrompt {
  promptId: string
  query: string
  name?: string
}

interface TestCaseManagerProps {
  value: TestCase[]
  onChange: (cases: TestCase[]) => void
  availablePrompts: TestPrompt[]
}

export function TestCaseManager({
  value,
  onChange,
  availablePrompts,
}: TestCaseManagerProps) {
  const [selectedPromptId, setSelectedPromptId] = useState<string>('')

  const addTestCase = () => {
    const selectedPrompt = availablePrompts.find((p) => p.promptId === selectedPromptId)
    if (!selectedPrompt) return

    const newCase: TestCase = {
      id: `tc_${Date.now()}`,
      promptId: selectedPrompt.promptId,
      query: selectedPrompt.query,
    }

    onChange([...value, newCase])
    setSelectedPromptId('')
  }

  const updateTestCase = (index: number, updates: Partial<TestCase>) => {
    const newCases = [...value]
    newCases[index] = { ...newCases[index], ...updates }
    onChange(newCases)
  }

  const removeTestCase = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const unusedPrompts = availablePrompts.filter(
    (p) => !value.some((tc) => tc.promptId === p.promptId)
  )

  return (
    <div className="space-y-4">
      {/* Add Test Case */}
      <Card className="p-4">
        <div className="flex gap-2">
          <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a test prompt to add" />
            </SelectTrigger>
            <SelectContent>
              {unusedPrompts.map((prompt) => (
                <SelectItem key={prompt.promptId} value={prompt.promptId}>
                  {prompt.name || prompt.promptId} - {prompt.query.substring(0, 50)}
                  {prompt.query.length > 50 ? '...' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            onClick={addTestCase}
            disabled={!selectedPromptId || unusedPrompts.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Test Case
          </Button>
        </div>
        {unusedPrompts.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            All available prompts have been added to this suite.
          </p>
        )}
      </Card>

      {/* Test Cases List */}
      <div className="space-y-3">
        {value.map((testCase, index) => (
          <TestCaseCard
            key={testCase.id}
            testCase={testCase}
            prompt={availablePrompts.find((p) => p.promptId === testCase.promptId)}
            onUpdate={(updates) => updateTestCase(index, updates)}
            onRemove={() => removeTestCase(index)}
          />
        ))}
      </div>

      {value.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          No test cases added. Select a prompt above to add test cases to this suite.
        </Card>
      )}
    </div>
  )
}
```

## Component: `components/v2/orchestrator/testing/test-suites/TestCaseCard.tsx`

```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'

interface TestCase {
  id: string
  promptId: string
  query: string
  expectedOutcome?: {
    success: boolean
    expectedResults?: any
    expectedPhases?: string[]
    maxDuration?: number
  }
  metadata?: {
    tags?: string[]
    difficulty?: 'easy' | 'medium' | 'hard'
    category?: string
    description?: string
  }
}

interface TestPrompt {
  promptId: string
  query: string
  name?: string
}

interface TestCaseCardProps {
  testCase: TestCase
  prompt?: TestPrompt
  onUpdate: (updates: Partial<TestCase>) => void
  onRemove: () => void
}

export function TestCaseCard({ testCase, prompt, onUpdate, onRemove }: TestCaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{testCase.id}</Badge>
            {prompt?.name && (
              <span className="text-sm font-medium">{prompt.name}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {testCase.query}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="mt-4 space-y-4 pt-4 border-t">
          {/* Expected Outcome */}
          <div className="space-y-2">
            <Label>Expected Outcome (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`expected-success-${testCase.id}`}
                checked={testCase.expectedOutcome?.success ?? false}
                onCheckedChange={(checked) =>
                  onUpdate({
                    expectedOutcome: {
                      ...testCase.expectedOutcome,
                      success: checked as boolean,
                    },
                  })
                }
              />
              <Label htmlFor={`expected-success-${testCase.id}`}>
                Expected to succeed
              </Label>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`max-duration-${testCase.id}`}>Max Duration (ms)</Label>
              <Input
                id={`max-duration-${testCase.id}`}
                type="number"
                value={testCase.expectedOutcome?.maxDuration || ''}
                onChange={(e) =>
                  onUpdate({
                    expectedOutcome: {
                      ...testCase.expectedOutcome,
                      maxDuration: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label>Metadata (Optional)</Label>
            <div className="space-y-1">
              <Label htmlFor={`difficulty-${testCase.id}`}>Difficulty</Label>
              <Select
                value={testCase.metadata?.difficulty || ''}
                onValueChange={(value) =>
                  onUpdate({
                    metadata: {
                      ...testCase.metadata,
                      difficulty: value as 'easy' | 'medium' | 'hard' | undefined,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`category-${testCase.id}`}>Category</Label>
              <Input
                id={`category-${testCase.id}`}
                value={testCase.metadata?.category || ''}
                onChange={(e) =>
                  onUpdate({
                    metadata: {
                      ...testCase.metadata,
                      category: e.target.value || undefined,
                    },
                  })
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`description-${testCase.id}`}>Description</Label>
              <Textarea
                id={`description-${testCase.id}`}
                value={testCase.metadata?.description || ''}
                onChange={(e) =>
                  onUpdate({
                    metadata: {
                      ...testCase.metadata,
                      description: e.target.value || undefined,
                    },
                  })
                }
                placeholder="Optional"
                rows={2}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
```

## API Integration

### Extend `lib/mcp-client-orchestrator.ts`

```typescript
async createTestSuite(data: {
  name: string
  description?: string
  category?: string
  version?: string
  testCases: Array<{
    id: string
    promptId: string
    query: string
    expectedOutcome?: {
      success: boolean
      expectedResults?: any
      expectedPhases?: string[]
      maxDuration?: number
    }
    metadata?: {
      tags?: string[]
      difficulty?: 'easy' | 'medium' | 'hard'
      category?: string
      description?: string
    }
  }>
  metadata?: {
    author?: string
    source?: string
    tags?: string[]
  }
}) {
  return this.callTool('create_test_suite', { ...data, stream: false })
}

async getTestSuite(suiteId: string) {
  return this.callTool('get_test_suite', { suiteId, stream: false })
}

async listTestSuites(filters?: {
  category?: string
  version?: string
  limit?: number
  skip?: number
}) {
  return this.callTool('list_test_suites', { ...filters, stream: false })
}

async updateTestSuite(
  suiteId: string,
  data: Partial<Parameters<typeof this.createTestSuite>[0]>
) {
  return this.callTool('update_test_suite', { suiteId, ...data, stream: false })
}

async deleteTestSuite(suiteId: string) {
  return this.callTool('delete_test_suite', { suiteId, stream: false })
}
```

### Extend `lib/queries-v2.ts`

```typescript
export function useTestSuites(filters?: {
  category?: string
  version?: string
}) {
  return useQuery({
    queryKey: ['test-suites', filters],
    queryFn: () => mcpClient.listTestSuites(filters),
  })
}

export function useGetTestSuite(suiteId: string) {
  return useQuery({
    queryKey: ['test-suite', suiteId],
    queryFn: () => mcpClient.getTestSuite(suiteId),
    enabled: !!suiteId,
  })
}

export function useCreateTestSuite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof mcpClient.createTestSuite>[0]) =>
      mcpClient.createTestSuite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites'] })
    },
  })
}

export function useUpdateTestSuite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      suiteId,
      ...data
    }: {
      suiteId: string
    } & Partial<Parameters<typeof mcpClient.createTestSuite>[0]>) =>
      mcpClient.updateTestSuite(suiteId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-suites'] })
      queryClient.invalidateQueries({ queryKey: ['test-suite', variables.suiteId] })
    },
  })
}

export function useDeleteTestSuite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (suiteId: string) => mcpClient.deleteTestSuite(suiteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-suites'] })
    },
  })
}
```

## Implementation Steps

1. Create page component at `app/v2/orchestrator/testing/test-suites/page.tsx`
2. Create component directory `components/v2/orchestrator/testing/test-suites/`
3. Implement `TestSuiteList` component with filtering
4. Implement `TestSuiteCard` component for displaying suites
5. Implement `TestSuiteForm` component
6. Implement `TestCaseManager` component for managing test cases
7. Implement `TestCaseCard` component for individual test cases
8. Extend `MCPClientOrchestrator` with test suite methods
9. Add query hooks to `queries-v2.ts`
10. Test CRUD operations
11. Test test case management
12. Test filtering and search

## Success Criteria

- ✅ Create, read, update, delete test suites
- ✅ Add and remove test cases from suites
- ✅ Configure test case metadata and expected outcomes
- ✅ Filter by category and version
- ✅ Search suites by name, description, or ID
- ✅ View test case count and details
- ✅ Navigate to execution page from suite card

