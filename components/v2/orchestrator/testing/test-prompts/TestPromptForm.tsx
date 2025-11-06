'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserInputConfig } from './UserInputConfig'
import { ExpectedOutcomeEditor } from './ExpectedOutcomeEditor'
import { useCreateTestPrompt, useUpdateTestPrompt, useGetTestPrompt } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Base schema - shared fields
const baseTestPromptSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  version: z.string().default('v1.0'),
  userInputs: z.array(z.object({
    stepId: z.string().optional(),
    field: z.string().min(1),
    value: z.any(),
    description: z.string().optional(),
    order: z.number().optional(),
  })).optional(),
  expectedOutcome: z.union([
    z.object({
      success: z.boolean(),
      expectedPhases: z.array(z.string()).optional(),
      maxDuration: z.number().optional(),
      expectedResults: z.any().optional(),
    }),
    z.undefined(),
  ]).optional(),
  metadata: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    source: z.string().optional(),
    domain: z.string().optional(),
    author: z.string().optional(),
  }).optional().or(z.undefined()),
})

// Schema for creates - categories required
const createTestPromptSchema = baseTestPromptSchema.extend({
  categories: z.array(z.string()).min(1, 'At least one category is required'),
})

// Schema for updates - categories optional (but if provided, must have at least 1)
const updateTestPromptSchema = baseTestPromptSchema.extend({
  categories: z.array(z.string()).min(1).optional(),
})

// Use create schema by default (for type inference)
const testPromptSchema = createTestPromptSchema

type TestPromptFormData = z.infer<typeof testPromptSchema>

interface TestPromptFormProps {
  promptId?: string | null
  onSuccess: () => void
  onCancel: () => void
}

const defaultFormData: TestPromptFormData = {
  query: '',
  categories: [],
  tags: [],
  version: 'v1.0',
  userInputs: [],
}

