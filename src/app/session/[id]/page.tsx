"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  AlertTriangle,
  Edit3,
  Trash2
} from "lucide-react"
import { subscribeToSession, addStory, editStory, deleteStory, startVoting, castVote, revealVotes, endVoting, updateParticipantHeartbeat, cleanupInactiveParticipants, joinSession } from "@/lib/session-service"
import { SessionHeader } from "@/components/session/SessionHeader"
import { SessionReconnectModal } from "@/components/session/SessionReconnectModal"
import { SessionEndedDialog } from "@/components/session/SessionEndedDialog"
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
  
  // Story management
  const [showAddStory, setShowAddStory] = useState(false)
  const [newStory, setNewStory] = useState({ title: '', description: '' })
  const [expandedStory, setExpandedStory] = useState<string | null>(null)
  const [editingStory, setEditingStory] = useState<{ id: string, title: string, description: string } | null>(null)
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
        console.log('Session ended by host, showing dialog')
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

  const handleAddStory = async () => {
    if (!newStory.title.trim()) return
    
    try {
      await addStory(sessionId, {
        title: newStory.title,
        description: newStory.description,
        isEstimated: false
      })
      
      setNewStory({ title: '', description: '' })
      setShowAddStory(false)
    } catch (error) {
      console.error('Error adding story:', error)
    }
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
    } catch (error) {
      console.error('Error ending voting:', error)
    }
  }

  const handleEditStory = async () => {
    if (!editingStory || !editingStory.title.trim()) return
    
    try {
      await editStory(sessionId, editingStory.id, {
        title: editingStory.title,
        description: editingStory.description
      })
      setEditingStory(null)
    } catch (error) {
      console.error('Error editing story:', error)
    }
  }

  const handleDeleteStory = (storyId: string, storyTitle: string) => {
    setStoryToDelete({ id: storyId, title: storyTitle })
    setShowDeleteDialog(true)
  }

  const confirmDeleteStory = async () => {
    if (!storyToDelete) return
    
    try {
      await deleteStory(sessionId, storyToDelete.id)
      // Ensure UI state is reset properly
      setShowDeleteDialog(false)
      setStoryToDelete(null)
    } catch (error) {
      console.error('Error deleting story:', error)
      // Reset UI state even on error
      setShowDeleteDialog(false)
      setStoryToDelete(null)
    }
    
    // Safety timeout to ensure state is always reset
    setTimeout(() => {
      setShowDeleteDialog(false)
      setStoryToDelete(null)
    }, 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {/* Session Insights Section */}
        <div className="mb-6">
          <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sprint Planning Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Total Story Points - Only for numeric decks */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(() => {
                        // Only calculate total for numeric decks
                        if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                          const total = session.stories
                            .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
                            .reduce((sum, s) => {
                              const points = parseFloat(s.estimate || '0')
                              return isNaN(points) ? sum : sum + points
                            }, 0)
                          return total || '0'
                        } else {
                          // For non-numeric decks, show estimated count
                          return session.stories.filter(s => s.isEstimated).length
                        }
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.deckType === 'fibonacci' || session.deckType === 'powers' ? 'Total Points' : 'Estimated'}
                    </div>
                  </div>

                  {/* Average Story Size or Most Common */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(() => {
                        if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                          // For numeric decks, calculate average
                          const estimatedStories = session.stories.filter(s => 
                            s.isEstimated && s.estimate && s.estimate !== '?' && !isNaN(parseFloat(s.estimate))
                          )
                          if (estimatedStories.length === 0) return '—'
                          const avg = estimatedStories.reduce((sum, s) => sum + parseFloat(s.estimate!), 0) / estimatedStories.length
                          return avg.toFixed(1)
                        } else if (session.deckType === 'tshirt') {
                          // For T-shirt sizes, show most common size
                          const estimates = session.stories
                            .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
                            .map(s => s.estimate!)
                          if (estimates.length === 0) return '—'
                          const counts: Record<string, number> = {}
                          estimates.forEach(e => counts[e] = (counts[e] || 0) + 1)
                          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
                          return sorted[0]?.[0] || '—'
                        } else {
                          // For custom decks, show remaining count
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
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(() => {
                        const storiesWithVoting = session.stories.filter(s => s.votingHistory && s.votingHistory.length > 0)
                        if (storiesWithVoting.length === 0) return '—'
                        const firstRoundConsensus = storiesWithVoting.filter(s => s.votingHistory!.length === 1).length
                        return `${Math.round((firstRoundConsensus / storiesWithVoting.length) * 100)}%`
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">First-Round Consensus</div>
                  </div>

                  {/* High Variance Stories or Split Votes */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {(() => {
                        if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                          // For numeric decks, calculate variance
                          return session.stories.filter(s => {
                            if (!s.votingHistory || s.votingHistory.length === 0) return false
                            const lastRound = s.votingHistory[s.votingHistory.length - 1]
                            const votes = Object.values(lastRound.votes).filter(v => v !== '?' && !isNaN(parseFloat(v)))
                            if (votes.length < 2) return false
                            const numVotes = votes.map(v => parseFloat(v))
                            const max = Math.max(...numVotes)
                            const min = Math.min(...numVotes)
                            return (max - min) > 5 // High variance if range > 5 points
                          }).length
                        } else {
                          // For non-numeric decks, count stories with split votes (no consensus)
                          return session.stories.filter(s => {
                            if (!s.votingHistory || s.votingHistory.length === 0) return false
                            const lastRound = s.votingHistory[s.votingHistory.length - 1]
                            const votes = Object.values(lastRound.votes).filter(v => v !== '?')
                            if (votes.length < 2) return false
                            // Check if all votes are not the same (split vote)
                            return new Set(votes).size > 1
                          }).length
                        }
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {session.deckType === 'fibonacci' || session.deckType === 'powers' ? 'High Variance' : 'Split Votes'}
                    </div>
                  </div>

                  {/* Session Duration */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
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

                  {/* Participation Rate */}
                  <div className="text-center">
                    <div className="text-2xl font-bold">
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

                {/* Risk Indicators & Recommendations */}
                <div className="mt-4 pt-4 border-t">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Sprint Readiness */}
                    <div className="flex items-center gap-2 text-sm">
                      {(() => {
                        const totalStories = session.stories.length
                        const estimatedStories = session.stories.filter(s => s.isEstimated).length
                        const completionRate = totalStories === 0 ? 0 : (estimatedStories / totalStories) * 100
                        const remainingStories = totalStories - estimatedStories
                        
                        if (completionRate === 100) {
                          return (
                            <>
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="font-medium">Sprint Ready</span>
                              <span className="text-muted-foreground">- All stories estimated</span>
                            </>
                          )
                        } else if (completionRate >= 80) {
                          return (
                            <>
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="font-medium">Nearly Ready</span>
                              <span className="text-muted-foreground">- {remainingStories} {remainingStories === 1 ? 'story' : 'stories'} remaining</span>
                            </>
                          )
                        } else if (completionRate >= 50) {
                          return (
                            <>
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="font-medium">In Progress</span>
                              <span className="text-muted-foreground">- {remainingStories} {remainingStories === 1 ? 'story' : 'stories'} remaining</span>
                            </>
                          )
                        } else {
                          return (
                            <>
                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                              <span className="font-medium">Getting Started</span>
                              <span className="text-muted-foreground">- {remainingStories} {remainingStories === 1 ? 'story' : 'stories'} remaining</span>
                            </>
                          )
                        }
                      })()}
                    </div>

                    {/* Next Actions */}
                    <div className="flex items-center justify-end gap-2 text-sm text-right">
                      {(() => {
                        const unestimatedStories = session.stories.filter(s => !s.isEstimated)
                        
                        // Calculate stories needing review based on deck type
                        const storiesNeedingReview = session.stories.filter(s => {
                          if (!s.votingHistory || s.votingHistory.length === 0) return false
                          const lastRound = s.votingHistory[s.votingHistory.length - 1]
                          
                          if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
                            // For numeric decks, check for high variance
                            const votes = Object.values(lastRound.votes).filter(v => v !== '?' && !isNaN(parseFloat(v)))
                            if (votes.length < 2) return false
                            const numVotes = votes.map(v => parseFloat(v))
                            const max = Math.max(...numVotes)
                            const min = Math.min(...numVotes)
                            return (max - min) > 5
                          } else {
                            // For non-numeric decks, check for split votes (no consensus)
                            const votes = Object.values(lastRound.votes).filter(v => v !== '?')
                            if (votes.length < 2) return false
                            return new Set(votes).size > 1
                          }
                        })

                        if (unestimatedStories.length > 0) {
                          return (
                            <>
                              <Target className="h-4 w-4" />
                              <span className="font-medium">Next:</span>
                              <span className="text-muted-foreground">Estimate &quot;{unestimatedStories[0].title.length > 20 ? unestimatedStories[0].title.substring(0, 20) + '...' : unestimatedStories[0].title}&quot;</span>
                            </>
                          )
                        } else if (storiesNeedingReview.length > 0) {
                          return (
                            <>
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">Review:</span>
                              <span className="text-muted-foreground">
                                {session.deckType === 'fibonacci' || session.deckType === 'powers' 
                                  ? 'High variance stories need discussion'
                                  : 'Split vote stories need discussion'}
                              </span>
                            </>
                          )
                        } else if (session.stories.every(s => s.isEstimated)) {
                          return (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="font-medium">Complete:</span>
                              <span className="text-muted-foreground">All stories estimated successfully</span>
                            </>
                          )
                        } else {
                          return (
                            <>
                              <Plus className="h-4 w-4" />
                              <span className="font-medium">Ready:</span>
                              <span className="text-muted-foreground">Add stories to begin planning</span>
                            </>
                          )
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Session Info & Participants */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {session.name}
                </CardTitle>
                {session.description && (
                  <CardDescription className="text-slate-600 dark:text-slate-400 mt-2 max-h-32 overflow-y-auto text-xs leading-relaxed">
                    {session.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mobile: Simple horizontal list */}
                <div className="sm:hidden flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
                  <div className="text-center">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Deck</div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      {session.deckType === 'custom' ? 'Custom' : session.deckType}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Stories</div>
                    <div className="text-emerald-600 dark:text-emerald-400 font-medium">{session.stories.length}</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-slate-700 dark:text-slate-300">Done</div>
                    <div className="text-amber-600 dark:text-amber-400 font-medium">
                      {session.stories.filter(s => s.isEstimated).length}/{session.stories.length}
                    </div>
                  </div>
                </div>

                {/* Desktop: Original cards */}
                <div className="hidden sm:grid gap-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Estimation Deck</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-medium">
                      {session.deckType === 'custom' ? 'Custom' : session.deckType}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Stories</span>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-medium">
                      {session.stories.length}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Progress</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-medium">
                        {session.stories.filter(s => s.isEstimated).length} / {session.stories.length}
                      </Badge>
                      <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${session.stories.length > 0 ? (session.stories.filter(s => s.isEstimated).length / session.stories.length) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-3 font-bold text-slate-800 dark:text-slate-200">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Participants ({session.participants.filter(p => p.isOnline).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Mobile: 2-column grid layout */}
                <div className="sm:hidden">
                  <div className="grid grid-cols-2 gap-2">
                    {session.participants.filter(p => p.isOnline).map((participant) => (
                      <div 
                        key={participant.id} 
                        className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-6 h-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600">
                            {participant.isHost ? (
                              <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-slate-800"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                              {participant.name.length > 8 ? participant.name.substring(0, 8) + '...' : participant.name}
                            </span>
                            {participant.id === currentUserId && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">(You)</span>
                            )}
                          </div>
                          {participant.isHost && (
                            <span className="text-xs text-amber-600 dark:text-amber-400">Host</span>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {session.votingInProgress && session.currentStoryId && (
                            session.votesRevealed ? (
                              <span className="text-xs font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                                {participant.vote || '—'}
                              </span>
                            ) : (
                              <div>
                                {participant.vote !== null && participant.vote !== undefined ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Circle className="h-4 w-4 text-slate-400" />
                                )}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop: Original layout */}
                <div className="hidden sm:block space-y-2">
                  {session.participants.filter(p => p.isOnline).map((participant) => (
                    <div 
                      key={participant.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <div className="w-5 h-5 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600">
                            {participant.isHost ? (
                              <Crown className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-white dark:border-slate-800"></div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {participant.name}
                            {participant.id === currentUserId && (
                              <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                            )}
                          </span>
                          {participant.isHost && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 ml-1">• Host</span>
                          )}
                        </div>
                      </div>
                      <div>
                        {session.votingInProgress && session.currentStoryId && (
                          session.votesRevealed ? (
                            <span className="text-xs font-mono bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-2 py-1 rounded shadow-sm font-medium">
                              {participant.vote || '—'}
                            </span>
                          ) : (
                            <div className="relative">
                              {participant.vote !== null && participant.vote !== undefined ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Voted</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Circle className="h-4 w-4 text-slate-400" />
                                  <span className="text-xs text-slate-500 font-medium">Waiting</span>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Stories & Voting */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Current Story Voting Area */}
            {session.votingInProgress && currentStory && (
              <Card className="border-primary/50">
                <CardHeader>
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
                          <Button size="sm" onClick={() => handleEndVoting()}>
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
                  <div className="space-y-6">
                    {/* Estimation Cards */}
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
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
                    <div className="text-center space-y-3">
                      {session.votesRevealed ? (
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Eye className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800 dark:text-green-200">Votes Revealed</span>
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-300">
                            Review the results and discuss to reach consensus
                          </p>
                        </div>
                      ) : hasVoted ? (
                        allVoted ? (
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-2">
                              <Target className="h-5 w-5 text-amber-600" />
                              <span className="font-semibold text-amber-800 dark:text-amber-200">All Votes Cast</span>
                            </div>
                            <p className="text-sm text-amber-700 dark:text-amber-300">
                              Everyone has voted! Ready to reveal results.
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-1">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800 dark:text-green-200">Vote Submitted</span>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Waiting for {session.participants.filter(p => p.isOnline && (p.vote === null || p.vote === undefined)).length} more participant{session.participants.filter(p => p.isOnline && (p.vote === null || p.vote === undefined)).length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        )
                      ) : (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                          <div className="flex items-center justify-center gap-2">
                            <Target className="h-4 w-4 text-slate-500" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
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
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  User Stories ({session.stories.length})
                  {isHost && (
                    <Button size="sm" onClick={() => setShowAddStory(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Story
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {session.stories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No stories added yet.</p>
                      {isHost && <p className="text-sm">Add your first user story to start estimating!</p>}
                    </div>
                  ) : (
                    session.stories.map((story) => (
                      <div key={story.id}>
                        <div
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            story.id === session.currentStoryId ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/50'
                          }`}
                          onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium">{story.title}</h4>
                              {story.description && (
                                <p className="text-sm text-muted-foreground mt-1">{story.description}</p>
                              )}
                              {story.votingHistory && story.votingHistory.length > 0 && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {story.votingHistory.length} voting round{story.votingHistory.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Click to view details</span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                {story.isEstimated && story.estimate && (
                                  <Badge variant="secondary">{story.estimate}</Badge>
                                )}
                                {isHost && !session.votingInProgress && story.id !== session.currentStoryId && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleStartVoting(story.id)
                                    }}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
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
                                      setEditingStory({
                                        id: story.id,
                                        title: story.title,
                                        description: story.description || ''
                                      })
                                    }}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteStory(story.id, story.title)
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded voting history */}
                        {expandedStory === story.id && story.votingHistory && story.votingHistory.length > 0 && (
                          <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-muted">
                            <h5 className="font-medium mb-3 text-sm">Voting History</h5>
                            <div className="space-y-3">
                              {story.votingHistory.map((round, index) => (
                                <div key={round.id} className="bg-background/50 rounded p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Round {index + 1} • {round.timestamp.toLocaleString()}
                                    </span>
                                    {round.finalEstimate && (
                                      <Badge variant="secondary" className="text-xs">
                                        Final: {round.finalEstimate}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
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

                        {/* Edit story inline form */}
                        {editingStory && editingStory.id === story.id && (
                          <div className="mt-3 p-4 bg-muted/30 rounded-lg border border-muted">
                            <h5 className="font-medium mb-3 text-sm">Edit Story</h5>
                            <div className="space-y-3">
                              <div>
                                <Input
                                  placeholder="Story title (required)"
                                  value={editingStory.title}
                                  onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                                  className="text-sm"
                                />
                              </div>
                              <div>
                                <Textarea
                                  placeholder="Story description (optional)"
                                  value={editingStory.description}
                                  onChange={(e) => setEditingStory({ ...editingStory, description: e.target.value })}
                                  className="text-sm"
                                  rows={3}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleEditStory} disabled={!editingStory.title.trim()}>
                                  Save Changes
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingStory(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Add Story Modal */}
            {showAddStory && (
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>Add User Story</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Input
                      placeholder="Story title (required)"
                      value={newStory.title}
                      onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <Textarea
                      placeholder="Story description (optional)"
                      value={newStory.description}
                      onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddStory} disabled={!newStory.title.trim()}>
                      Add Story
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setShowAddStory(false)
                      setNewStory({ title: '', description: '' })
                    }}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>

      {/* Delete Story Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Story</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{storyToDelete?.title}&quot;? This action cannot be undone and will remove all voting history for this story.
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
    </div>
  )
}