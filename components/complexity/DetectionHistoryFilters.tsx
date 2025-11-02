'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { X, Filter } from 'lucide-react'

export interface DetectionHistoryFilters {
  detectionMethod: 'all' | 'semantic' | 'keyword'
  minScore?: number
  maxScore?: number
  startDate?: string
  endDate?: string
}

interface DetectionHistoryFiltersProps {
  filters: DetectionHistoryFilters
  onFiltersChange: (filters: DetectionHistoryFilters) => void
}

export function DetectionHistoryFilters({
  filters,
  onFiltersChange,
}: DetectionHistoryFiltersProps) {
  const handleFilterChange = (key: keyof DetectionHistoryFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const handleClearFilters = () => {
    onFiltersChange({
      detectionMethod: 'all',
    })
  }

  const hasActiveFilters =
    filters.detectionMethod !== 'all' ||
    filters.minScore !== undefined ||
    filters.maxScore !== undefined ||
    filters.startDate ||
    filters.endDate

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <Label className="text-sm font-medium">Filters</Label>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-2"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="detectionMethod">Detection Method</Label>
          <Select
            value={filters.detectionMethod}
            onValueChange={(value: DetectionHistoryFilters['detectionMethod']) =>
              handleFilterChange('detectionMethod', value)
            }
          >
            <SelectTrigger id="detectionMethod">
              <SelectValue placeholder="All methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="semantic">Semantic</SelectItem>
              <SelectItem value="keyword">Keyword</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="minScore">Min Score</Label>
          <Input
            id="minScore"
            type="number"
            min="0"
            max="1"
            step="0.01"
            placeholder="0.0"
            value={filters.minScore || ''}
            onChange={(e) =>
              handleFilterChange('minScore', e.target.value ? parseFloat(e.target.value) : undefined)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxScore">Max Score</Label>
          <Input
            id="maxScore"
            type="number"
            min="0"
            max="1"
            step="0.01"
            placeholder="1.0"
            value={filters.maxScore || ''}
            onChange={(e) =>
              handleFilterChange('maxScore', e.target.value ? parseFloat(e.target.value) : undefined)
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
          />
        </div>
      </div>
    </div>
  )
}

