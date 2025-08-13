"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Users, 
  Plus, 
  Play, 
  Eye, 
  Crown,
  Circle,
  CheckCircle2,
  Target
} from "lucide-react"
import { subscribeToSession, addStory, startVoting, castVote, revealVotes, endVoting, updateParticipantHeartbeat, cleanupInactiveParticipants, joinSession } from "@/lib/session-service"
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

  useEffect(() => {
    const userId = localStorage.getItem('sprintor_user_id')
    const userName = localStorage.getItem('sprintor_user_name')
    const currentSessionData = localStorage.getItem('sprintor_current_session')
    
    if (!userId || !userName) {
      router.push('/join')
      return
    }
    
    setCurrentUserId(userId)
    
    // Clean up the fresh parameter from URL after processing
    if (isFreshJoin) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
    
    // Check if there's stored session data for potential reconnection
    // Only show reconnect modal if this is NOT a fresh join from create/join pages
    if (currentSessionData && !isFreshJoin) {
      try {
        const sessionInfo = JSON.parse(currentSessionData)
        if (sessionInfo.sessionId === sessionId) {
          setStoredSessionInfo(sessionInfo)
          // Show modal after a short delay to let session load first
          setTimeout(() => setShowReconnectModal(true), 1000)
        }
      } catch (error) {
        console.error('Error parsing stored session data:', error)
        localStorage.removeItem('sprintor_current_session')
      }
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
  }, [sessionId, router])

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
        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Left Sidebar - Session Info & Participants */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  {session.name}
                </CardTitle>
                {session.description && (
                  <CardDescription className="text-slate-600 dark:text-slate-400 mt-2">
                    {session.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
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
                <div className="space-y-3">
                  {session.participants.filter(p => p.isOnline).map((participant) => (
                    <div 
                      key={participant.id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-600">
                            {participant.isHost ? (
                              <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                {participant.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            {participant.name}
                            {participant.id === currentUserId && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium">(You)</span>
                            )}
                          </span>
                          {participant.isHost && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Session Host</span>
                          )}
                        </div>
                      </div>
                      <div>
                        {session.votingInProgress && session.currentStoryId && (
                          session.votesRevealed ? (
                            <span className="text-sm font-mono bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-3 py-1 rounded-lg shadow-sm font-medium">
                              {participant.vote || '—'}
                            </span>
                          ) : (
                            <div className="relative">
                              {participant.vote !== null && participant.vote !== undefined ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Voted</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Circle className="h-5 w-5 text-slate-400" />
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
                    <CardDescription>{currentStory.description}</CardDescription>
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
    </div>
  )
}