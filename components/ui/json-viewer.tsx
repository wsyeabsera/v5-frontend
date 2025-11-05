'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, ChevronRight, ChevronDown, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface JsonViewerProps {
  data: any
  collapsible?: boolean
  showLineNumbers?: boolean
  showCopyButton?: boolean
  maxHeight?: string
  defaultExpanded?: boolean
  searchable?: boolean
  className?: string
}

interface JsonNodeProps {
  value: any
  keyName?: string
  level?: number
  path?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  expandedPaths?: Set<string>
  onTogglePath?: (path: string) => void
  searchQuery?: string
}

function JsonNode({
  value,
  keyName,
  level = 0,
  path = '',
  collapsible = true,
  defaultExpanded = true,
  expandedPaths,
  onTogglePath,
  searchQuery = '',
}: JsonNodeProps) {
  const nodePath = keyName ? (path ? `${path}.${keyName}` : keyName) : path
  const isExpanded = expandedPaths ? expandedPaths.has(nodePath) : defaultExpanded
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded)

  const effectiveExpanded = expandedPaths ? isExpanded : localExpanded

  const toggle = () => {
    if (expandedPaths && onTogglePath) {
      onTogglePath(nodePath)
    } else {
      setLocalExpanded(!localExpanded)
    }
  }

  const indent = level * 20

  // Handle null
  if (value === null) {
    return (
      <span className="text-purple-600 dark:text-purple-400 font-medium">null</span>
    )
  }

  // Handle undefined
  if (value === undefined) {
    return (
      <span className="text-gray-500 dark:text-gray-400 italic">undefined</span>
    )
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return (
      <span className="text-blue-600 dark:text-blue-400 font-medium">
        {value.toString()}
      </span>
    )
  }

  // Handle number
  if (typeof value === 'number') {
    return (
      <span className="text-cyan-600 dark:text-cyan-400 font-medium">{value}</span>
    )
  }

  // Handle string
  if (typeof value === 'string') {
    // Check if it's a valid JSON string that should be parsed
    if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(value)
        return (
          <div className="inline-block">
            <JsonNode
              value={parsed}
              level={level}
              path={path}
              collapsible={collapsible}
              defaultExpanded={defaultExpanded}
              expandedPaths={expandedPaths}
              onTogglePath={onTogglePath}
              searchQuery={searchQuery}
            />
          </div>
        )
      } catch {
        // Not valid JSON, render as string
      }
    }

    return (
      <span className="text-green-600 dark:text-green-400">
        &quot;{value.replace(/"/g, '\\"')}&quot;
      </span>
    )
  }

  // Handle array
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span>
          <span className="text-muted-foreground">[</span>
          <span className="text-muted-foreground">]</span>
        </span>
      )
    }

    const shouldShow = !collapsible || effectiveExpanded

    return (
      <div className="flex flex-col">
        <div className="inline-flex items-center gap-1">
          {collapsible && (
            <button
              onClick={toggle}
              className="hover:bg-muted rounded p-0.5 transition-colors"
              aria-label={effectiveExpanded ? 'Collapse' : 'Expand'}
            >
              {effectiveExpanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          )}
          <span className="text-muted-foreground">[</span>
          <Badge variant="outline" className="text-xs ml-1">
            {value.length}
          </Badge>
          {!shouldShow && (
            <>
              <span className="text-muted-foreground">...</span>
              <span className="text-muted-foreground">]</span>
            </>
          )}
        </div>

        {shouldShow && (
          <>
            <div className="ml-6 mt-1 space-y-1">
              {value.map((item, index) => {
                const itemPath = `${nodePath}[${index}]`
                const matchesSearch = searchQuery
                  ? JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase())
                  : true

                if (!matchesSearch) return null

                return (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-muted-foreground text-sm font-mono flex-shrink-0">
                      {index}:
                    </span>
                    <div className="flex-1 min-w-0">
                      <JsonNode
                        value={item}
                        level={level + 1}
                        path={itemPath}
                        collapsible={collapsible}
                        defaultExpanded={defaultExpanded}
                        expandedPaths={expandedPaths}
                        onTogglePath={onTogglePath}
                        searchQuery={searchQuery}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div>
              <span className="text-muted-foreground">]</span>
            </div>
          </>
        )}
      </div>
    )
  }

  // Handle object
  if (typeof value === 'object') {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return (
        <span>
          <span className="text-muted-foreground">{'{'}</span>
          <span className="text-muted-foreground">{'}'}</span>
        </span>
      )
    }

    const shouldShow = !collapsible || effectiveExpanded

    return (
      <div className="flex flex-col">
        <div className="inline-flex items-center gap-1">
          {collapsible && (
            <button
              onClick={toggle}
              className="hover:bg-muted rounded p-0.5 transition-colors"
              aria-label={effectiveExpanded ? 'Collapse' : 'Expand'}
            >
              {effectiveExpanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          )}
          <span className="text-muted-foreground">{'{'}</span>
          <Badge variant="outline" className="text-xs ml-1">
            {keys.length}
          </Badge>
          {!shouldShow && (
            <>
              <span className="text-muted-foreground">...</span>
              <span className="text-muted-foreground">{'}'}</span>
            </>
          )}
        </div>

        {shouldShow && (
          <>
            <div className="ml-6 mt-1 space-y-1">
              {keys.map((key) => {
                const itemPath = `${nodePath}.${key}`
                const itemValue = value[key]
                const matchesSearch = searchQuery
                  ? key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    JSON.stringify(itemValue).toLowerCase().includes(searchQuery.toLowerCase())
                  : true

                if (!matchesSearch) return null

                return (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold font-mono">
                      &quot;{key}&quot;:
                    </span>
                    <div className="flex-1 min-w-0">
                      <JsonNode
                        value={itemValue}
                        keyName={key}
                        level={level + 1}
                        path={nodePath}
                        collapsible={collapsible}
                        defaultExpanded={defaultExpanded}
                        expandedPaths={expandedPaths}
                        onTogglePath={onTogglePath}
                        searchQuery={searchQuery}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div>
              <span className="text-muted-foreground">{'}'}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  return <span>{String(value)}</span>
}

export function JsonViewer({
  data,
  collapsible = true,
  showLineNumbers = false,
  showCopyButton = true,
  maxHeight = '500px',
  defaultExpanded = false,
  searchable = false,
  className,
}: JsonViewerProps) {
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())

  const handleCopy = async () => {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  // Determine if data is JSON-like
  const parsedData = useMemo(() => {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return data
  }, [data])

  const isJsonObject = typeof parsedData === 'object' && parsedData !== null

  // Calculate ScrollArea height (subtract toolbar ~60px)
  const scrollAreaHeight = `calc(${maxHeight} - 60px)`

  return (
    <div className={cn('border rounded-lg bg-muted/30 overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-muted/50">
        <div className="flex items-center gap-2 flex-1">
          {isJsonObject && (
            <Badge variant="outline" className="text-xs">
              {Array.isArray(parsedData) ? 'Array' : 'Object'}
              {Array.isArray(parsedData)
                ? `[${parsedData.length}]`
                : `{${Object.keys(parsedData).length}}`}
            </Badge>
          )}
          {searchable && (
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}
        </div>
        {showCopyButton && (
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea style={{ height: scrollAreaHeight, maxHeight: scrollAreaHeight }}>
        <div className="p-4 font-mono text-sm leading-relaxed">
          {isJsonObject ? (
            <JsonNode
              value={parsedData}
              collapsible={collapsible}
              defaultExpanded={defaultExpanded}
              expandedPaths={expandedPaths}
              onTogglePath={togglePath}
              searchQuery={searchQuery}
            />
          ) : (
            <div className="whitespace-pre-wrap break-words">
              {typeof parsedData === 'string' ? (
                <span className="text-foreground">{parsedData}</span>
              ) : (
                <span>{JSON.stringify(parsedData, null, 2)}</span>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
