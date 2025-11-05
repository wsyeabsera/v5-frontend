'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'

interface TimelineSearchProps {
  searchType: 'thoughtId' | 'planId' | 'taskId' | 'all' | null
  searchValue: string
  onSearchTypeChange: (type: 'thoughtId' | 'planId' | 'taskId' | 'all' | null) => void
  onSearchValueChange: (value: string) => void
  onClear: () => void
}

export function TimelineSearch({
  searchType,
  searchValue,
  onSearchTypeChange,
  onSearchValueChange,
  onClear,
}: TimelineSearchProps) {
  const [localValue, setLocalValue] = useState(searchValue)

  const handleSearch = () => {
    onSearchValueChange(localValue)
  }

  const handleClear = () => {
    setLocalValue('')
    onClear()
  }

  const hasSearch = searchType && searchType !== 'all' && localValue.trim().length > 0

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Search</Label>
        {hasSearch && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-2">
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <Select
          value={searchType || 'all'}
          onValueChange={(value) => {
            const type = value === 'all' ? null : (value as 'thoughtId' | 'planId' | 'taskId')
            onSearchTypeChange(type || 'all')
            if (value === 'all') {
              handleClear()
            }
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Search by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Executions</SelectItem>
            <SelectItem value="thoughtId">Thought ID</SelectItem>
            <SelectItem value="planId">Plan ID</SelectItem>
            <SelectItem value="taskId">Task ID</SelectItem>
          </SelectContent>
        </Select>

        {searchType && searchType !== 'all' && (
          <>
            <Input
              placeholder={`Enter ${searchType.replace('Id', ' ID')}...`}
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={!localValue.trim()}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

