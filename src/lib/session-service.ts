import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore'
import { db } from './firebase'
import type { Session, Participant, Story } from '@/types/session'

// Firestore document types for proper timestamp handling
interface FirestoreDoc {
  [key: string]: unknown
}

interface FirestoreParticipant {
  id: string
  name: string
  isHost: boolean
  isOnline: boolean
  lastSeen: { toDate(): Date } | Date
  vote?: string | null
}

interface FirestoreStory {
  id: string
  title: string
  description?: string
  estimate?: string | null
  isEstimated: boolean
  createdAt: { toDate(): Date } | Date
  votingHistory?: FirestoreVotingRound[]
}

interface FirestoreVotingRound {
  id: string
  votes: Record<string, string>
  participantNames: Record<string, string>
  timestamp: { toDate(): Date } | Date
  finalEstimate?: string
}

// Generate room codes
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Helper function to clean participant data for Firestore
function cleanParticipantsForFirestore(participants: Participant[]): Record<string, unknown>[] {
  return participants.map(p => {
    const cleanParticipant: Record<string, unknown> = {}
    Object.entries(p).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'lastSeen') {
          cleanParticipant[key] = Timestamp.fromDate(value as Date)
        } else {
          cleanParticipant[key] = value
        }
      }
    })
    return cleanParticipant
  })
}

// Create a new session
export async function createSession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const roomCode = generateRoomCode()
  const sessionRef = doc(db, 'sessions', roomCode)
  
  // Prepare session data, filtering out undefined values
  const sessionBase = {
    ...sessionData,
    id: roomCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  // Remove undefined fields to prevent Firestore errors
  const session: FirestoreDoc = {}
  Object.entries(sessionBase).forEach(([key, value]) => {
    if (value !== undefined) {
      session[key] = value
    }
  })

  await setDoc(sessionRef, session)
  
  return roomCode
}

// Get session by ID
export async function getSession(sessionId: string): Promise<Session | null> {
  const sessionRef = doc(db, 'sessions', sessionId)
  const sessionSnap = await getDoc(sessionRef)
  
  if (!sessionSnap.exists()) {
    return null
  }

  const data = sessionSnap.data()
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    participants: data.participants?.map((p: FirestoreParticipant) => ({
      ...p,
      lastSeen: 'toDate' in p.lastSeen ? p.lastSeen.toDate() : p.lastSeen
    })) || [],
    stories: data.stories?.map((s: FirestoreStory) => ({
      ...s,
      createdAt: 'toDate' in s.createdAt ? s.createdAt.toDate() : s.createdAt,
      votingHistory: s.votingHistory?.map((round: FirestoreVotingRound) => ({
        ...round,
        timestamp: 'toDate' in round.timestamp ? round.timestamp.toDate() : round.timestamp
      })) || []
    })) || []
  } as Session
}

// Subscribe to session updates
export function subscribeToSession(sessionId: string, callback: (session: Session | null) => void) {
  const sessionRef = doc(db, 'sessions', sessionId)
  
  return onSnapshot(sessionRef, (doc) => {
    if (!doc.exists()) {
      callback(null)
      return
    }

    try {
      const data = doc.data()
      
      const session: Session = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        participants: data.participants?.map((p: FirestoreParticipant) => ({
          ...p,
          lastSeen: 'toDate' in p.lastSeen ? p.lastSeen.toDate() : p.lastSeen
        })) || [],
        stories: data.stories?.map((s: FirestoreStory) => ({
          ...s,
          createdAt: 'toDate' in s.createdAt ? s.createdAt.toDate() : s.createdAt,
          votingHistory: s.votingHistory?.map((round: FirestoreVotingRound) => ({
            ...round,
            timestamp: 'toDate' in round.timestamp ? round.timestamp.toDate() : round.timestamp
          })) || []
        })) || []
      } as Session

      callback(session)
    } catch (error) {
      console.error('Error processing session data:', error)
      callback(null)
    }
  }, (error) => {
    console.error('Firestore subscription error:', error)
    callback(null)
  })
}

