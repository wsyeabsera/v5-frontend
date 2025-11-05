'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface ThoughtFiltersProps {
  filters: {
    userQuery?: string
    agentConfigId?: string
    limit?: number
    skip?: number
  }
  onFiltersChange: (filters: {
    userQuery?: string
    agentConfigId?: string
    limit?: number
    skip?: number
  }) => void
}

export function ThoughtFilters({
  filters,
  onFiltersChange,
}: ThoughtFiltersProps) {
  const [userQueryInput, setUserQueryInput] = useState(filters.userQuery || '')
  const [agentConfigIdInput, setAgentConfigIdInput] = useState(filters.agentConfigId || '')

  const updateUserQueryFilter = (value: string) => {
    setUserQueryInput(value)
    onFiltersChange({
      ...filters,
      userQuery: value.trim() || undefined,
      skip: 0, // Reset pagination when filter changes
    })
  }

  const updateAgentConfigIdFilter = (value: string) => {
    setAgentConfigIdInput(value)
    onFiltersChange({
      ...filters,
      agentConfigId: value.trim() || undefined,
      skip: 0, // Reset pagination when filter changes
    })
  }

  const clearFilters = () => {
    setUserQueryInput('')
    setAgentConfigIdInput('')
    onFiltersChange({
      limit: filters.limit || 50,
      skip: 0,
    })
  }

  const hasActiveFilters =
    (filters.userQuery && filters.userQuery.trim().length > 0) ||
    (filters.agentConfigId && filters.agentConfigId.trim().length > 0)

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Filters</Label>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
            <X className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* User Query Filter */}
        <div className="space-y-2">
          <Label htmlFor="userQuery-filter">User Query (partial match)</Label>
          <Input
            id="userQuery-filter"
            placeholder="Filter by user query..."
            value={userQueryInput}
            onChange={(e) => updateUserQueryFilter(e.target.value)}
          />
        </div>

        {/* Agent Config ID Filter */}
        <div className="space-y-2">
          <Label htmlFor="agentConfigId-filter">Agent Config ID</Label>
          <Input
            id="agentConfigId-filter"
            placeholder="Filter by agent config ID..."
            value={agentConfigIdInput}
            onChange={(e) => updateAgentConfigIdFilter(e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

