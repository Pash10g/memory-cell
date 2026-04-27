'use client'

import { BrainCircuit, Database, RotateCcw, User, Pencil, Check, X, Sun, Moon, Menu } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'

interface ChatHeaderProps {
  userId: string
  sessionId: string
  onUserChange: (newUser: string) => void
  onNewSession: () => void
  onMenuToggle?: () => void
}

export function ChatHeader({ userId, sessionId, onUserChange, onNewSession, onMenuToggle }: ChatHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(userId)
  const { theme, setTheme } = useTheme()

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== userId) {
      onUserChange(trimmed)
    }
    setEditing(false)
  }

  function cancelEdit() {
    setDraft(userId)
    setEditing(false)
  }

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-cell-border bg-cell-surface/50">
      {/* Left: hamburger (mobile) + logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile sidebar toggle */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-cell-accent transition-colors shrink-0"
            aria-label="Toggle sessions sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="w-8 h-8 rounded-lg bg-cell-accent/10 border border-cell-accent/30 flex items-center justify-center shrink-0">
          <BrainCircuit className="w-4 h-4 text-cell-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold font-mono text-foreground">
            MemoryCell
          </p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            Powered by{' '}
            <a
              href="https://www.npmjs.com/package/@mongodb-developer/vercel-ai-memory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cell-accent hover:underline"
            >
              @mongodb-developer/vercel-ai-memory
            </a>
          </p>
        </div>
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title="Toggle theme"
          className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-cell-surface border border-cell-border hover:border-cell-accent/50 hover:text-cell-accent transition-colors"
          aria-label="Toggle dark/light mode"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </button>

        {/* User identity */}
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-cell-surface border border-cell-border">
          <User className="w-3 h-3 text-cell-accent shrink-0" />
          {editing ? (
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => { e.preventDefault(); commitEdit() }}
            >
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="w-16 sm:w-20 text-[11px] font-mono bg-transparent border-b border-cell-accent outline-none text-foreground"
                onKeyDown={(e) => { if (e.key === 'Escape') cancelEdit() }}
              />
              <button type="submit" className="text-emerald-400 hover:text-emerald-300">
                <Check className="w-3 h-3" />
              </button>
              <button type="button" onClick={cancelEdit} className="text-rose-400 hover:text-rose-300">
                <X className="w-3 h-3" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => { setDraft(userId); setEditing(true) }}
              className="flex items-center gap-1 group"
              title="Change user"
            >
              <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground transition-colors max-w-[60px] sm:max-w-[80px] truncate">
                {userId}
              </span>
              <Pencil className="w-2.5 h-2.5 text-muted-foreground/50 group-hover:text-cell-accent transition-colors" />
            </button>
          )}
        </div>

        {/* Session badge — hidden on very small screens */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cell-surface border border-cell-border" title={`Session: ${sessionId}`}>
          <Database className="w-3 h-3 text-cell-accent" />
          <span className="text-[10px] font-mono text-muted-foreground">
            {sessionId.slice(0, 8)}…
          </span>
        </div>

        {/* New session button */}
        <button
          onClick={onNewSession}
          title="Start new session"
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-cell-surface border border-cell-border hover:border-cell-accent/50 hover:text-cell-accent transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground hover:text-cell-accent">
            new session
          </span>
        </button>
      </div>
    </header>
  )
}
