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

// ─── Session persistence helpers ───────────────────────────────────────────────
// We store a single "current sessionId" per userId in localStorage so the same
// thread is reused across page reloads / remounts. Without this, every reload
// generates a fresh sessionId and each subsequent user turn ends up in a new
// sidebar thread — sessions should be grouped by sessionId, not per response.
const SESSION_KEY_PREFIX = 'memory-cell:currentSessionId:'
const USER_KEY = 'memory-cell:currentUser'

function loadStoredUser(): string {
  if (typeof window === 'undefined') return 'default'
  return window.localStorage.getItem(USER_KEY) || 'default'
}

function storeUser(userId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(USER_KEY, userId)
  } catch {
    /* quota / privacy mode — ignore */
  }
}

function loadOrCreateSessionId(userId: string): string {
  if (typeof window === 'undefined') return newSessionId()
  const key = SESSION_KEY_PREFIX + userId
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const fresh = newSessionId()
  try {
    window.localStorage.setItem(key, fresh)
  } catch {
    /* ignore */
  }
  return fresh
}

function storeSessionId(userId: string, sessionId: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_KEY_PREFIX + userId, sessionId)
  } catch {
    /* ignore */
  }
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

  // Hydrate from localStorage on first client render. This pins both the user
  // and the "current sessionId" so page reloads resume the same thread instead
  // of spawning a new one per reload (which is why the sidebar was showing a
  // separate entry for each turn).
  useEffect(() => {
    const storedUser = loadStoredUser()
    const sid = loadOrCreateSessionId(storedUser)
    setUserId(storedUser)
    setSessionId(sid)
    // Pre-load any already-persisted messages for that session so a reload of
    // an in-progress conversation shows the full history.
    ;(async () => {
      try {
        const res = await fetch(
          `/api/sessions/${encodeURIComponent(sid)}/messages?userId=${encodeURIComponent(storedUser)}`
        )
        if (res.ok) {
          const msgs = await res.json()
          if (Array.isArray(msgs) && msgs.length > 0) setInitialMessages(msgs)
        }
      } catch {
        /* ignore — empty thread */
      }
    })()
  }, [])

  const handleNewSession = useCallback(() => {
    const fresh = newSessionId()
    setInitialMessages([])
    setSessionId(fresh)
    storeSessionId(userId, fresh)
    setSidebarKey((k) => k + 1)
  }, [userId])

  const handleUserChange = useCallback((newUser: string) => {
    setUserId(newUser)
    storeUser(newUser)
    setInitialMessages([])
    const sid = loadOrCreateSessionId(newUser)
    setSessionId(sid)
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
      storeSessionId(userId, selectedId)
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
