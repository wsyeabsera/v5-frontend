'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Command } from 'cmdk'
import { Home, MessageSquare, Settings, Moon, Sun, Search } from 'lucide-react'

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { setTheme, theme } = useTheme()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command Menu"
        className={`fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 animate-fade-in ${
          open ? '' : 'hidden'
        }`}
      >
        <div className="overflow-hidden rounded-lg border border-border/40 dark:border-border/20 bg-popover/95 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center border-b border-border/40 dark:border-border/20 px-3">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-40" />
            <Command.Input
              placeholder="Type a command or search..."
              className="flex h-10 w-full bg-transparent py-3 text-[13px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Command.List className="max-h-[320px] overflow-y-auto p-1.5">
            <Command.Empty className="py-6 text-center text-[13px] text-muted-foreground">
              No results found
            </Command.Empty>

            <Command.Group className="mb-1">
              <div className="px-2 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">
                Navigate
              </div>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/'))}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <Home className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </div>
                <kbd className="hidden md:inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">⌘1</kbd>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/chat'))}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat</span>
                </div>
                <kbd className="hidden md:inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">⌘2</kbd>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push('/settings'))}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </div>
                <kbd className="hidden md:inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono">⌘3</kbd>
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border/40 dark:bg-border/20" />

            <Command.Group>
              <div className="px-2 py-1.5 text-[10px] uppercase font-semibold text-muted-foreground/70 tracking-wider">
                Appearance
              </div>
              <Command.Item
                onSelect={() => runCommand(() => setTheme('light'))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <Sun className="h-3.5 w-3.5" />
                <span>Light Mode</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setTheme('dark'))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <Moon className="h-3.5 w-3.5" />
                <span>Dark Mode</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setTheme('system'))}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] hover:bg-accent/10 aria-selected:bg-accent/10"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>System Theme</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
          <div className="border-t border-border/40 dark:border-border/20 bg-muted/30 dark:bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
            <kbd className="rounded bg-background/60 px-1.5 py-0.5 font-mono">⌘K</kbd> to toggle
          </div>
        </div>
      </Command.Dialog>
    </>
  )
}