// Add participant to session (or reconnect existing)
export async function joinSession(sessionId: string, participant: Omit<Participant, 'lastSeen'>): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) throw new Error('Session not found')

  // Create participant with current timestamp
  const participantWithTimestamp = {
    ...participant,
    lastSeen: new Date()
  }

  // Check if participant with same name or ID already exists (for reconnection)
  const existingParticipantByName = session.participants.findIndex(
    p => p.name.toLowerCase() === participant.name.toLowerCase()
  )
  const existingParticipantById = session.participants.findIndex(
    p => p.id === participant.id
  )

  let updatedParticipants
  
  // Prioritize ID match, then name match for reconnection
  const existingIndex = existingParticipantById >= 0 ? existingParticipantById : existingParticipantByName
  
  if (existingIndex >= 0) {
    // Update existing participant (reconnection case)
    updatedParticipants = [...session.participants]
    updatedParticipants[existingIndex] = {
      ...updatedParticipants[existingIndex],
      id: participant.id, // Ensure ID is updated
      name: participant.name, // Ensure name is updated
      isHost: participant.isHost, // Preserve host status
      isOnline: true,
      lastSeen: new Date(),
      vote: updatedParticipants[existingIndex].vote // Preserve any existing vote
    }
    console.log(`Reconnected participant: ${participant.name}`)
  } else {
    // Add new participant
    updatedParticipants = [...session.participants, participantWithTimestamp]
    console.log(`Added new participant: ${participant.name}`)
  }

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
}

// Update participant status
export async function updateParticipant(sessionId: string, participantId: string, updates: Partial<Participant>): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedParticipants = session.participants.map(p => 
    p.id === participantId ? { ...p, ...updates, lastSeen: new Date() } : p
  )

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
}

// Remove participant from session
export async function leaveSession(sessionId: string, participantId: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedParticipants = session.participants.filter(p => p.id !== participantId)
  
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
}

// Mark participant as offline (alternative to removing)
export async function markParticipantOffline(sessionId: string, participantId: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedParticipants = session.participants.map(p => 
    p.id === participantId ? { ...p, isOnline: false, lastSeen: new Date() } : p
  )

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
}

// Add story to session
export async function addStory(sessionId: string, story: Omit<Story, 'id' | 'createdAt'>): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const newStory: Story = {
    ...story,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date()
  }

  const updatedStories = [...session.stories, newStory]
  
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    stories: updatedStories.map(s => ({
      ...s,
      createdAt: Timestamp.fromDate(s.createdAt)
    })),
    updatedAt: serverTimestamp()
  })
}

// Edit story in session
export async function editStory(sessionId: string, storyId: string, updates: Partial<Pick<Story, 'title' | 'description'>>): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedStories = session.stories.map(s => 
    s.id === storyId ? { ...s, ...updates } : s
  )
  
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    stories: updatedStories.map(s => ({
      ...s,
      createdAt: Timestamp.fromDate(s.createdAt),
      votingHistory: s.votingHistory?.map(round => ({
        ...round,
        timestamp: Timestamp.fromDate(round.timestamp)
      })) || []
    })),
    updatedAt: serverTimestamp()
  })
}

// Delete story from session
export async function deleteStory(sessionId: string, storyId: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedStories = session.stories.filter(s => s.id !== storyId)
  
  const sessionRef = doc(db, 'sessions', sessionId)
  
  // If the story being deleted is currently being voted on, stop voting
  const updateData: Record<string, any> = {
    stories: updatedStories.map(s => ({
      ...s,
      createdAt: Timestamp.fromDate(s.createdAt),
      votingHistory: s.votingHistory?.map(round => ({
        ...round,
        timestamp: Timestamp.fromDate(round.timestamp)
      })) || []
    })),
    updatedAt: serverTimestamp()
  }
  
  if (session.currentStoryId === storyId) {
    updateData.currentStoryId = null
    updateData.votingInProgress = false
    updateData.votesRevealed = false
    // Clear all votes
    updateData.participants = session.participants.map(p => ({
      ...p,
      vote: null,
      lastSeen: Timestamp.fromDate(p.lastSeen)
    }))
  }
  
  await updateDoc(sessionRef, updateData)
}

// Start voting for a story
export async function startVoting(sessionId: string, storyId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    currentStoryId: storyId,
    votingInProgress: true,
    votesRevealed: false,
    updatedAt: serverTimestamp()
  })
  
  // Clear previous votes for this story
  const session = await getSession(sessionId)
  if (session) {
    const updatedParticipants = session.participants.map(p => ({
      ...p,
      vote: null
    }))
    
    await updateDoc(sessionRef, {
      participants: updatedParticipants.map(p => ({
        ...p,
        lastSeen: Timestamp.fromDate(p.lastSeen)
      }))
    })
  }
}

