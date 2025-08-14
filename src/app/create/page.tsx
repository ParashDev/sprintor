"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Settings, Loader2 } from "lucide-react"
import { createSession } from "@/lib/session-service"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

const DECK_OPTIONS = [
  { value: 'fibonacci', label: 'Fibonacci (1, 2, 3, 5, 8, 13, 21)', description: 'Classic Fibonacci sequence for story points' },
  { value: 'tshirt', label: 'T-Shirt Sizes (XS, S, M, L, XL)', description: 'Size-based estimation' },
  { value: 'powers', label: 'Powers of 2 (1, 2, 4, 8, 16)', description: 'Exponential scale' },
  { value: 'custom', label: 'Custom Cards', description: 'Define your own estimation values' }
]

export default function CreateSessionPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    sessionName: '',
    description: '',
    deckType: 'fibonacci' as 'fibonacci' | 'tshirt' | 'powers' | 'custom',
    customDeck: ''
  })

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      toast.error("Please sign in to host a session")
      router.push('/auth/login')
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("Please sign in to host a session")
      router.push('/auth/login')
      return
    }

    setIsLoading(true)

    try {
      // Clear any existing session data first
      localStorage.removeItem('sprintor_current_session')
      
      // Use authenticated user's ID and name
      localStorage.setItem('sprintor_user_id', user.uid)
      localStorage.setItem('sprintor_user_name', user.displayName || user.email || 'Host')

      const hostName = user.displayName || user.email || 'Host'
      
      const sessionData: {
        name: string
        description: string
        hostId: string
        deckType: 'fibonacci' | 'tshirt' | 'powers' | 'custom'
        customDeck?: string[]
        participants: Array<{
          id: string
          name: string
          isHost: boolean
          isOnline: boolean
          lastSeen: Date
        }>
        stories: never[]
        votingInProgress: boolean
        votesRevealed: boolean
        isActive: boolean
      } = {
        name: formData.sessionName,
        description: formData.description,
        hostId: user.uid,
        deckType: formData.deckType,
        participants: [{
          id: user.uid,
          name: hostName,
          isHost: true,
          isOnline: true,
          lastSeen: new Date()
        }],
        stories: [],
        votingInProgress: false,
        votesRevealed: false,
        isActive: true
      }

      // Only add customDeck if it's actually needed and has values
      if (formData.deckType === 'custom' && formData.customDeck.trim()) {
        sessionData.customDeck = formData.customDeck.split(',').map(s => s.trim()).filter(Boolean)
      }

      const sessionId = await createSession(sessionData)
      
      // Store current session info for reconnection
      localStorage.setItem('sprintor_current_session', JSON.stringify({
        sessionId: sessionId,
        sessionName: formData.sessionName,
        userRole: 'host',
        joinedAt: new Date().toISOString()
      }))
      
      router.push(`/session/${sessionId}?fresh=true`)
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error('Failed to create session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader />
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Session</h1>
              <p className="text-muted-foreground mt-1">Set up your planning poker session</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Step 1 of 2: Session Setup
            </div>
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column - Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="space-y-6 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold tracking-tight">Create New Session</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Set up your planning poker session configuration
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="session-name" className="text-sm font-semibold">Session Name</Label>
                        <Input
                          id="session-name"
                          value={formData.sessionName}
                          onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                          placeholder="Sprint 24.1 Planning"
                          required
                          className="h-12 text-base border-2 focus:border-primary"
                        />
                        <p className="text-sm text-muted-foreground">
                          Descriptive session name
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="session-description" className="text-sm font-semibold">Description (Optional)</Label>
                        <Textarea
                          id="session-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Planning session for user stories in Sprint 24.1. We'll be estimating 12 stories for the upcoming sprint."
                          className="min-h-24 text-base border-2 focus:border-primary resize-none"
                        />
                        <p className="text-sm text-muted-foreground">
                          Add context about what you&apos;ll be estimating (optional)
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">Estimation Cards</Label>
                        <div className="grid gap-3">
                          {DECK_OPTIONS.map((option) => (
                            <div
                              key={option.value}
                              className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                formData.deckType === option.value
                                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                  : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary/50 dark:hover:bg-slate-800/50'
                              }`}
                              onClick={() => setFormData({ ...formData, deckType: option.value as 'fibonacci' | 'tshirt' | 'powers' | 'custom' })}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 transition-all ${
                                  formData.deckType === option.value
                                    ? 'border-primary bg-primary shadow-sm'
                                    : 'border-slate-400 dark:border-slate-500'
                                }`}>
                                  {formData.deckType === option.value && (
                                    <div className="w-full h-full rounded-full bg-white scale-50" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="font-semibold text-sm">{option.label}</div>
                                  <div className="text-sm text-muted-foreground leading-relaxed">{option.description}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {formData.deckType === 'custom' && (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                          <Label htmlFor="custom-deck" className="text-sm font-semibold">Custom Card Values</Label>
                          <Input
                            id="custom-deck"
                            value={formData.customDeck}
                            onChange={(e) => setFormData({ ...formData, customDeck: e.target.value })}
                            placeholder="1, 2, 4, 8, 16, ?, ☕"
                            required={formData.deckType === 'custom'}
                            className="h-11 text-base border-2 focus:border-primary"
                          />
                          <p className="text-sm text-muted-foreground">
                            Enter comma-separated values for your estimation cards
                          </p>
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Settings className="h-5 w-5 mr-3 animate-spin" />
                          Creating Session...
                        </>
                      ) : (
                        <>
                          <Users className="h-5 w-5 mr-3" />
                          Create Session & Get Room Code
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right column - Info sidebar */}
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Get your room code</div>
                        <div className="text-muted-foreground">You&apos;ll receive a 6-character code to share</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-muted-foreground">Invite your team</div>
                        <div className="text-muted-foreground">Share the room code with participants</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-muted-foreground">Start estimating</div>
                        <div className="text-muted-foreground">Add stories and begin planning poker</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Tips for better sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p>• Keep session names descriptive</p>
                    <p>• Fibonacci sequence works for most teams</p>
                    <p>• Prepare your user stories in advance</p>
                    <p>• Encourage discussion before revealing votes</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}