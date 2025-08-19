"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Users, 
  Plus, 
  Play, 
  Eye, 
  Crown,
  Circle,
  CheckCircle2,
  Target,
  BarChart3,
  Edit3,
  Trash2
} from "lucide-react"
import { subscribeToSession, addStory, deleteStory, startVoting, castVote, revealVotes, endVoting, updateParticipantHeartbeat, cleanupInactiveParticipants, joinSession } from "@/lib/session-service"
import { getStoriesByProject, subscribeToProjectStories, updateStory } from "@/lib/story-service"
import { SessionHeader } from "@/components/session/SessionHeader"
import { SessionReconnectModal } from "@/components/session/SessionReconnectModal"
import { SessionEndedDialog } from "@/components/session/SessionEndedDialog"
import CreateStoryModal from "@/components/stories/CreateStoryModal"
import type { Session } from "@/types/session"

const PREDEFINED_DECKS = {
  fibonacci: ['1', '2', '3', '5', '8', '13', '21', '?'],
  tshirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  powers: ['1', '2', '4', '8', '16', '32', '?'],
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.id as string
  const isFreshJoin = searchParams.get('fresh') === 'true'
  
  const [session, setSession] = useState<Session | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [showReconnectModal, setShowReconnectModal] = useState(false)
  const [storedSessionInfo, setStoredSessionInfo] = useState<{
    sessionId: string
    sessionName: string
    userRole: 'host' | 'participant'
    joinedAt: string
  } | null>(null)
  const [showSessionEndedDialog, setShowSessionEndedDialog] = useState(false)
  
  // Auto-import ready stories
  const [storiesImported, setStoriesImported] = useState(false)
  const [importingStories, setImportingStories] = useState(false)
  const [projectName, setProjectName] = useState<string>('')
  
  // Story management
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)
  const [editingSessionStory, setEditingSessionStory] = useState<any | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [storyToDelete, setStoryToDelete] = useState<{ id: string, title: string } | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem('sprintor_user_id')
    const userName = localStorage.getItem('sprintor_user_name')
    const currentSessionData = localStorage.getItem('sprintor_current_session')
    
    if (!userId || !userName) {
      router.push('/join')
      return
    }
    
    setCurrentUserId(userId)
    
    // Check if there's stored session data for potential reconnection
    // Only show reconnect modal if this is NOT a fresh join from create/join pages
    if (currentSessionData && !isFreshJoin) {
      try {
        const sessionInfo = JSON.parse(currentSessionData)
        if (sessionInfo.sessionId === sessionId) {
          // Additional check: only show reconnect modal if the user joined more than 5 seconds ago
          // This prevents the modal from showing on fresh joins where localStorage was just set
          const joinedAt = new Date(sessionInfo.joinedAt)
          const now = new Date()
          const timeSinceJoin = now.getTime() - joinedAt.getTime()
          
          if (timeSinceJoin > 5000) { // 5 seconds
            setStoredSessionInfo(sessionInfo)
            // Show modal after a short delay to let session load first
            setTimeout(() => setShowReconnectModal(true), 1000)
          }
        }
      } catch (error) {
        console.error('Error parsing stored session data:', error)
        localStorage.removeItem('sprintor_current_session')
      }
    }
    
    // Clean up the fresh parameter from URL after processing (moved after reconnect logic)
    if (isFreshJoin) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
    
    // Subscribe to session updates (back to the original working way)
    const unsubscribe = subscribeToSession(sessionId, (sessionData) => {
      if (!sessionData) {
        setError('Session not found')
        setLoading(false)
        return
      }
      
      const userIsHost = sessionData.hostId === userId
      
      // Check if session was ended by host
      if (sessionData.isActive === false && !userIsHost) {
        // Session was ended by host, show dialog
        setShowSessionEndedDialog(true)
        return
      }
      
      setSession(sessionData)
      setIsHost(userIsHost)
      setLoading(false)
    })
    
    // Cleanup when participant leaves unexpectedly
    const handleBeforeUnload = () => {
      const cleanupData = JSON.stringify({
        sessionId,
        participantId: userId,
        action: 'leave'
      })
      
      try {
        fetch('/api/participant-cleanup', {
          method: 'POST',
          body: cleanupData,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true
        }).catch(() => {
          navigator.sendBeacon('/api/participant-cleanup', cleanupData)
        })
      } catch (error) {
        console.error('Cleanup failed:', error)
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      unsubscribe()
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [sessionId, router, isFreshJoin])

  // Auto-import ready stories when session loads
  const importReadyStories = async (sessionData: Session) => {
    // Only import if session has epic info, no stories yet, and haven't imported before
    if (!sessionData.epicId || !sessionData.projectId || sessionData.stories.length > 0 || storiesImported || importingStories) {
      return
    }

    setImportingStories(true)
    try {
      // Fetch all ready stories from the epic
      const readyStories = await getStoriesByProject(sessionData.projectId, {
        epicId: sessionData.epicId,
        status: ['ready']
      })


      // Add each story to the session
      for (const story of readyStories) {
        try {
          await addStory(sessionId, {
            title: story.title,
            description: story.description || '',
            estimate: null,
            isEstimated: false,
            votingHistory: [],
            originalStoryId: story.id  // Store reference to original project story
          })
        } catch (error) {
          console.error(`Failed to import story: ${story.title}`, error)
        }
      }

      setStoriesImported(true)
    } catch (error) {
      console.error('Error importing ready stories:', error)
    } finally {
      setImportingStories(false)
    }
  }

  // Use stored project name (avoids permission issues for participants)
  useEffect(() => {
    if (session?.projectName) {
      setProjectName(session.projectName)
    }
  }, [session?.projectName])

  // Auto-import stories when session loads (only for host)
  useEffect(() => {
    if (session && isHost && !loading) {
      importReadyStories(session)
    }
  }, [session, isHost, loading, sessionId, storiesImported, importingStories])

  // Subscribe to project stories to auto-add new ready stories (only for host)
  useEffect(() => {
    if (!session?.projectId || !session?.epicId || !isHost) return

    const unsubscribe = subscribeToProjectStories(session.projectId, (projectStories) => {
      // Skip if we're currently importing or haven't finished initial import
      if (importingStories || !storiesImported) {
        return
      }

      // Find ready stories for this epic that aren't already in the session
      const readyStoriesForEpic = projectStories.filter(story => 
        story.status === 'ready' && 
        story.epicId === session.epicId &&
        !session.stories.some(sessionStory => sessionStory.originalStoryId === story.id)
      )

      // Add each new ready story to the session
      readyStoriesForEpic.forEach(async (story) => {
        try {
          await addStory(sessionId, {
            title: story.title,
            description: story.description,
            estimate: null,
            isEstimated: false,
            votingHistory: [],
            originalStoryId: story.id  // Store reference to original project story
          })
        } catch (error) {
          // Silently handle errors to avoid console spam
        }
      })
    })

    return unsubscribe
  }, [session?.projectId, session?.epicId, session?.stories, isHost, sessionId, importingStories, storiesImported])

  const handleReconnect = async () => {
    const userId = localStorage.getItem('sprintor_user_id')
    const userName = localStorage.getItem('sprintor_user_name')
    
    if (!userId || !userName || !storedSessionInfo) return
    
    setShowReconnectModal(false)
    
    try {
      // Rejoin the session
      await joinSession(sessionId, {
        id: userId,
        name: userName,
        isHost: storedSessionInfo.userRole === 'host',
        isOnline: true
      })
    } catch (error) {
      console.error('Reconnection failed:', error)
      // Don't show error, session will continue normally
    }
  }

  const handleDiscardSession = () => {
    // Clear ALL user session data for clean restart
    localStorage.removeItem('sprintor_current_session')
    localStorage.removeItem('sprintor_user_id')
    localStorage.removeItem('sprintor_user_name')
    setShowReconnectModal(false)
    router.push('/join')
  }

  const handleSessionEnded = () => {
    // Clear ALL user session data 
    localStorage.removeItem('sprintor_current_session')
    localStorage.removeItem('sprintor_user_id')
    localStorage.removeItem('sprintor_user_name')
    setShowSessionEndedDialog(false)
    router.push('/')
  }

  // Heartbeat mechanism to keep participant status updated
  useEffect(() => {
    if (!currentUserId || !sessionId) return

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      try {
        await updateParticipantHeartbeat(sessionId, currentUserId)
      } catch (error) {
        console.error('Heartbeat failed:', error)
      }
    }, 30000)

    // Cleanup inactive participants every minute (only for hosts)
    let cleanupInterval: NodeJS.Timeout | null = null
    if (isHost) {
      cleanupInterval = setInterval(async () => {
        try {
          await cleanupInactiveParticipants(sessionId)
        } catch (error) {
          console.error('Cleanup failed:', error)
        }
      }, 60000)
    }

    return () => {
      clearInterval(heartbeatInterval)
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
      }
    }
  }, [currentUserId, sessionId, isHost])

  const getEstimationCards = () => {
    if (!session) return []
    
    if (session.deckType === 'custom') {
      return session.customDeck || []
    }
    
    return PREDEFINED_DECKS[session.deckType] || PREDEFINED_DECKS.fibonacci
  }

  const handleStoryCreated = async () => {
    // Story was created in project with "ready" status
    // Session will automatically pick it up through real-time subscriptions
    
    // Close the modal and reset editing state
    setShowCreateStoryModal(false)
    setEditingSessionStory(null)
  }

  const handleStartVoting = async (storyId: string) => {
    try {
      await startVoting(sessionId, storyId)
    } catch (error) {
      console.error('Error starting voting:', error)
    }
  }

  const handleVote = async (vote: string) => {
    try {
      await castVote(sessionId, currentUserId, vote)
    } catch (error) {
      console.error('Error casting vote:', error)
    }
  }

  const handleRevealVotes = async () => {
    try {
      await revealVotes(sessionId)
    } catch (error) {
      console.error('Error revealing votes:', error)
    }
  }

  const handleEndVoting = async (estimate?: string) => {
    try {
      await endVoting(sessionId, estimate)
      
      // Sync estimate back to original project story if story has original ID
      if (estimate && session?.currentStoryId) {
        const currentStory = session.stories.find(s => s.id === session.currentStoryId)
        
        if (currentStory?.originalStoryId) {
          try {
            const storyPoints = parseInt(estimate)
            const updateData = {
              storyPoints: isNaN(storyPoints) ? undefined : storyPoints,
              updatedAt: new Date()
            }
            
            await updateStory(currentStory.originalStoryId, updateData)
          } catch (syncError) {
            console.error('Error syncing story points:', syncError)
          }
        }
      }
    } catch (error) {
      console.error('Error ending voting:', error)
    }
  }

  const handleEditStoryClick = (story: any) => {
    // Convert session story to the format expected by CreateStoryModal
    const storyForModal = {
      id: story.id,
      title: story.title,
      description: story.description || '',
      type: 'story' as const,
      asA: '',
      iWant: '',
      soThat: '',
      businessValue: 5,
      priority: 'Should Have' as const,
      riskLevel: 'Medium' as const,
      complexity: 'Moderate' as const,
      acceptanceCriteria: [],
      storyPoints: undefined,
      timeEstimate: '',
      estimationConfidence: 'Medium' as const,
      epicId: session?.epicId || '',
      labels: []
    }
    
    setEditingSessionStory(storyForModal)
    setShowCreateStoryModal(true)
  }

  const handleDeleteStory = (storyId: string, storyTitle: string) => {
    setStoryToDelete({ id: storyId, title: storyTitle })
    setShowDeleteDialog(true)
  }

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return
    
    try {
      await deleteStory(sessionId, storyToDelete.id)
      setShowDeleteDialog(false)
      setStoryToDelete(null)
    } catch (error) {
      console.error('Error deleting story:', error)
      setShowDeleteDialog(false)
      setStoryToDelete(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Session Error</CardTitle>
            <CardDescription>{error || 'Session not found'}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentStory = session.currentStoryId 
    ? session.stories.find(s => s.id === session.currentStoryId)
    : null

  const estimationCards = getEstimationCards()
  const currentParticipant = session.participants.find(p => p.id === currentUserId)
  const hasVoted = currentParticipant?.vote !== null && currentParticipant?.vote !== undefined
  const allVoted = session.participants.filter(p => p.isOnline).every(p => p.vote !== null && p.vote !== undefined)

  return (
    <div className="min-h-screen bg-background">
      {showReconnectModal && storedSessionInfo && (
        <SessionReconnectModal
          sessionInfo={storedSessionInfo}
          onReconnect={handleReconnect}
          onDiscard={handleDiscardSession}
        />
      )}
      
      {showSessionEndedDialog && (
        <SessionEndedDialog
          onConfirm={handleSessionEnded}
        />
      )}
      
      <SessionHeader 
        session={session} 
        isHost={isHost} 
        currentUserId={currentUserId} 
      />
      
      {/* Compact Header with Key Info */}
      <div className="border-b bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1"></div>
            <div className="lg:col-span-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <h1 className="font-semibold text-lg">{session.name}</h1>
                  
                  {/* Project and Epic Info - Compact */}
                  {(session.projectId || session.epicId) && (
                    <div className="flex items-center gap-2 text-sm">
                      {session.projectId && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded border border-primary/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          <span className="font-medium text-primary">{projectName || 'Loading...'}</span>
                        </div>
                      )}
                      {session.epicId && session.epicName && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded border" style={{ backgroundColor: `${session.epicColor || '#6366f1'}15`, borderColor: `${session.epicColor || '#6366f1'}40` }}>
                          <div className="w-2 h-2 rounded" style={{ backgroundColor: session.epicColor || '#6366f1' }}></div>
                          <span className="font-medium" style={{ color: session.epicColor || '#6366f1' }}>{session.epicName}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{session.participants.filter(p => p.isOnline).length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-4 w-4" />
                    <span>{session.stories.filter(s => s.isEstimated).length}/{session.stories.length}</span>
                  </div>
                  {(importingStories || (storiesImported && session.stories.length > 0)) && (
                    <div className="flex items-center gap-1">
                      {importingStories ? (
                        <>
                          <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full"></div>
                          <span className="text-xs text-primary">Importing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          <span className="text-xs text-green-600">Imported</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid lg:grid-cols-5 gap-4">
          
          {/* Compact Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Participants - Compact */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team ({session.participants.filter(p => p.isOnline).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {session.participants.filter(p => p.isOnline).map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-4 h-4 bg-background rounded-full flex items-center justify-center border">
                            {participant.isHost ? (
                              <Crown className="h-2.5 w-2.5 text-amber-600" />
                            ) : (
                              <span className="text-xs font-medium">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-background"></div>
                        </div>
                        <span className="text-xs font-medium truncate">
                          {participant.name.length > 12 ? participant.name.substring(0, 12) + '...' : participant.name}
                          {participant.id === currentUserId && <span className="text-primary"> (You)</span>}
                        </span>
                      </div>
                      {session.votingInProgress && session.currentStoryId && (
                        session.votesRevealed ? (
                          <span className="text-xs font-mono bg-primary text-primary-foreground px-1 py-0.5 rounded">
                            {participant.vote || '—'}
                          </span>
                        ) : (
                          participant.vote !== null && participant.vote !== undefined ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Circle className="h-3 w-3 text-muted-foreground" />
                          )
                        )
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Session Info */}
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deck:</span>
                    <span className="font-medium">{session.deckType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Progress:</span>
                    <span className="font-medium">{session.stories.filter(s => s.isEstimated).length}/{session.stories.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">
                      {(() => {
                        const now = new Date()
                        const sessionStart = session.createdAt
                        const diffMs = now.getTime() - sessionStart.getTime()
                        const diffMins = Math.floor(diffMs / (1000 * 60))
                        return `${diffMins}m`
                      })()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Voting Focus */}
          <div className="lg:col-span-4 space-y-3">
            
            {/* Compact Stats Row */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
                  {/* Total Story Points */}
                  <div>
                    <div className="text-lg font-bold">
                      {(() => {
                        if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                          const total = session.stories
                            .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
                            .reduce((sum, s) => {
                              const points = parseFloat(s.estimate || '0')
                              return isNaN(points) ? sum : sum + points
                            }, 0)
                          return total || '0'
                        } else {
                          return session.stories.filter(s => s.isEstimated).length
                        }
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.deckType === 'fibonacci' || session.deckType === 'powers' ? 'Total Points' : 'Estimated'}
                    </div>
                  </div>

                  {/* Average */}
                  <div>
                    <div className="text-lg font-bold">
                      {(() => {
                        if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                          const estimatedStories = session.stories.filter(s => 
                            s.isEstimated && s.estimate && s.estimate !== '?' && !isNaN(parseFloat(s.estimate))
                          )
                          if (estimatedStories.length === 0) return '—'
                          const avg = estimatedStories.reduce((sum, s) => sum + parseFloat(s.estimate!), 0) / estimatedStories.length
                          return avg.toFixed(1)
                        } else if (session.deckType === 'tshirt') {
                          const estimates = session.stories
                            .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
                            .map(s => s.estimate!)
                          if (estimates.length === 0) return '—'
                          const counts: Record<string, number> = {}
                          estimates.forEach(e => counts[e] = (counts[e] || 0) + 1)
                          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
                          return sorted[0]?.[0] || '—'
                        } else {
                          return session.stories.filter(s => !s.isEstimated).length
                        }
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.deckType === 'fibonacci' || session.deckType === 'powers' ? 'Avg Points' : 
                       session.deckType === 'tshirt' ? 'Most Common' : 'Remaining'}
                    </div>
                  </div>

                  {/* Consensus Rate */}
                  <div>
                    <div className="text-lg font-bold">
                      {(() => {
                        const storiesWithVoting = session.stories.filter(s => s.votingHistory && s.votingHistory.length > 0)
                        if (storiesWithVoting.length === 0) return '—'
                        const firstRoundConsensus = storiesWithVoting.filter(s => s.votingHistory!.length === 1).length
                        return `${Math.round((firstRoundConsensus / storiesWithVoting.length) * 100)}%`
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">Consensus</div>
                  </div>

                  {/* High Variance */}
                  <div>
                    <div className="text-lg font-bold">
                      {(() => {
                        if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                          return session.stories.filter(s => {
                            if (!s.votingHistory || s.votingHistory.length === 0) return false
                            const lastRound = s.votingHistory[s.votingHistory.length - 1]
                            const votes = Object.values(lastRound.votes).filter(v => v !== '?' && !isNaN(parseFloat(v)))
                            if (votes.length < 2) return false
                            const numVotes = votes.map(v => parseFloat(v))
                            const max = Math.max(...numVotes)
                            const min = Math.min(...numVotes)
                            return (max - min) > 5
                          }).length
                        } else {
                          return session.stories.filter(s => {
                            if (!s.votingHistory || s.votingHistory.length === 0) return false
                            const lastRound = s.votingHistory[s.votingHistory.length - 1]
                            const votes = Object.values(lastRound.votes).filter(v => v !== '?')
                            if (votes.length < 2) return false
                            return new Set(votes).size > 1
                          }).length
                        }
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.deckType === 'fibonacci' || session.deckType === 'powers' ? 'High Variance' : 'Split Votes'}
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <div className="text-lg font-bold">
                      {(() => {
                        const now = new Date()
                        const sessionStart = session.createdAt
                        const diffMs = now.getTime() - sessionStart.getTime()
                        const diffMins = Math.floor(diffMs / (1000 * 60))
                        return `${diffMins}m`
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>

                  {/* Participation */}
                  <div>
                    <div className="text-lg font-bold">
                      {(() => {
                        const storiesWithVoting = session.stories.filter(s => s.votingHistory && s.votingHistory.length > 0)
                        if (storiesWithVoting.length === 0) return '—'
                        const totalParticipants = session.participants.filter(p => !p.isHost).length
                        if (totalParticipants === 0) return '—'
                        let totalVotes = 0
                        let totalPossibleVotes = 0
                        storiesWithVoting.forEach(story => {
                          story.votingHistory!.forEach(round => {
                            totalVotes += Object.keys(round.votes).filter(id => session.participants.find(p => p.id === id && !p.isHost)).length
                            totalPossibleVotes += totalParticipants
                          })
                        })
                        return totalPossibleVotes === 0 ? '—' : `${Math.round((totalVotes / totalPossibleVotes) * 100)}%`
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">Participation</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Current Story Voting Area */}
            {session.votingInProgress && currentStory && (
              <Card className="border-primary/50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span>Voting: {currentStory.title}</span>
                    {isHost && (
                      <div className="flex gap-2">
                        {!session.votesRevealed && allVoted && (
                          <Button size="sm" onClick={handleRevealVotes}>
                            <Eye className="h-4 w-4 mr-2" />
                            Reveal Votes
                          </Button>
                        )}
                        {session.votesRevealed && (
                          <Button size="sm" onClick={() => {
                            // Get the final estimate from the current story
                            const finalEstimate = currentStory.estimate || undefined
                            handleEndVoting(finalEstimate)
                          }}>
                            Save Voting
                          </Button>
                        )}
                      </div>
                    )}
                  </CardTitle>
                  {currentStory.description && (
                    <CardDescription className="max-h-24 overflow-y-auto text-xs leading-relaxed">
                      {currentStory.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Estimation Cards */}
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {estimationCards.map((card) => (
                        <button
                          key={card}
                          onClick={() => handleVote(card)}
                          disabled={session.votesRevealed}
                          className={`aspect-[3/4] border-2 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
                            currentParticipant?.vote === card
                              ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-105'
                              : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
                          }`}
                        >
                          {card}
                        </button>
                      ))}
                    </div>

                    {/* Voting Status */}
                    <div className="text-center space-y-2">
                      {session.votesRevealed ? (
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Eye className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-green-800 dark:text-green-200">Votes Revealed</span>
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Review the results and discuss to reach consensus
                          </p>
                        </div>
                      ) : hasVoted ? (
                        allVoted ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <Target className="h-4 w-4 text-amber-600" />
                              <span className="font-semibold text-amber-800 dark:text-amber-200">All Votes Cast</span>
                            </div>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Everyone has voted! Ready to reveal results.
                            </p>
                          </div>
                        ) : (
                          <div className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                              <span className="font-medium text-green-800 dark:text-green-200">Vote Submitted</span>
                            </div>
                            <p className="text-xs text-green-700 dark:text-green-300">
                              Waiting for {session.participants.filter(p => p.isOnline && (p.vote === null || p.vote === undefined)).length} more participant{session.participants.filter(p => p.isOnline && (p.vote === null || p.vote === undefined)).length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="p-2 bg-muted/50 border rounded-lg">
                          <div className="flex items-center justify-center gap-2">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground font-medium text-sm">
                              Select your estimate above
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stories List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  User Stories ({session.stories.length})
                  {isHost && (
                    <Button size="sm" onClick={() => setShowCreateStoryModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Story
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {session.stories.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No stories added yet.</p>
                      {isHost && <p className="text-sm">Add your first user story to start estimating!</p>}
                    </div>
                  ) : (
                    session.stories.map((story) => (
                      <div key={story.id}>
                        <div
                          className={`border rounded-lg p-3 cursor-pointer transition-all ${
                            story.id === session.currentStoryId ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{story.title}</h4>
                              {story.description && (
                                <p className="text-xs text-muted-foreground mt-1">{story.description}</p>
                              )}
                              {story.votingHistory && story.votingHistory.length > 0 && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {story.votingHistory.length} voting round{story.votingHistory.length !== 1 ? 's' : ''}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                {story.isEstimated && story.estimate && (
                                  <Badge variant="secondary" className="text-xs">{story.estimate}</Badge>
                                )}
                                {isHost && !session.votingInProgress && story.id !== session.currentStoryId && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartVoting(story.id)
                                    }}
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Play className="h-3 w-3 mr-1" />
                                    {story.votingHistory && story.votingHistory.length > 0 ? 'Re-vote' : 'Vote'}
                                  </Button>
                                )}
                              </div>
                              {isHost && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditStoryClick(story)
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteStory(story.id, story.title)
                                    }}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded voting history */}
                        {expandedStory === story.id && story.votingHistory && story.votingHistory.length > 0 && (
                          <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-muted">
                            <h5 className="font-medium mb-2 text-xs">Voting History</h5>
                            <div className="space-y-2">
                              {story.votingHistory.map((round, index) => (
                                <div key={round.id} className="bg-background/50 rounded p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Round {index + 1} • {round.timestamp.toLocaleString()}
                                    </span>
                                    {round.finalEstimate && (
                                      <Badge variant="secondary" className="text-xs">
                                        Final: {round.finalEstimate}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(round.votes).map(([participantId, vote]) => (
                                      <div key={participantId} className="flex items-center gap-1 text-xs">
                                        <span className="text-muted-foreground">
                                          {round.participantNames[participantId] || 'Unknown'}:
                                        </span>
                                        <span className="font-mono bg-muted px-1 rounded">{vote}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </div>

      {/* Delete Story Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Story</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{storyToDelete?.title}"? This action cannot be undone and will remove all voting history for this story.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteStory}>
              Delete Story
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Story Modal */}
      {session.projectId && (
        <CreateStoryModal
          isOpen={showCreateStoryModal}
          onClose={() => {
            setShowCreateStoryModal(false)
            setEditingSessionStory(null)
          }}
          projectId={session.projectId}
          onStoryCreated={handleStoryCreated}
          defaultEpicId={session.epicId}
          editingStory={editingSessionStory}
          sessionMode={true}
        />
      )}
    </div>
  )
}