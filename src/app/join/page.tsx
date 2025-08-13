"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, UserPlus, Users } from "lucide-react"
import { getSession, joinSession } from "@/lib/session-service"

export default function JoinSessionPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    sessionId: '',
    userName: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Check if session exists
      const session = await getSession(formData.sessionId.toUpperCase())
      if (!session) {
        alert('Session not found. Please check the room code.')
        return
      }

      if (!session.isActive) {
        alert('This session is no longer active.')
        return
      }

      // Generate participant ID and store user info
      const participantId = Math.random().toString(36).substring(2, 9)
      localStorage.setItem('sprintor_user_id', participantId)
      localStorage.setItem('sprintor_user_name', formData.userName)

      // Check if participant name is already taken
      const existingParticipant = session.participants.find(
        p => p.name.toLowerCase() === formData.userName.toLowerCase() && p.isOnline
      )

      if (existingParticipant) {
        alert('A participant with this name is already in the session. Please choose a different name.')
        return
      }

      // Join the session
      await joinSession(formData.sessionId.toUpperCase(), {
        id: participantId,
        name: formData.userName,
        isHost: false,
        isOnline: true
      })

      // Redirect to session
      router.push(`/session/${formData.sessionId.toUpperCase()}`)
    } catch (error: any) {
      console.error('Error joining session:', error)
      if (error.message === 'Session not found') {
        alert('Session not found. Please check the room code and try again.')
      } else {
        alert('Failed to join session. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold">Join Session</CardTitle>
              <CardDescription className="text-lg mt-2">
                Enter your room code to join the planning session
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-id">Room Code</Label>
                  <Input
                    id="session-id"
                    value={formData.sessionId}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      sessionId: e.target.value.toUpperCase() 
                    })}
                    placeholder="ABC123"
                    required
                    className="h-12 text-center text-lg font-mono tracking-wider"
                    maxLength={6}
                  />
                  <p className="text-sm text-muted-foreground">
                    6-character code provided by your session host
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-name">Your Name</Label>
                  <Input
                    id="user-name"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    placeholder="John Smith"
                    required
                    className="h-12"
                    maxLength={50}
                  />
                  <p className="text-sm text-muted-foreground">
                    This is how others will see you in the session
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg" 
                disabled={isLoading || !formData.sessionId || !formData.userName}
              >
                {isLoading ? (
                  <>
                    <Users className="h-5 w-5 mr-2 animate-pulse" />
                    Joining Session...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5 mr-2" />
                    Join Session
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Don't have a room code?
              </p>
              <Link href="/create">
                <Button variant="outline" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Create New Session
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}