'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { ChatHeader } from '@/components/chat/chat-header'

export function ChatInterface() {
  const { messages, sendMessage, stop, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageList messages={messages} status={status} />
        <ChatInput
          onSend={(text) => sendMessage({ text })}
          onStop={stop}
          status={status}
        />
      </div>
    </div>
  )
}
