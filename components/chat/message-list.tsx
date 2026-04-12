'use client'

import { UIMessage } from 'ai'
import { useRef, useEffect } from 'react'
import { MessageBubble } from './message-bubble'
import { BrainCircuit } from 'lucide-react'

interface MessageListProps {
  messages: UIMessage[]
  status: string
}

export function MessageList({ messages, status }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-cell-surface border border-cell-border flex items-center justify-center">
          <BrainCircuit className="w-8 h-8 text-cell-accent" />
        </div>
        <div>
          <p className="text-lg font-semibold font-mono text-foreground">
            MemoryCell
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            An AI assistant that remembers everything. Ask me anything — I
            recall past conversations, notes, and context automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {[
            'What do you know about me?',
            'Remember that I prefer dark mode',
            'What did we talk about yesterday?',
          ].map((suggestion) => (
            <span
              key={suggestion}
              className="text-xs px-3 py-1.5 rounded-full border border-cell-border bg-cell-surface text-muted-foreground font-mono"
            >
              {suggestion}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-6 overflow-y-auto">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {(status === 'submitted' || status === 'streaming') && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm px-2">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cell-accent animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-cell-accent animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-cell-accent animate-bounce [animation-delay:300ms]" />
          </span>
          <span className="font-mono text-xs">thinking</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
