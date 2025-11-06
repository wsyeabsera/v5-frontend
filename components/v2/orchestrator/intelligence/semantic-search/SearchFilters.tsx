'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Card } from '@/components/ui/card'
import { useOrchestrators } from '@/lib/queries-v2'

interface SearchFiltersProps {
  filters: {
    orchestratorId: string
    status: 'completed' | 'failed' | 'paused' | ''
    minConfidence: number
    minQuality: number
    searchType: 'query' | 'thought' | 'plan' | 'summary' | 'combined'
    limit: number
  }
  onFiltersChange: (filters: any) => void
}

export function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const { data: orchestrators } = useOrchestrators()
  const orchestratorList = Array.isArray(orchestrators) ? orchestrators : []

  return (
    <Card className="p-4 bg-muted/50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Orchestrator Filter */}
        <div>
          <Label htmlFor="orchestrator-filter">Orchestrator</Label>
          <Select
            value={filters.orchestratorId || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, orchestratorId: value === 'all' ? '' : value })}
          >
            <SelectTrigger id="orchestrator-filter" className="mt-1">
              <SelectValue placeholder="All orchestrators" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {orchestratorList.map((orch: any) => (
                <SelectItem key={orch._id} value={orch._id}>
                  {orch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? '' : value as any })}
          >
            <SelectTrigger id="status-filter" className="mt-1">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Type */}
        <div>
          <Label htmlFor="search-type">Search Type</Label>
          <Select
            value={filters.searchType}
            onValueChange={(value) => onFiltersChange({ ...filters, searchType: value as any })}
          >
            <SelectTrigger id="search-type" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="combined">Combined</SelectItem>
              <SelectItem value="query">Query</SelectItem>
              <SelectItem value="thought">Thought</SelectItem>
              <SelectItem value="plan">Plan</SelectItem>
              <SelectItem value="summary">Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Min Confidence */}
        <div>
          <Label>Min Confidence: {filters.minConfidence}%</Label>
          <Slider
            value={[filters.minConfidence]}
            onValueChange={([value]) => onFiltersChange({ ...filters, minConfidence: value })}
            min={0}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Min Quality */}
        <div>
          <Label>Min Quality: {filters.minQuality}%</Label>
          <Slider
            value={[filters.minQuality]}
            onValueChange={([value]) => onFiltersChange({ ...filters, minQuality: value })}
            min={0}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>

        {/* Limit */}
        <div>
          <Label htmlFor="limit">Results Limit</Label>
          <Input
            id="limit"
            type="number"
            min={1}
            max={50}
            value={filters.limit}
            onChange={(e) => onFiltersChange({ ...filters, limit: parseInt(e.target.value) || 10 })}
            className="mt-1"
          />
        </div>
      </div>
    </Card>
  )
}