export function TestPromptForm({ promptId, onSuccess, onCancel }: TestPromptFormProps) {
  const { data: existingPrompt, isLoading: isLoadingPrompt } = useGetTestPrompt(promptId || '')
  const createMutation = useCreateTestPrompt()
  const updateMutation = useUpdateTestPrompt()
  const { toast } = useToast()

  const [formData, setFormData] = useState<TestPromptFormData>(defaultFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [categoryInput, setCategoryInput] = useState('')
  const [tagInput, setTagInput] = useState('')

  // Reset form when promptId changes (switching between create/edit modes)
  useEffect(() => {
    if (promptId === null) {
      // Reset to default when creating new prompt (only when explicitly null, not empty string)
      setFormData(defaultFormData)
      setCategoryInput('')
      setTagInput('')
      setErrors({})
    }
  }, [promptId])

  // Populate form when existing prompt data is loaded
  useEffect(() => {
    if (promptId && existingPrompt && !isLoadingPrompt) {
      // Handle both response structures: { data: {...} } or direct object
      const prompt = existingPrompt.data || existingPrompt
      
      if (prompt && prompt.query) {
        console.log('Loading prompt data:', { prompt, categories: prompt.categories, promptId })
        const categories = Array.isArray(prompt.categories) && prompt.categories.length > 0 
          ? prompt.categories 
          : []
        const tags = Array.isArray(prompt.tags) ? prompt.tags : []
        
        console.log('Setting form data with categories:', categories)
        // Ensure expectedOutcome has success field if it exists
        // If expectedOutcome exists but doesn't have success, set a default or exclude it
        let expectedOutcome = undefined
        if (prompt.expectedOutcome && typeof prompt.expectedOutcome === 'object') {
          // Always ensure success field exists if expectedOutcome is present
          expectedOutcome = {
            success: prompt.expectedOutcome.success !== undefined ? prompt.expectedOutcome.success : true,
            expectedPhases: prompt.expectedOutcome.expectedPhases || undefined,
            maxDuration: prompt.expectedOutcome.maxDuration || undefined,
            expectedResults: prompt.expectedOutcome.expectedResults || undefined,
          }
        }
        
        setFormData({
          query: prompt.query || '',
          name: prompt.name || undefined,
          description: prompt.description || undefined,
          categories: categories,
          tags: tags,
          version: prompt.version || 'v1.0',
          userInputs: (prompt.userInputs || []).map((input: any) => ({
            ...input,
            value: input.value !== undefined ? input.value : '',
          })),
          expectedOutcome: expectedOutcome,
          metadata: prompt.metadata || undefined,
        })
        setCategoryInput('')
        setTagInput('')
        setErrors({})
      }
    }
  }, [promptId, existingPrompt, isLoadingPrompt])

  const validate = (): boolean => {
    try {
      console.log('Validating form data:', { formData, categories: formData.categories, promptId })
      // Use update schema if editing, create schema if creating
      const schema = promptId ? updateTestPromptSchema : createTestPromptSchema
      const result = schema.safeParse(formData)
      if (!result.success) {
        console.log('Validation failed:', result.error.errors)
        const newErrors: Record<string, string> = {}
        result.error.errors.forEach((err) => {
          const path = err.path.join('.')
          newErrors[path] = err.message
          console.log(`Validation error at ${path}: ${err.message}`)
        })
        setErrors(newErrors)
        return false
      }
      setErrors({})
      return true
    } catch (error) {
      console.error('Unexpected validation error:', error)
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          newErrors[path] = err.message
        })
        setErrors(newErrors)
      }
      return false
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted!', { formData, promptId })
    
    // Clean up expectedOutcome before validation - ensure it has success if it exists
    const cleanedFormData = {
      ...formData,
      expectedOutcome: formData.expectedOutcome && typeof formData.expectedOutcome === 'object'
        ? (formData.expectedOutcome.success !== undefined 
            ? formData.expectedOutcome 
            : { ...formData.expectedOutcome, success: true })
        : undefined,
    }
    
    // Validate with cleaned data
    const schema = promptId ? updateTestPromptSchema : createTestPromptSchema
    const validationResult = schema.safeParse(cleanedFormData)
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors)
      const newErrors: Record<string, string> = {}
      validationResult.error.errors.forEach((err) => {
        const path = err.path.join('.')
        newErrors[path] = err.message
        console.log(`Validation error at ${path}: ${err.message}`)
      })
      setErrors(newErrors)
      return
    }
    
    setErrors({})

    try {
      // Ensure userInputs have required value field
      const sanitizedData: any = {
        query: cleanedFormData.query,
        name: cleanedFormData.name || undefined,
        description: cleanedFormData.description || undefined,
        tags: cleanedFormData.tags.length > 0 ? cleanedFormData.tags : undefined,
        version: cleanedFormData.version,
        userInputs: cleanedFormData.userInputs && cleanedFormData.userInputs.length > 0
          ? cleanedFormData.userInputs.map((input: any) => ({
              ...input,
              value: input.value !== undefined ? input.value : '',
            }))
          : undefined,
        // Only include expectedOutcome if it exists and has a success field
        expectedOutcome: cleanedFormData.expectedOutcome && cleanedFormData.expectedOutcome.success !== undefined
          ? cleanedFormData.expectedOutcome
          : undefined,
        metadata: cleanedFormData.metadata || undefined,
      }

      if (promptId) {
        // For updates, only send categories if they exist and are not empty
        // Backend allows categories to be optional for updates
        if (cleanedFormData.categories && cleanedFormData.categories.length > 0) {
          sanitizedData.categories = cleanedFormData.categories
        }
        console.log('Updating prompt with data:', { promptId, ...sanitizedData })
        const result = await updateMutation.mutateAsync({
          promptId,
          ...sanitizedData,
        })
        console.log('Update mutation result:', result)
        toast({
          title: 'Success',
          description: 'Test prompt updated successfully',
        })
      } else {
        // For creates, categories are required (validation ensures this)
        sanitizedData.categories = cleanedFormData.categories
        console.log('Creating prompt with data:', sanitizedData)
        const result = await createMutation.mutateAsync(sanitizedData)
        console.log('Create mutation result:', result)
        toast({
          title: 'Success',
          description: 'Test prompt created successfully',
        })
      }
      onSuccess()
    } catch (error: any) {
      console.error('Error saving prompt:', error)
      // Show error to user
      const errorMessage = error?.message || error?.response?.data?.message || error?.data?.message || 'Failed to save prompt'
      console.error('Error details:', { error, errorMessage, errorResponse: error?.response })
      setErrors({ submit: errorMessage })
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const addCategory = (category: string) => {
    if (category && !formData.categories.includes(category)) {
      setFormData({ ...formData, categories: [...formData.categories, category] })
      setCategoryInput('')
    }
  }

  const removeCategory = (category: string) => {
    setFormData({ ...formData, categories: formData.categories.filter((c) => c !== category) })
  }

  const addTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: [...formData.tags, tag] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) })
  }

  if (isLoadingPrompt) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {errors.submit && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{errors.submit}</p>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="query">Query *</Label>
        <Textarea
          id="query"
          value={formData.query}
          onChange={(e) => setFormData({ ...formData, query: e.target.value })}
          placeholder="Enter the test prompt query..."
          rows={4}
        />
        {errors.query && (
          <p className="text-sm text-red-600">{errors.query}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value || undefined })}
            placeholder="Optional name for this prompt"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Version</Label>
          <Input
            id="version"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="v1.0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
          placeholder="Optional description..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Categories *</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.categories.map((cat) => (
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
          value={categoryInput}
          onChange={(e) => setCategoryInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const value = categoryInput.trim()
              if (value) {
                addCategory(value)
              }
            }
          }}
        />
        {errors.categories && (
          <p className="text-sm text-red-600">{errors.categories}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {formData.tags.map((tag) => (
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
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              const value = tagInput.trim()
              if (value) {
                addTag(value)
              }
            }
          }}
        />
      </div>

      <UserInputConfig
        value={(formData.userInputs || []).map((input: any) => ({
          ...input,
          value: input.value !== undefined ? input.value : '',
        }))}
        onChange={(inputs) => setFormData({ ...formData, userInputs: inputs })}
      />

      <ExpectedOutcomeEditor
        value={formData.expectedOutcome}
        onChange={(outcome) => setFormData({ ...formData, expectedOutcome: outcome })}
      />

      {/* Metadata Section */}
      <div className="space-y-4 border-t pt-4">
        <Label>Metadata (Optional)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select
              value={formData.metadata?.difficulty || undefined}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    difficulty: value === 'none' ? undefined : (value as 'easy' | 'medium' | 'hard'),
                  },
                })
              }
            >
              <SelectTrigger id="difficulty">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={formData.metadata?.priority || undefined}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    priority: value === 'none' ? undefined : (value as 'low' | 'medium' | 'high'),
                  },
                })
              }
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              value={formData.metadata?.source || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    source: e.target.value || undefined,
                  },
                })
              }
              placeholder="Optional source"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              value={formData.metadata?.domain || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    domain: e.target.value || undefined,
                  },
                })
              }
              placeholder="Optional domain"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={formData.metadata?.author || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: {
                    ...formData.metadata,
                    author: e.target.value || undefined,
                  },
                })
              }
              placeholder="Optional author"
            />
          </div>
        </div>
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