// Cast vote
export async function castVote(sessionId: string, participantId: string, vote: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedParticipants = session.participants.map(p => 
    p.id === participantId ? { ...p, vote, lastSeen: new Date() } : p
  )

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
}

// Reveal votes
export async function revealVotes(sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    votesRevealed: true,
    updatedAt: serverTimestamp()
  })
}

// End voting
export async function endVoting(sessionId: string, finalEstimate?: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session || !session.currentStoryId) return

  // Collect current votes and participant names
  const votes: Record<string, string> = {}
  const participantNames: Record<string, string> = {}
  
  session.participants.forEach(p => {
    if (p.vote !== null && p.vote !== undefined) {
      votes[p.id] = p.vote
      participantNames[p.id] = p.name
    }
  })

  // Auto-calculate final estimate if not provided
  let calculatedEstimate = finalEstimate
  if (!finalEstimate && Object.keys(votes).length > 0) {
    const voteValues = Object.values(votes).filter(v => v !== '?')
    
    if (voteValues.length > 0) {
      if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
        // For numeric decks, use average or most common value
        const numericVotes = voteValues.filter(v => !isNaN(parseFloat(v))).map(v => parseFloat(v))
        if (numericVotes.length > 0) {
          const avg = numericVotes.reduce((sum, val) => sum + val, 0) / numericVotes.length
          // Round to nearest deck value
          const deckValues = session.deckType === 'fibonacci' 
            ? [1, 2, 3, 5, 8, 13, 21] 
            : [1, 2, 4, 8, 16, 32]
          const closest = deckValues.reduce((prev, curr) => 
            Math.abs(curr - avg) < Math.abs(prev - avg) ? curr : prev
          )
          calculatedEstimate = closest.toString()
        }
      } else {
        // For non-numeric decks (T-shirt, custom), use most common vote
        const counts: Record<string, number> = {}
        voteValues.forEach(v => counts[v] = (counts[v] || 0) + 1)
        const sortedVotes = Object.entries(counts).sort((a, b) => b[1] - a[1])
        if (sortedVotes.length > 0) {
          calculatedEstimate = sortedVotes[0][0]
        }
      }
    }
  }

  // Create voting round record
  const votingRound: {
    id: string
    votes: Record<string, string>
    participantNames: Record<string, string>
    timestamp: Date
    finalEstimate?: string
  } = {
    id: Math.random().toString(36).substring(2, 9),
    votes,
    participantNames,
    timestamp: new Date(),
    ...(calculatedEstimate && { finalEstimate: calculatedEstimate })
  }

  // Update the story with voting history and final estimate
  const updatedStories = session.stories.map(s => 
    s.id === session.currentStoryId 
      ? { 
          ...s, 
          ...(calculatedEstimate && { estimate: calculatedEstimate }),
          isEstimated: !!calculatedEstimate,
          votingHistory: [...(s.votingHistory || []), votingRound]
        }
      : s
  )

  // Clear all participant votes
  const updatedParticipants = session.participants.map(p => ({
    ...p,
    vote: null,
    lastSeen: p.lastSeen
  }))

  const sessionRef = doc(db, 'sessions', sessionId)
  
  // Prepare update data
  const updateData = {
    stories: updatedStories.map(s => ({
      ...s,
      createdAt: Timestamp.fromDate(s.createdAt),
      votingHistory: s.votingHistory?.map(round => ({
        ...round,
        timestamp: Timestamp.fromDate(round.timestamp)
      })) || []
    })),
    participants: updatedParticipants.map(p => ({
      ...p,
      lastSeen: Timestamp.fromDate(p.lastSeen)
    })),
    votingInProgress: false,
    votesRevealed: false,
    currentStoryId: null,
    updatedAt: serverTimestamp()
  }

  await updateDoc(sessionRef, updateData)
}

// End session (mark as inactive and all participants offline)
export async function endSession(sessionId: string): Promise<void> {
  console.log('Ending session:', sessionId)
  const session = await getSession(sessionId)
  if (!session) return

  // Mark all participants as offline
  const updatedParticipants = session.participants.map(p => ({
    ...p,
    isOnline: false,
    lastSeen: new Date()
  }))

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    isActive: false,
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
  console.log('Session ended successfully, all participants marked offline')
}

