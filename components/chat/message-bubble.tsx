'use client'

import { UIMessage } from 'ai'
import { cn } from '@/lib/utils'
import { BrainCircuit, User, Wrench, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface MessageBubbleProps {
  message: UIMessage
}

function getTextFromParts(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('')
}

type ToolPart = {
  type: 'tool-invocation'
  toolInvocationId: string
  toolName: string
  state: string
  input?: Record<string, unknown>
  output?: unknown
}

function ToolCallPart({ part }: { part: ToolPart }) {
  const [expanded, setExpanded] = useState(false)
  const isDone = part.state === 'output-available' || part.state === 'output-error'
  const isMemory = part.toolName === 'memory'

  const inputCmd =
    part.input && typeof part.input === 'object' && 'command' in part.input
      ? String(part.input.command)
      : part.toolName

  return (
    <button
      onClick={() => setExpanded((e) => !e)}
      className="w-full text-left"
    >
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cell-border bg-cell-surface text-xs font-mono text-muted-foreground hover:border-cell-accent/50 transition-colors">
        <Wrench className="w-3 h-3 shrink-0 text-cell-accent" />
        <span className="flex-1 truncate">
          {isMemory ? `memory.${inputCmd}` : part.toolName}
        </span>
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-[10px]',
            isDone
              ? 'bg-cell-accent/10 text-cell-accent'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {isDone ? 'done' : 'running'}
        </span>
        {expanded ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
      </div>
      {expanded && (
        <div className="mt-1 px-3 py-2 rounded-lg bg-cell-surface border border-cell-border text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
          {isDone && part.output
            ? typeof part.output === 'object'
              ? JSON.stringify(part.output, null, 2)
              : String(part.output)
            : JSON.stringify(part.input, null, 2)}
        </div>
      )}
    </button>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const text = getTextFromParts(message)

  const toolParts = (message.parts ?? []).filter(
    (p): p is ToolPart => p.type === 'tool-invocation'
  )

  return (
    <div
      className={cn(
        'flex gap-3 w-full',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border',
          isUser
            ? 'bg-cell-accent/10 border-cell-accent/30'
            : 'bg-cell-surface border-cell-border'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-cell-accent" />
        ) : (
          <BrainCircuit className="w-4 h-4 text-cell-accent" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Tool calls (assistant only) */}
        {!isUser && toolParts.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {toolParts.map((part) => (
              <ToolCallPart key={part.toolInvocationId} part={part} />
            ))}
          </div>
        )}

        {/* Text */}
        {text && (
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-sm leading-relaxed',
              isUser
                ? 'bg-cell-accent text-cell-accent-foreground rounded-tr-sm'
                : 'bg-cell-surface border border-cell-border text-foreground rounded-tl-sm'
            )}
          >
            <p className="whitespace-pre-wrap break-words">{text}</p>
          </div>
        )}
      </div>
    </div>
  )
}
