'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Search, BookOpen, FilePlus, List, AlertCircle, Clock, Zap, StickyNote } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolUIPart } from './message-bubble'

interface MemoryTraceProps {
  toolParts: ToolUIPart[]
}

const COMMAND_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  // Session memory
  session_append:       { icon: Clock,     label: 'Saved turn',          color: 'text-sky-400' },
  session_recent:       { icon: List,      label: 'Recent session',      color: 'text-sky-400' },
  // Semantic memory
  semantic_save:        { icon: Database,  label: 'Saved fact',          color: 'text-emerald-400' },
  semantic_search:      { icon: Search,    label: 'Searched facts',      color: 'text-amber-400' },
  // Procedural memory
  procedural_save:      { icon: FilePlus,  label: 'Saved procedure',     color: 'text-emerald-400' },
  procedural_search:    { icon: Search,    label: 'Searched procedures', color: 'text-amber-400' },
  // Episodic memory
  episodic_save:        { icon: BookOpen,  label: 'Saved episode',       color: 'text-purple-400' },
  episodic_search:      { icon: Search,    label: 'Searched episodes',   color: 'text-amber-400' },
  // Scratchpad
  scratchpad_write:     { icon: StickyNote, label: 'Scratch note',       color: 'text-yellow-400' },
  scratchpad_read:      { icon: StickyNote, label: 'Read scratch',       color: 'text-yellow-400' },
  scratchpad_promote:   { icon: Zap,       label: 'Promoted note',       color: 'text-purple-400' },
}

function getEffectiveInput(part: ToolUIPart): Record<string, unknown> {
  if (part.state === 'input-available' || part.state === 'output-available' || part.state === 'output-error') {
    return (part.input as Record<string, unknown>) ?? {}
  }
  return {}
}

function getCommandMeta(part: ToolUIPart) {
  const inp = getEffectiveInput(part)
  const cmd = 'command' in inp ? String(inp.command) : ''
  return COMMAND_META[cmd] ?? { icon: Database, label: cmd || part.type.replace('tool-', ''), color: 'text-muted-foreground' }
}

function outputSummary(part: ToolUIPart): string {
  if (part.state === 'output-error') {
    const msg = part.errorText ?? 'error'
    return msg.split('\n')[0].replace('Invalid input for tool memory: ', '').slice(0, 80)
  }
  if (part.state !== 'output-available') return 'running…'
  const output = part.output
  if (!output) return '—'
  if (typeof output === 'string') {
    const s = output.trim()
    return s.length > 80 ? s.slice(0, 80) + '…' : s || '—'
  }
  if (typeof output === 'object') {
    const o = output as Record<string, unknown>
    if ('output' in o && typeof o.output === 'string') {
      const s = o.output.trim()
      return s.length > 80 ? s.slice(0, 80) + '…' : s
    }
    if ('results' in o && Array.isArray(o.results)) return `${o.results.length} result(s)`
    return JSON.stringify(output).slice(0, 80)
  }
  return String(output)
}

export function MemoryTrace({ toolParts }: MemoryTraceProps) {
  const [open, setOpen] = useState(false)

  if (toolParts.length === 0) return null

  const icons = toolParts.map((p) => getCommandMeta(p))
  const totalOps = toolParts.length

  return (
    <div className="w-full mt-1">
      {/* Summary row — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 group select-none"
        aria-expanded={open}
      >
        {open
          ? <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          : <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        }
        {/* Icon strip */}
        <span className="flex items-center gap-1">
          {icons.map((meta, i) => {
            const Icon = meta.icon
            return (
              <span
                key={i}
                className={cn('transition-opacity', meta.color)}
                title={meta.label}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
            )
          })}
        </span>
        <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">
          {totalOps} memory {totalOps === 1 ? 'op' : 'ops'}
        </span>
      </button>

      {/* Expanded detail table */}
      {open && (
        <div className="mt-2 border-l-2 border-cell-border pl-4 flex flex-col gap-0.5">
          {toolParts.map((part, i) => {
            const meta = getCommandMeta(part)
            const Icon = meta.icon
            const isError = part.state === 'output-error'
            const isDone = part.state === 'output-available' || isError
            const summary = isDone ? outputSummary(part) : 'running…'

            return (
              <div
                key={part.toolCallId ?? i}
                className="flex items-center justify-between gap-4 py-1"
              >
                <span className={cn(
                  'flex items-center gap-1.5 text-[11px] font-mono shrink-0',
                  isError ? 'text-rose-400' : meta.color
                )}>
                  {isError ? <AlertCircle className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {meta.label}
                </span>
                <span className={cn(
                  'text-[11px] font-mono text-right truncate max-w-[220px]',
                  isError ? 'text-rose-400/70' : 'text-muted-foreground'
                )}>
                  {summary}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
