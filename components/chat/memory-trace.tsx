'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Database, Search, BookOpen, FilePlus, List, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ToolPart } from './message-bubble'

interface MemoryTraceProps {
  toolParts: ToolPart[]
}

const COMMAND_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  // Actual command names from tool.ts
  core_read:            { icon: BookOpen,  label: 'Read core',         color: 'text-sky-400' },
  core_update:          { icon: Database,  label: 'Updated core',      color: 'text-emerald-400' },
  core_append:          { icon: Database,  label: 'Appended to core',  color: 'text-emerald-400' },
  note_add:             { icon: FilePlus,  label: 'Saved note',        color: 'text-emerald-400' },
  note_search:          { icon: Search,    label: 'Searched notes',    color: 'text-amber-400' },
  conversation_search:  { icon: Search,    label: 'Searched history',  color: 'text-amber-400' },
  conversation_recent:  { icon: List,      label: 'Recent history',    color: 'text-sky-400' },
}

function getEffectiveInput(part: ToolPart): Record<string, unknown> {
  return part.input ?? part.rawInput ?? {}
}

function getCommandMeta(part: ToolPart) {
  const inp = getEffectiveInput(part)
  const cmd = 'command' in inp ? String(inp.command) : ''
  return COMMAND_META[cmd] ?? { icon: Database, label: cmd || part.type.replace('tool-', ''), color: 'text-muted-foreground' }
}

function outputSummary(part: ToolPart): string {
  if (part.state === 'output-error') {
    // Extract just the first line of the error, not the full Zod dump
    const msg = part.errorText ?? 'error'
    return msg.split('\n')[0].replace('Invalid input for tool memory: ', '').slice(0, 80)
  }
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

  // Deduplicate icon strip — show unique commands in call order
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
