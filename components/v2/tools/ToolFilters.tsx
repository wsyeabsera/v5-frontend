'use client'

import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ToolFiltersProps {
  filters: {
    source?: 'remote' | 'local' | 'all'
    operationType?: 'query' | 'mutation'
    entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other'
  }
  onFiltersChange: (filters: {
    source?: 'remote' | 'local' | 'all'
    operationType?: 'query' | 'mutation'
    entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other'
  }) => void
}

export function ToolFilters({ filters, onFiltersChange }: ToolFiltersProps) {
  const clearFilters = () => {
    onFiltersChange({})
  }

  const hasActiveFilters =
    (filters.source && filters.source !== 'all') ||
    filters.operationType ||
    filters.entityType

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Source Filter */}
        <div className="space-y-2">
          <Label>Source</Label>
          <Select
            value={filters.source || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                source: value === 'all' ? undefined : (value as 'remote' | 'local'),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="local">Local</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Operation Type Filter */}
        <div className="space-y-2">
          <Label>Operation Type</Label>
          <Select
            value={filters.operationType || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                operationType: value === 'all' ? undefined : (value as 'query' | 'mutation'),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="query">Query</SelectItem>
              <SelectItem value="mutation">Mutation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Entity Type Filter */}
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select
            value={filters.entityType || 'all'}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                entityType: value === 'all' ? undefined : (value as any),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              <SelectItem value="facility">Facility</SelectItem>
              <SelectItem value="shipment">Shipment</SelectItem>
              <SelectItem value="contaminant">Contaminant</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}

