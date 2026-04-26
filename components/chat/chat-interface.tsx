'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, UIMessage } from 'ai'
import { useState, useCallback, useEffect } from 'react'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatHeader } from '@/components/chat/chat-header'
import { SessionSidebar } from '@/components/chat/session-sidebar'

function newSessionId() {
  return typeof crypto !== 'undefined'
    ? crypto.randomUUID()
    : `session-${Date.now()}`
}

// ─── Inner component: owns useChat scoped to the current sessionId ─────────────
// key={sessionId} on this component forces a fresh useChat whenever session changes
function ChatSession({
  userId,
  sessionId,
  initialMessages,
  onSidebarRefresh,
}: {
  userId: string
  sessionId: string
  initialMessages: UIMessage[]
  onSidebarRefresh: () => void
}) {
  const { messages, sendMessage, stop, status, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: { userId, sessionId },
    }),
  })

  // Populate from DB when resuming a stored session
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages)
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} status={status} />
      <ChatInput
        onSend={(text) => {
          sendMessage({ text })
          setTimeout(onSidebarRefresh, 2000)
        }}
        onStop={stop}
        status={status}
      />
    </div>
  )
}

// ─── Outer component: all state + session/user switching ──────────────────────
export function ChatInterface() {
  const [userId, setUserId] = useState<string>('default')
  // Empty on server to avoid hydration mismatch; set on first client effect
  const [sessionId, setSessionId] = useState<string>('')
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [sidebarKey, setSidebarKey] = useState(0)

  useEffect(() => {
    setSessionId(newSessionId())
  }, [])

  const handleNewSession = useCallback(() => {
    setInitialMessages([])
    setSessionId(newSessionId())
  }, [])

  const handleUserChange = useCallback((newUser: string) => {
    setUserId(newUser)
    setInitialMessages([])
    setSessionId(newSessionId())
    setSidebarKey((k) => k + 1)
  }, [])

  // Fetch stored messages FIRST, then switch to the selected session
  const handleSelectSession = useCallback(
    async (selectedId: string) => {
      if (!selectedId) return
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(selectedId)}/messages?userId=${encodeURIComponent(userId)}`
        )
        if (res.ok) {
          setInitialMessages(await res.json())
        } else {
          setInitialMessages([])
        }
      } catch {
        setInitialMessages([])
      }
      // Change sessionId AFTER messages are loaded — triggers ChatSession remount
      setSessionId(selectedId)
    },
    [userId]
  )

  const handleSidebarRefresh = useCallback(() => {
    setSidebarKey((k) => k + 1)
  }, [])

  // Don't render until sessionId is ready (avoids '' being sent to API)
  if (!sessionId) return null

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader
        userId={userId}
        sessionId={sessionId}
        onUserChange={handleUserChange}
        onNewSession={handleNewSession}
      />
      <div className="flex flex-1 overflow-hidden">
        <SessionSidebar
          key={sidebarKey}
          userId={userId}
          activeSessionId={sessionId}
          onSelectSession={handleSelectSession}
        />
        <ChatSession
          key={sessionId}
          userId={userId}
          sessionId={sessionId}
          initialMessages={initialMessages}
          onSidebarRefresh={handleSidebarRefresh}
        />
      </div>
    </div>
  )
}