// Update participant heartbeat
export async function updateParticipantHeartbeat(sessionId: string, participantId: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const updatedParticipants = session.participants.map(p => 
    p.id === participantId ? { ...p, lastSeen: new Date(), isOnline: true } : p
  )

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: cleanParticipantsForFirestore(updatedParticipants),
    updatedAt: serverTimestamp()
  })
}

// Check for inactive participants (haven't sent heartbeat in 2 minutes)
export async function cleanupInactiveParticipants(sessionId: string): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) return

  const now = new Date()
  const inactiveThreshold = 2 * 60 * 1000 // 2 minutes
  const removeThreshold = 10 * 60 * 1000 // 10 minutes - remove completely after this

  let updatedParticipants = session.participants.map(p => {
    const timeSinceLastSeen = now.getTime() - p.lastSeen.getTime()
    return timeSinceLastSeen > inactiveThreshold 
      ? { ...p, isOnline: false }
      : p
  })

  // Remove participants that have been offline for more than 10 minutes
  // (but keep the host even if offline)
  updatedParticipants = updatedParticipants.filter(p => {
    const timeSinceLastSeen = now.getTime() - p.lastSeen.getTime()
    return p.isHost || timeSinceLastSeen <= removeThreshold
  })

  // Only update if there were changes
  const hasChanges = updatedParticipants.length !== session.participants.length || 
    updatedParticipants.some((p, index) => 
      !session.participants[index] || p.isOnline !== session.participants[index].isOnline
    )

  if (hasChanges) {
    const sessionRef = doc(db, 'sessions', sessionId)
    await updateDoc(sessionRef, {
      participants: updatedParticipants.map(p => ({
        ...p,
        lastSeen: Timestamp.fromDate(p.lastSeen)
      })),
      updatedAt: serverTimestamp()
    })
  }
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  await deleteDoc(sessionRef)
}

// Get sessions by host (for dashboard)
export async function getSessionsByHost(hostId: string, limitCount: number = 10): Promise<Session[]> {
  try {
    const sessionsRef = collection(db, 'sessions')
    const q = query(
      sessionsRef,
      where('hostId', '==', hostId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const sessions: Session[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      
      const session: Session = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        participants: data.participants?.map((p: FirestoreParticipant) => ({
          ...p,
          lastSeen: 'toDate' in p.lastSeen ? p.lastSeen.toDate() : p.lastSeen
        })) || [],
        stories: data.stories?.map((s: FirestoreStory) => ({
          ...s,
          createdAt: 'toDate' in s.createdAt ? s.createdAt.toDate() : s.createdAt,
          votingHistory: s.votingHistory?.map((round: FirestoreVotingRound) => ({
            ...round,
            timestamp: 'toDate' in round.timestamp ? round.timestamp.toDate() : round.timestamp
          })) || []
        })) || []
      } as Session
      
      sessions.push(session)
    })
    
    return sessions
  } catch (error) {
    console.error('Error fetching sessions by host:', error)
    return []
  }
}

// Get session statistics for dashboard
export async function getSessionStats(hostId: string): Promise<{
  totalSessions: number
  storiesEstimated: number
  teamMembers: number
  avgEstimationTime: string
}> {
  try {
    const sessions = await getSessionsByHost(hostId, 100) // Get more for stats
    
    const totalSessions = sessions.length
    let totalStoriesEstimated = 0
    const uniqueParticipants = new Set<string>()
    
    sessions.forEach(session => {
      // Count estimated stories
      totalStoriesEstimated += session.stories.filter(s => s.isEstimated).length
      
      // Count unique participants (excluding host)
      session.participants.forEach(p => {
        if (!p.isHost) {
          uniqueParticipants.add(p.name.toLowerCase())
        }
      })
    })
    
    return {
      totalSessions,
      storiesEstimated: totalStoriesEstimated,
      teamMembers: uniqueParticipants.size,
      avgEstimationTime: '--' // Calculate this later if needed
    }
  } catch (error) {
    console.error('Error calculating session stats:', error)
    return {
      totalSessions: 0,
      storiesEstimated: 0,
      teamMembers: 0,
      avgEstimationTime: '--'
    }
  }
}