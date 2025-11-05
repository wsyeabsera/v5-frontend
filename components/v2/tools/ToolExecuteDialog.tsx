'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { JsonViewer } from '@/components/ui/json-viewer'
import { useExecuteTool } from '@/lib/queries-v2'
import { Loader2 } from 'lucide-react'

interface ToolExecuteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tool: {
    name: string
    description?: string
    inputSchema?: any
  } | null
}

function renderField(
  schema: any,
  name: string,
  value: any,
  onChange: (value: any) => void,
  required: boolean = false
) {
  const fieldType = schema.type || 'string'
  const description = schema.description || ''

  if (fieldType === 'boolean') {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {name} {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={value === undefined ? '' : String(value)} onValueChange={(val) => onChange(val === 'true')}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    )
  }

  if (schema.enum) {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {name} {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {schema.enum.map((option: any) => (
              <SelectItem key={String(option)} value={String(option)}>
                {String(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    )
  }

  if (fieldType === 'object' && schema.properties) {
    return (
      <div className="space-y-2">
        <Label>{name} {required && <span className="text-red-500">*</span>}</Label>
        <div className="rounded-md border p-4 space-y-3">
          {Object.entries(schema.properties).map(([propName, propSchema]: [string, any]) => {
            const isRequired = schema.required?.includes(propName) || false
            return (
              <div key={propName}>
                {renderField(
                  propSchema,
                  propName,
                  value?.[propName],
                  (val) => onChange({ ...value, [propName]: val }),
                  isRequired
                )}
              </div>
            )
          })}
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    )
  }

  if (fieldType === 'array') {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {name} {required && <span className="text-red-500">*</span>}
        </Label>
        <Textarea
          id={name}
          placeholder="Enter JSON array, e.g., [&quot;item1&quot;, &quot;item2&quot;]"
          value={value ? JSON.stringify(value) : ''}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value)
              onChange(Array.isArray(parsed) ? parsed : [parsed])
            } catch {
              onChange(e.target.value)
            }
          }}
          rows={3}
        />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    )
  }

  if (fieldType === 'number' || fieldType === 'integer') {
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>
          {name} {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id={name}
          type="number"
          value={value || ''}
          onChange={(e) => onChange(fieldType === 'integer' ? parseInt(e.target.value) : parseFloat(e.target.value))}
        />
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    )
  }

  // Default to text input
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {name} {required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={description}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

export function ToolExecuteDialog({ open, onOpenChange, tool }: ToolExecuteDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [result, setResult] = useState<any>(null)
  const executeMutation = useExecuteTool()

  useEffect(() => {
    if (open && tool) {
      setFormData({})
      setResult(null)
    }
  }, [open, tool])

  const handleExecute = async () => {
    if (!tool) return

    // Validate required fields
    const required = tool.inputSchema?.required || []
    const missing = required.filter((field: string) => formData[field] === undefined || formData[field] === '')
    if (missing.length > 0) {
      alert(`Missing required fields: ${missing.join(', ')}`)
      return
    }

    try {
      const response = await executeMutation.mutateAsync({
        toolName: tool.name,
        arguments: formData,
      })
      setResult(response)
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
      console.error('Failed to execute tool:', error)
    }
  }

  if (!tool) return null

  const schema = tool.inputSchema || {}
  const properties = schema.properties || {}
  const required = schema.required || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Execute Tool: {tool.name}</DialogTitle>
          <DialogDescription>{tool.description || 'Execute this tool with the provided parameters'}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {Object.keys(properties).length === 0 ? (
              <p className="text-sm text-muted-foreground">This tool requires no parameters.</p>
            ) : (
              Object.entries(properties).map(([fieldName, fieldSchema]: [string, any]) => {
                const isRequired = required.includes(fieldName)
                return (
                  <div key={fieldName}>
                    {renderField(
                      fieldSchema,
                      fieldName,
                      formData[fieldName],
                      (value) => setFormData({ ...formData, [fieldName]: value }),
                      isRequired
                    )}
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>

        {result && (
          <div className="space-y-2">
            <Label>Result</Label>
            {result.error ? (
              <div className="rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 p-4">
                <p className="text-sm text-red-600 dark:text-red-400 font-semibold">Error</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{result.error}</p>
              </div>
            ) : (
              <JsonViewer
                data={result}
                maxHeight="400px"
                collapsible={true}
                defaultExpanded={false}
                searchable={true}
                showCopyButton={true}
              />
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={executeMutation.isPending}>
            Close
          </Button>
          <Button onClick={handleExecute} disabled={executeMutation.isPending}>
            {executeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

