'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, KeyRound, ExternalLink } from 'lucide-react'
import { ChatInterface } from '@/components/chat/chat-interface'

interface AccessGateProps {
  onAccessGranted: () => void
}

export function AccessGateWrapper() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const access = sessionStorage.getItem('memory-cell-access')
    setHasAccess(access === 'granted')
  }, [])

  if (hasAccess === null) return null
  if (hasAccess) return <ChatInterface />
  return <AccessGate onAccessGranted={() => setHasAccess(true)} />
}

export function AccessGate({ onAccessGranted }: AccessGateProps) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/verify-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })

      if (response.ok) {
        sessionStorage.setItem('memory-cell-access', 'granted')
        onAccessGranted()
      } else {
        const data = await response.json()
        setError(data.error || 'Invalid access code')
      }
    } catch {
      setError('Failed to verify access code')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-cell-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-semibold text-foreground">
            MemoryCell
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your access code to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Enter access code"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="bg-secondary/50 border-cell-border focus:border-primary"
                disabled={isLoading}
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passcode.trim()}
            >
              {isLoading ? 'Verifying...' : 'Access MemoryCell'}
            </Button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-cell-border">
            <p className="text-sm text-muted-foreground text-center">
              Need an access code?{' '}
              <a
                href="https://github.com/Pash10g/memory-cell/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Request one on GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
