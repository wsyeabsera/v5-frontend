'use client'

import { useTestPrompts } from '@/lib/queries-v2'
import { TestPromptCard } from './TestPromptCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Loader2, Search } from 'lucide-react'
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

  // Handle both response structures: { prompts: [...] } or { data: [...] } or direct array
  // Ensure promptsArray is always an array
  let promptsArray: any[] = []
  if (Array.isArray(prompts)) {
    promptsArray = prompts
  } else if (prompts && typeof prompts === 'object') {
    // Check for various possible response structures
    if (Array.isArray(prompts.prompts)) {
      promptsArray = prompts.prompts
    } else if (Array.isArray(prompts.data)) {
      promptsArray = prompts.data
    } else if (prompts.data && typeof prompts.data === 'object') {
      // If data is an object, check if it contains an array property
      const data = prompts.data as any
      console.log('prompts.data structure:', data)
      console.log('prompts.data keys:', Object.keys(data))
      
      if (Array.isArray(data.prompts)) {
        promptsArray = data.prompts
      } else if (Array.isArray(data.data)) {
        promptsArray = data.data
      } else if (Array.isArray(data.testPrompts)) {
        promptsArray = data.testPrompts
      } else if (Array.isArray(data.results)) {
        promptsArray = data.results
      } else if (Array.isArray(data.items)) {
        promptsArray = data.items
      } else if (Array.isArray(data.list)) {
        promptsArray = data.list
      } else {
        // If data is an object, check if it has array-like properties
        // Sometimes the data object itself might be the array wrapper
        const dataKeys = Object.keys(data)
        console.log('Checking data keys for arrays:', dataKeys)
        // Check if any key contains an array
        for (const key of dataKeys) {
          console.log(`Checking data.${key}:`, typeof data[key], Array.isArray(data[key]))
          if (Array.isArray(data[key])) {
            promptsArray = data[key]
            console.log(`Found array at data.${key}, length:`, promptsArray.length)
            break
          }
        }
      }
    } else if (Array.isArray(prompts.testPrompts)) {
      promptsArray = prompts.testPrompts
    } else if (Array.isArray(prompts.results)) {
      promptsArray = prompts.results
    } else if (Array.isArray(prompts.items)) {
      promptsArray = prompts.items
    } else {
      // If it's an object but not an array, check if it has a result property
      // that might contain the array
      const result = (prompts as any).result
      if (Array.isArray(result)) {
        promptsArray = result
      }
    }
  }

  console.log('Final promptsArray length:', promptsArray.length)

  const filteredPrompts = promptsArray.filter((prompt: any) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        prompt.query?.toLowerCase().includes(query) ||
        prompt.name?.toLowerCase().includes(query) ||
        prompt.description?.toLowerCase().includes(query)
      )
    }
    return true
  })

  console.log('Filtered prompts length:', filteredPrompts.length)

  const allCategories = Array.from(
    new Set(promptsArray.flatMap((p: any) => p.categories || []))
  ) as string[]
  const allTags = Array.from(
    new Set(promptsArray.flatMap((p: any) => p.tags || []))
  ) as string[]
  const allVersions = Array.from(
    new Set(promptsArray.map((p: any) => p.version).filter(Boolean))
  ) as string[]

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
          <div className="text-2xl font-bold">{promptsArray.length}</div>
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
            {promptsArray.filter((p: any) => p.userInputs && p.userInputs.length > 0).length}
          </div>
        </Card>
      </div>

      {/* Prompt List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrompts.map((prompt: any) => (
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

