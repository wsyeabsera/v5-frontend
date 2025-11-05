'use client'

interface PromptFiltersProps {
  filters?: { source?: 'local' | 'remote' | 'all' }
  onFiltersChange?: (filters: { source?: 'local' | 'remote' | 'all' }) => void
}

// PromptFilters component - source filter removed since tabs handle separation
// This component is kept for potential future filters
export function PromptFilters({ filters, onFiltersChange }: PromptFiltersProps) {
  // No filters available - tabs handle source separation
  return null
}

