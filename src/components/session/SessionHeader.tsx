"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { 
  Moon, 
  Sun, 
  LogOut, 
  Settings,
  AlertTriangle,
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

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(session.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy room code:', error)
    }
  }

  const handleLeaveSession = async () => {
    // For now, keep the browser confirm but we can replace this with a proper dialog later
    if (confirm('Are you sure you want to leave this session?')) {
      try {
        await leaveSession(session.id, currentUserId)
        // Clear ALL user session data for clean restart
        localStorage.removeItem('sprintor_current_session')
        localStorage.removeItem('sprintor_user_id')
        localStorage.removeItem('sprintor_user_name')
        router.push('/')
      } catch (error) {
        console.error('Error leaving session:', error)
        // Still navigate away and clear all data even if the leave call fails
        localStorage.removeItem('sprintor_current_session')
        localStorage.removeItem('sprintor_user_id')
        localStorage.removeItem('sprintor_user_name')
        router.push('/')
      }
    }
  }

  const handleEndSession = async () => {
    if (!isHost) return
    
    const confirmed = confirm(
      'Are you sure you want to end this session? This will mark the session as inactive and participants will no longer be able to join or vote.'
    )
    
    if (!confirmed) return

    setIsEndingSession(true)
    try {
      await endSession(session.id)
      // Clear ALL user session data for clean restart
      localStorage.removeItem('sprintor_current_session')
      localStorage.removeItem('sprintor_user_id')
      localStorage.removeItem('sprintor_user_name')
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
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                SP
              </div>
              <span className="text-xl font-bold hidden sm:block">Sprintor</span>
            </Link>
            
            <div className="hidden md:flex items-center gap-4 pl-6 border-l">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Session ID:</span>
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
              
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {session.participants.filter(p => p.isOnline).length} participants online
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Mobile session ID */}
            <div className="md:hidden">
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
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {isEndingSession ? 'Ending...' : 'End Session'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveSession}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Leave</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}