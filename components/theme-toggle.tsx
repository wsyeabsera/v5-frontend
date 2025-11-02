'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`${collapsed ? 'px-2' : 'w-full justify-start px-3'}`}
      >
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  const isDark = theme === 'dark'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`${collapsed ? 'px-2' : 'w-full justify-start px-3'}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <Moon className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-xs">Dark</span>}
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          {!collapsed && <span className="ml-2 text-xs">Light</span>}
        </>
      )}
    </Button>
  )
}

