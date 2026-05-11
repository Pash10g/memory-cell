import { ChatInterface } from '@/components/chat/chat-interface'
import { AccessGateWrapper } from '@/components/access-gate'

export default function Home() {
  const passcodeRequired = !!process.env.PASSCODE

  if (passcodeRequired) {
    return <AccessGateWrapper />
  }

  return <ChatInterface />
}
