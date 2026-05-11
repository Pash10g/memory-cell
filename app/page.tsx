'use client'

import { useState, useEffect } from 'react'
import { ChatInterface } from '@/components/chat/chat-interface'
import { AccessGate } from '@/components/access-gate'

export default function Home() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const access = sessionStorage.getItem('memory-cell-access')
    setHasAccess(access === 'granted')
  }, [])

  // Show nothing while checking access status
  if (hasAccess === null) {
    return null
  }

  if (!hasAccess) {
    return <AccessGate onAccessGranted={() => setHasAccess(true)} />
  }

  return <ChatInterface />
}
