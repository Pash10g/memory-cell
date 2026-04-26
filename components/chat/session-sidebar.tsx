'use client'

import { useEffect, useState, useCallback } from 'react'
import { History, MessageSquare, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SessionEntry {
  sessionId: string
  firstAt: string
  lastAt: string
  messageCount: number
  preview: string
}

interface SessionSidebarProps {
  userId: string
  activeSessionId: string
  onSelectSession: (sessionId: string) => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupByDate(sessions: SessionEntry[]) {
  const groups: Record<string, SessionEntry[]> = {}
  for (const s of sessions) {
    const label = formatDate(s.lastAt)
    if (!groups[label]) groups[label] = []
    groups[label].push(s)
  }
  return groups
}

export function SessionSidebar({ userId, activeSessionId, onSelectSession }: SessionSidebarProps) {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSessions = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sessions?userId=${encodeURIComponent(userId)}`)
      if (res.ok) setSessions(await res.json())
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const grouped = groupByDate(sessions)

  return (
    <aside className="w-60 shrink-0 flex flex-col border-r border-cell-border bg-cell-surface/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-cell-border">
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-cell-accent" />
          <span className="text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
            Sessions
          </span>
        </div>
        <button
          onClick={fetchSessions}
          disabled={loading}
          className="text-muted-foreground hover:text-cell-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <MessageSquare className="w-6 h-6 text-muted-foreground/30" />
            <p className="text-[11px] font-mono text-muted-foreground/50">No sessions yet</p>
          </div>
        )}

        {Object.entries(grouped).map(([dateLabel, group]) => (
          <div key={dateLabel} className="mb-2">
            <p className="px-3 py-1 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">
              {dateLabel}
            </p>
            {group.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => onSelectSession(s.sessionId)}
                className={cn(
                  'w-full text-left px-3 py-2 flex flex-col gap-0.5 hover:bg-cell-surface transition-colors',
                  s.sessionId === activeSessionId && 'bg-cell-surface border-l-2 border-cell-accent'
                )}
              >
                <span className="text-[11px] font-mono text-foreground truncate leading-tight">
                  {s.preview || '(empty session)'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  {s.messageCount} turns · {s.sessionId.slice(0, 8)}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
