'use client'

import { UIMessage, ToolUIPart } from 'ai'
import { cn } from '@/lib/utils'
import { ShieldAlert, User } from 'lucide-react'
import { MemoryTrace } from './memory-trace'

interface MessageBubbleProps {
  message: UIMessage
}

function getTextFromParts(message: UIMessage): string {
  if (!message.parts || !Array.isArray(message.parts)) return ''
  // Use only the LAST text part to avoid duplicates across multi-step ToolLoopAgent turns
  const textParts = message.parts.filter(
    (p): p is { type: 'text'; text: string } => p.type === 'text'
  )
  if (textParts.length === 0) return ''
  return textParts[textParts.length - 1].text
}

// Re-export the SDK's ToolUIPart so memory-trace.tsx can import from here
export type { ToolUIPart }

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const text = getTextFromParts(message)

  const toolParts = (message.parts ?? []).filter(
    (p): p is ToolUIPart => typeof p.type === 'string' && p.type.startsWith('tool-')
  ) as ToolUIPart[]

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
          <ShieldAlert className="w-4 h-4 text-cell-accent" />
        )}
      </div>

      {/* Bubble + trace */}
      <div
        className={cn(
          'flex flex-col gap-2 max-w-[85%] sm:max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
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

        {/* Memory trace (assistant only) */}
        {!isUser && toolParts.length > 0 && (
          <MemoryTrace toolParts={toolParts} />
        )}
      </div>
    </div>
  )
}

