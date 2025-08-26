"use client"

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Loader2, CheckCircle } from 'lucide-react'
import { getTeamByInviteCode, addTeamMember, type Team } from '@/lib/team-service'
import { toast } from 'sonner'

function JoinTeamContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [joined, setJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const inviteCode = searchParams?.get('code')

  useEffect(() => {
    if (!inviteCode) {
      setError('No invite code provided')
      setLoading(false)
      return
    }

    loadTeam()
  }, [inviteCode])

  const loadTeam = async () => {
    if (!inviteCode) return

    try {
      setLoading(true)
      const teamData = await getTeamByInviteCode(inviteCode)
      
      if (!teamData) {
        setError('Invalid or expired invite code')
        return
      }

      if (teamData.inviteEnabled === false) {
        setError('Team invitations are currently disabled by the team owner')
        return
      }

      setTeam(teamData)
    } catch (error) {
      console.error('Error loading team:', error)
      setError('Failed to load team information')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!team || !nameRef.current?.value?.trim()) {
      toast.error('Please enter your name')
      return
    }
    
    if (!emailRef.current?.value?.trim()) {
      toast.error('Please enter your email')
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const memberEmail = emailRef.current.value.trim()
    if (!emailRegex.test(memberEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    const memberName = nameRef.current.value.trim()

    try {
      setJoining(true)
      
      // Generate a temporary member ID (in a real app, this would be the user's auth ID)
      const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await addTeamMember(team.id, {
        id: memberId,
        name: memberName,
        email: memberEmail, // Include email for sprint access verification
        role: team.defaultRole || 'developer',
        invitedBy: team.ownerId
      })

      setJoined(true)
      toast.success(`Successfully joined ${team.name}!`)
      
      // Redirect to projects page after a short delay
      setTimeout(() => {
        router.push('/projects')
      }, 2000)

    } catch (error) {
      console.error('Error joining team:', error)
      toast.error('Failed to join team. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-muted-foreground mt-4">Loading team information...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Unable to Join Team</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => router.push('/')} className="w-full">
              Go to Home Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to {team?.name}!</h2>
            <p className="text-muted-foreground mb-4">
              You&apos;ve successfully joined the team as a {team?.defaultRole?.replace('_', ' ')}.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to projects page...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Join Team</CardTitle>
          <CardDescription className="text-center">
            You&apos;ve been invited to join <strong>{team?.name}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {team?.description && (
            <div className="mb-6 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{team.description}</p>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Team members:</span>
              <span className="font-medium">{team?.members.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your role will be:</span>
              <span className="font-medium capitalize">
                {team?.defaultRole?.replace('_', ' ') || 'developer'}
              </span>
            </div>
          </div>

          <form onSubmit={handleJoinTeam} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Your Name <span className="text-destructive">*</span>
              </label>
              <input
                ref={nameRef}
                id="name"
                type="text"
                placeholder="Enter your name"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Your Email <span className="text-destructive">*</span>
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                placeholder="your.email@company.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
              <p className="text-xs text-muted-foreground">
                Required for sprint board access verification
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining Team...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Join {team?.name}
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button 
              onClick={() => router.push('/')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Not interested? Go back to home page
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-center text-muted-foreground mt-4">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <JoinTeamContent />
    </Suspense>
  )
}