'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (text: string) => void
  onStop: () => void
  status: string
}

export function ChatInput({ onSend, onStop, status }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = status === 'streaming' || status === 'submitted'

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="relative flex items-end gap-2 rounded-2xl border border-cell-border bg-cell-surface px-4 py-3 focus-within:border-cell-accent/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Send a message..."
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed font-sans"
          style={{ maxHeight: '200px' }}
        />
        <button
          onClick={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && !value.trim()}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
            isStreaming
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
              : value.trim()
              ? 'bg-cell-accent text-cell-accent-foreground hover:bg-cell-accent/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
          aria-label={isStreaming ? 'Stop generation' : 'Send message'}
        >
          {isStreaming ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-2 font-mono">
        MemoryCell remembers across sessions via MongoDB + Voyage AI
      </p>
    </div>
  )
}
