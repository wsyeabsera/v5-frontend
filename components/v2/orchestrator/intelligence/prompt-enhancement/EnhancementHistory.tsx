'use client'

import { useMemo, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface EnhancementHistoryProps {
  phaseFilter: string
  onSelect: (enhancement: any) => void
}

const STORAGE_KEY = 'prompt-enhancement-history'

export function EnhancementHistory({ phaseFilter, onSelect }: EnhancementHistoryProps) {
  const [history, setHistory] = useState<any[]>([])
  const { toast } = useToast()

  // Load history from localStorage (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const loadHistory = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setHistory(Array.isArray(parsed) ? parsed : [])
        }
      } catch (error) {
        console.error('Failed to load enhancement history:', error)
        setHistory([])
      }
    }

    loadHistory()
    
    // Listen for storage changes (from other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadHistory()
      }
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom events (same tab updates)
    const handleCustomStorage = () => {
      loadHistory()
    }
    window.addEventListener('prompt-enhancement-updated', handleCustomStorage)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('prompt-enhancement-updated', handleCustomStorage)
    }
  }, [])

  const filtered = useMemo(() => {
    return history.filter((enhancement: any) => {
      if (phaseFilter !== 'all') {
        return enhancement.phase === phaseFilter
      }
      return true
    })
  }, [history, phaseFilter])

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined') return
    try {
      const updated = history.filter((h: any) => h.id !== id)
      setHistory(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      toast({
        title: 'Deleted',
        description: 'Enhancement removed from history',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete enhancement',
        variant: 'destructive',
      })
    }
  }

  const handleClearAll = () => {
    if (typeof window === 'undefined') return
    try {
      setHistory([])
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]))
      toast({
        title: 'Cleared',
        description: 'All enhancements removed from history',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear history',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {filtered.length} enhancement{filtered.length !== 1 ? 's' : ''} found
            {history.length !== filtered.length && (
              <span className="ml-2">
                (filtered from {history.length} total)
              </span>
            )}
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>
      <ScrollArea className="h-[600px]">
        <div className="space-y-4 pr-4">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <p>No enhancements found</p>
              <p className="text-xs mt-2">
                {history.length === 0
                  ? 'Use the "Test Enhancement" tab to enhance prompts'
                  : 'Try adjusting your phase filter'}
              </p>
            </div>
          ) : (
            filtered.map((enhancement: any) => (
              <Card
                key={enhancement.id}
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSelect(enhancement)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">
                        {enhancement.phase}
                      </Badge>
                      <Badge variant="outline">
                        {enhancement.originalLength} → {enhancement.enhancedLength} chars
                      </Badge>
                      {enhancement.orchestratorName && (
                        <Badge variant="secondary" className="text-xs">
                          {enhancement.orchestratorName}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium break-words line-clamp-2">{enhancement.userQuery}</p>
                    {enhancement.options && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {enhancement.options.includeFewShot && (
                          <span>Few-shot</span>
                        )}
                        {enhancement.options.includeContext && (
                          <span>Context</span>
                        )}
                        {enhancement.options.includeFewShot && enhancement.options.maxFewShotExamples && (
                          <span>({enhancement.options.maxFewShotExamples} examples)</span>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(enhancement.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={(e) => handleDelete(enhancement.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

