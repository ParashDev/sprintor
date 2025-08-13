"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home, Users } from "lucide-react"

interface SessionInfo {
  sessionId: string
  sessionName: string
  userRole: 'host' | 'participant'
  joinedAt: string
}

interface SessionReconnectModalProps {
  sessionInfo: SessionInfo
  onReconnect: () => void
  onDiscard: () => void
}

export function SessionReconnectModal({ sessionInfo, onReconnect, onDiscard }: SessionReconnectModalProps) {
  const [isReconnecting, setIsReconnecting] = useState(false)
  const router = useRouter()

  const handleReconnect = async () => {
    setIsReconnecting(true)
    try {
      onReconnect()
    } catch (error) {
      console.error('Reconnection failed:', error)
      setIsReconnecting(false)
    }
  }

  const handleDiscard = () => {
    onDiscard()
    router.push('/join')
  }

  const formatJoinTime = (joinedAt: string) => {
    const date = new Date(joinedAt)
    return date.toLocaleString()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Session Reconnection</CardTitle>
            <CardDescription className="text-base mt-2">
              You were previously in a planning session
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="font-semibold text-sm">{sessionInfo.sessionName}</div>
                <div className="text-xs text-muted-foreground">
                  {sessionInfo.userRole === 'host' ? 'You are the host' : 'You are a participant'}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2">
              <strong>Session ID:</strong> {sessionInfo.sessionId}<br />
              <strong>Joined:</strong> {formatJoinTime(sessionInfo.joinedAt)}
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Would you like to rejoin this session or start fresh?
          </div>

          <div className="grid gap-3">
            <Button 
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="w-full h-12"
            >
              {isReconnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rejoin Session
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDiscard}
              className="w-full h-12"
              disabled={isReconnecting}
            >
              <Home className="h-4 w-4 mr-2" />
              Start Fresh
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            {sessionInfo.userRole === 'host' 
              ? 'As the host, your session is still active and waiting for you.'
              : 'Other participants may still be in the session.'
            }
          </div>
        </CardContent>
      </Card>
    </div>
  )
}