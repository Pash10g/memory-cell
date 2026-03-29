'use client'

import { BrainCircuit, Database } from 'lucide-react'

export function ChatHeader() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-cell-border bg-cell-surface/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cell-accent/10 border border-cell-accent/30 flex items-center justify-center">
          <BrainCircuit className="w-4 h-4 text-cell-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold font-mono text-foreground">
            MemoryCell
          </p>
          <p className="text-[10px] text-muted-foreground font-mono">
            Gemini 2.5 Flash &bull; MongoDB Atlas &bull; Voyage AI
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cell-surface border border-cell-border">
        <Database className="w-3 h-3 text-cell-accent" />
        <span className="text-[10px] font-mono text-muted-foreground">
          persistent memory
        </span>
      </div>
    </header>
  )
}
