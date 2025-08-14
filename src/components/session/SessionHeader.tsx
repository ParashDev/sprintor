"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Moon, 
  Sun, 
  LogOut, 
  Copy,
  Check
} from "lucide-react"
import { useTheme } from "next-themes"
import { endSession, leaveSession } from "@/lib/session-service"
import type { Session } from "@/types/session"

interface SessionHeaderProps {
  session: Session
  isHost: boolean
  currentUserId: string
}

export function SessionHeader({ session, isHost, currentUserId }: SessionHeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [isEndingSession, setIsEndingSession] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false)
  const [showLeaveSessionDialog, setShowLeaveSessionDialog] = useState(false)
  const [isLeavingSession, setIsLeavingSession] = useState(false)

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(session.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy room code:', error)
    }
  }

  const handleLeaveSession = () => {
    setShowLeaveSessionDialog(true)
  }

  const confirmLeaveSession = async () => {
    setIsLeavingSession(true)
    try {
      await leaveSession(session.id, currentUserId)
      // Clear ALL user session data for clean restart
      localStorage.removeItem('sprintor_current_session')
      localStorage.removeItem('sprintor_user_id')
      localStorage.removeItem('sprintor_user_name')
      setShowLeaveSessionDialog(false)
      router.push('/')
    } catch (error) {
      console.error('Error leaving session:', error)
      // Still navigate away and clear all data even if the leave call fails
      localStorage.removeItem('sprintor_current_session')
      localStorage.removeItem('sprintor_user_id')
      localStorage.removeItem('sprintor_user_name')
      setShowLeaveSessionDialog(false)
      router.push('/')
    } finally {
      setIsLeavingSession(false)
    }
  }

  const handleEndSession = () => {
    if (!isHost) return
    setShowEndSessionDialog(true)
  }

  const confirmEndSession = async () => {
    setIsEndingSession(true)
    try {
      await endSession(session.id)
      // Clear ALL user session data for clean restart
      localStorage.removeItem('sprintor_current_session')
      localStorage.removeItem('sprintor_user_id')
      localStorage.removeItem('sprintor_user_name')
      setShowEndSessionDialog(false)
      router.push('/')
    } catch (error) {
      console.error('Error ending session:', error)
      alert('Failed to end session. Please try again.')
    } finally {
      setIsEndingSession(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Session Info */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                SP
              </div>
              <span className="text-xl font-bold hidden sm:block">Sprintor</span>
            </Link>
            
            {/* Session ID next to logo */}
            <div className="flex items-center gap-1 pl-3 border-l">
              <button
                onClick={handleCopyRoomCode}
                className="flex items-center gap-1 text-sm font-mono bg-muted hover:bg-muted/80 px-2 py-1 rounded transition-colors"
              >
                {session.id}
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
            
            {/* Participant count - desktop only */}
            <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {session.participants.filter(p => p.isOnline).length} online
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-9 w-9"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Session Controls */}
            <div className="flex items-center gap-1 ml-2 pl-2 border-l">
              {isHost ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleEndSession}
                  disabled={isEndingSession}
                  className="h-9 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{isEndingSession ? 'Ending...' : 'End Session'}</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveSession}
                  disabled={isLeavingSession}
                  className="h-9 gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{isLeavingSession ? 'Leaving...' : 'Leave'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* End Session Confirmation Dialog */}
      <Dialog open={showEndSessionDialog} onOpenChange={setShowEndSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this session? This will mark the session as inactive and participants will no longer be able to join or vote. All participants will be redirected to the home page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEndSessionDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmEndSession} disabled={isEndingSession}>
              {isEndingSession ? 'Ending...' : 'End Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Session Confirmation Dialog */}
      <Dialog open={showLeaveSessionDialog} onOpenChange={setShowLeaveSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this session? You can rejoin later using the room code if the session is still active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLeaveSessionDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmLeaveSession} disabled={isLeavingSession}>
              {isLeavingSession ? 'Leaving...' : 'Leave Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}