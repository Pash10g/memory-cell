'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { History, Shield } from 'lucide-react'
import { SessionSidebar } from '@/components/chat/session-sidebar'
import { ThreatStats } from './threat-stats'

interface ThreatSidebarProps {
  userId: string
  activeSessionId: string
  onSelectSession: (sessionId: string) => void
  sidebarKey: number
}

export function ThreatSidebar({
  userId,
  activeSessionId,
  onSelectSession,
  sidebarKey,
}: ThreatSidebarProps) {
  const [activeTab, setActiveTab] = useState<string>('intel')

  return (
    <aside className="h-full w-full flex flex-col bg-cell-surface/80 backdrop-blur-sm sm:bg-cell-surface/30 overflow-hidden border-r border-cell-border">
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col h-full"
      >
        <TabsList className="w-full grid grid-cols-2 gap-0 p-1 bg-cell-surface border-b border-cell-border rounded-none h-auto">
          <TabsTrigger
            value="intel"
            className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-mono data-[state=active]:bg-cell-accent/10 data-[state=active]:text-cell-accent rounded-md"
          >
            <Shield className="w-3 h-3" />
            Intel
          </TabsTrigger>
          <TabsTrigger
            value="sessions"
            className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-mono data-[state=active]:bg-cell-accent/10 data-[state=active]:text-cell-accent rounded-md"
          >
            <History className="w-3 h-3" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intel" className="flex-1 overflow-hidden m-0">
          <div className="h-full overflow-y-auto">
            <ThreatStats />
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="flex-1 overflow-hidden m-0">
          <SessionSidebar
            key={sidebarKey}
            userId={userId}
            activeSessionId={activeSessionId}
            onSelectSession={onSelectSession}
          />
        </TabsContent>
      </Tabs>
    </aside>
  )
}
