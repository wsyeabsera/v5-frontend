'use client'

import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  total: number
  limit: number
  skip: number
  hasMore: boolean
  onLoadMore?: () => void
  onPrevious?: () => void
  onNext?: () => void
  showLoadMore?: boolean
  className?: string
}

export function PaginationControls({
  total,
  limit,
  skip,
  hasMore,
  onLoadMore,
  onPrevious,
  onNext,
  showLoadMore = true,
  className = '',
}: PaginationControlsProps) {
  const currentPage = Math.floor(skip / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const showingFrom = skip + 1
  const showingTo = Math.min(skip + limit, total)

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="text-sm text-muted-foreground">
        Showing {showingFrom}-{showingTo} of {total}
      </div>
      <div className="flex items-center gap-2">
        {onPrevious && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={skip === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
        )}
        {showLoadMore && onLoadMore && hasMore && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
          >
            Load More
          </Button>
        )}
        {onNext && (
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasMore}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

