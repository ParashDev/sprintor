'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { 
  Sprint, 
  SprintParticipant, 
  SprintActivity,
  SprintAccess 
} from '@/types/sprint'
import { 
  subscribeToSprint, 
  subscribeToSprintActivities,
  addSprintParticipant,
  removeSprintParticipant 
} from '@/lib/sprint-service'
import { 
  verifyAccessToken,
  refreshAccessToken 
} from '@/lib/sprint-access-service'

interface UseSprintCollaborationProps {
  sprintId: string
  accessToken: string
  participantId: string
  participantName: string
}

interface UseSprintCollaborationReturn {
  sprint: Sprint | null
  participants: SprintParticipant[]
  activities: SprintActivity[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  accessLevel: 'view' | 'contribute' | 'admin'
  isValid: boolean
  error: string | null
  updateCursor: (x: number, y: number, cardId?: string) => void
  leaveSprint: () => void
}

export function useSprintCollaboration(
  params: UseSprintCollaborationProps | null
): UseSprintCollaborationReturn {
  // Extract params safely
  const sprintId = params?.sprintId
  const accessToken = params?.accessToken
  const participantId = params?.participantId
  const participantName = params?.participantName
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [participants, setParticipants] = useState<SprintParticipant[]>([])
  const [activities, setActivities] = useState<SprintActivity[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting')
  const [accessLevel, setAccessLevel] = useState<'view' | 'contribute' | 'admin'>('view')
  const [isValid, setIsValid] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const cursorUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const sprintUnsubscribeRef = useRef<(() => void) | null>(null)
  const activitiesUnsubscribeRef = useRef<(() => void) | null>(null)
  const participantRef = useRef<SprintParticipant | null>(null)

  // Early return if params are null
  const isInitialized = !!(sprintId && accessToken && participantId && participantName)
  
  // Set disconnected status if not initialized
  useEffect(() => {
    if (!isInitialized) {
      setConnectionStatus('disconnected')
      setError('Sprint parameters not available')
    }
  }, [isInitialized])

  // Generate participant color
  const generateParticipantColor = useCallback(() => {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // green
      '#F59E0B', // yellow
      '#8B5CF6', // purple
      '#06B6D4', // cyan
      '#F97316', // orange
      '#84CC16', // lime
      '#EC4899', // pink
      '#6B7280'  // gray
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  // Verify access token and set up initial state
  useEffect(() => {
    if (!isInitialized) return
    
    let mounted = true

    const verifyAccess = async () => {
      try {
        setConnectionStatus('connecting')
        const verification = await verifyAccessToken(accessToken!)
        
        if (!mounted) return

        if (verification.valid && verification.access) {
          setAccessLevel(verification.access.accessLevel)
          setIsValid(true)
          setError(null)
        } else {
          setIsValid(false)
          setError(verification.error || 'Access token is invalid')
          setConnectionStatus('error')
        }
      } catch (err) {
        if (!mounted) return
        console.error('Error verifying access token:', err)
        setError('Failed to verify access')
        setConnectionStatus('error')
        setIsValid(false)
      }
    }

    verifyAccess()

    return () => {
      mounted = false
    }
  }, [accessToken, isInitialized])

  // Set up real-time sprint subscription
  useEffect(() => {
    if (!isInitialized || !isValid) return

    setConnectionStatus('connecting')

    // Subscribe to sprint updates
    const sprintUnsubscribe = subscribeToSprint(sprintId, (updatedSprint) => {
      if (updatedSprint) {
        setSprint(updatedSprint)
        setParticipants(updatedSprint.participants)
        setConnectionStatus('connected')
        setError(null)
      } else {
        setConnectionStatus('error')
        setError('Sprint not found or access denied')
      }
    })

    sprintUnsubscribeRef.current = sprintUnsubscribe

    return () => {
      if (sprintUnsubscribeRef.current) {
        sprintUnsubscribeRef.current()
        sprintUnsubscribeRef.current = null
      }
    }
  }, [sprintId, isValid, isInitialized])

  // Set up real-time activities subscription
  useEffect(() => {
    if (!isInitialized || !isValid) return

    const activitiesUnsubscribe = subscribeToSprintActivities(sprintId, (newActivities) => {
      setActivities(newActivities)
    })

    activitiesUnsubscribeRef.current = activitiesUnsubscribe

    return () => {
      if (activitiesUnsubscribeRef.current) {
        activitiesUnsubscribeRef.current()
        activitiesUnsubscribeRef.current = null
      }
    }
  }, [sprintId, isValid, isInitialized])

  // Join sprint as participant
  useEffect(() => {
    if (!isInitialized || !sprint || !isValid || connectionStatus !== 'connected') return

    const participant: SprintParticipant = {
      id: participantId,
      name: participantName,
      color: generateParticipantColor(),
      isActive: true,
      joinedAt: new Date(),
      lastSeen: new Date()
    }

    participantRef.current = participant

    // Add participant to sprint
    addSprintParticipant(sprintId, participant).catch(error => {
      console.error('Error adding participant:', error)
      setError('Failed to join sprint')
    })

  }, [sprint, sprintId, participantId, participantName, isValid, connectionStatus, generateParticipantColor, isInitialized])

  // Set up heartbeat to maintain presence
  useEffect(() => {
    if (!isInitialized || !isValid || connectionStatus !== 'connected') return

    // Send heartbeat every 30 seconds
    const sendHeartbeat = async () => {
      try {
        await refreshAccessToken(accessToken)
        
        // Update participant last seen
        if (participantRef.current && sprint) {
          const updatedParticipants = sprint.participants.map(p => 
            p.id === participantId 
              ? { ...p, lastSeen: new Date(), isActive: true }
              : p
          )
          
          // Update sprint participants without triggering full update
          setSprint(prev => prev ? { ...prev, participants: updatedParticipants } : prev)
        }
      } catch (error) {
        console.error('Heartbeat failed:', error)
        setConnectionStatus('error')
        setError('Connection lost')
      }
    }

    // Send initial heartbeat
    sendHeartbeat()

    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [isValid, connectionStatus, accessToken, participantId, sprint, isInitialized])

  // Update cursor position for real-time collaboration
  const updateCursor = useCallback((x: number, y: number, cardId?: string) => {
    if (!isValid || accessLevel === 'view') return

    // Debounce cursor updates
    if (cursorUpdateTimeoutRef.current) {
      clearTimeout(cursorUpdateTimeoutRef.current)
    }

    cursorUpdateTimeoutRef.current = setTimeout(() => {
      if (participantRef.current && sprint) {
        const updatedParticipants = sprint.participants.map(p => 
          p.id === participantId 
            ? { 
                ...p, 
                cursor: { x, y, cardId },
                lastSeen: new Date()
              }
            : p
        )
        
        setSprint(prev => prev ? { ...prev, participants: updatedParticipants } : prev)
      }
    }, 100) // Update cursor position every 100ms at most
  }, [isValid, accessLevel, participantId, sprint, isInitialized])

  // Leave sprint
  const leaveSprint = useCallback(async () => {
    try {
      // Remove participant from sprint
      if (sprint && participantRef.current) {
        await removeSprintParticipant(sprintId, participantId)
      }

      // Clean up subscriptions
      if (sprintUnsubscribeRef.current) {
        sprintUnsubscribeRef.current()
        sprintUnsubscribeRef.current = null
      }
      
      if (activitiesUnsubscribeRef.current) {
        activitiesUnsubscribeRef.current()
        activitiesUnsubscribeRef.current = null
      }

      // Clear intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current)
      }

      setConnectionStatus('disconnected')
    } catch (error) {
      console.error('Error leaving sprint:', error)
    }
  }, [sprint, sprintId, participantId, isInitialized])

  // Handle mouse move for cursor tracking
  useEffect(() => {
    if (!isInitialized || !isValid || accessLevel === 'view') return

    const handleMouseMove = (e: MouseEvent) => {
      updateCursor(e.clientX, e.clientY)
    }

    // Track mouse movement with throttling
    let throttleTimeout: NodeJS.Timeout | null = null
    const throttledMouseMove = (e: MouseEvent) => {
      if (throttleTimeout) return
      
      throttleTimeout = setTimeout(() => {
        handleMouseMove(e)
        throttleTimeout = null
      }, 100)
    }

    window.addEventListener('mousemove', throttledMouseMove)

    return () => {
      window.removeEventListener('mousemove', throttledMouseMove)
      if (throttleTimeout) {
        clearTimeout(throttleTimeout)
      }
    }
  }, [isValid, accessLevel, updateCursor, isInitialized])

  // Handle page visibility to pause/resume presence
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Page is hidden - mark participant as inactive
        if (participantRef.current && sprint) {
          const updatedParticipants = sprint.participants.map(p => 
            p.id === participantId 
              ? { ...p, isActive: false, lastSeen: new Date() }
              : p
          )
          setSprint(prev => prev ? { ...prev, participants: updatedParticipants } : prev)
        }
      } else {
        // Page is visible again - mark participant as active
        if (participantRef.current && sprint) {
          const updatedParticipants = sprint.participants.map(p => 
            p.id === participantId 
              ? { ...p, isActive: true, lastSeen: new Date() }
              : p
          )
          setSprint(prev => prev ? { ...prev, participants: updatedParticipants } : prev)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [participantId, sprint, isInitialized])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveSprint()
    }
  }, [leaveSprint])

  return {
    sprint,
    participants,
    activities,
    connectionStatus,
    accessLevel,
    isValid,
    error,
    updateCursor,
    leaveSprint
  }
}

export default useSprintCollaboration