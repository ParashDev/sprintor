import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import type { Session, Participant, Story, Vote } from '@/types/session'

// Generate room codes
export function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Create a new session
export async function createSession(sessionData: Omit<Session, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const roomCode = generateRoomCode()
  const sessionRef = doc(db, 'sessions', roomCode)
  
  // Prepare session data, filtering out undefined values
  const session: Record<string, any> = {
    ...sessionData,
    id: roomCode,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }

  // Remove undefined fields to prevent Firestore errors
  Object.keys(session).forEach(key => {
    if (session[key] === undefined) {
      delete session[key]
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
    participants: data.participants?.map((p: Record<string, any>) => ({
      ...p,
      lastSeen: p.lastSeen?.toDate() || new Date()
    })) || [],
    stories: data.stories?.map((s: Record<string, any>) => ({
      ...s,
      createdAt: s.createdAt?.toDate() || new Date(),
      votingHistory: s.votingHistory?.map((round: Record<string, any>) => ({
        ...round,
        timestamp: round.timestamp?.toDate() || new Date()
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

    const data = doc.data()
    const session: Session = {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      participants: data.participants?.map((p: Record<string, any>) => ({
        ...p,
        lastSeen: p.lastSeen?.toDate() || new Date()
      })) || [],
      stories: data.stories?.map((s: Record<string, any>) => ({
        ...s,
        createdAt: s.createdAt?.toDate() || new Date(),
        votingHistory: s.votingHistory?.map((round: Record<string, any>) => ({
          ...round,
          timestamp: round.timestamp?.toDate() || new Date()
        })) || []
      })) || []
    } as Session

    callback(session)
  })
}

// Add participant to session
export async function joinSession(sessionId: string, participant: Omit<Participant, 'lastSeen'>): Promise<void> {
  const session = await getSession(sessionId)
  if (!session) throw new Error('Session not found')

  // Create participant with current timestamp
  const participantWithTimestamp = {
    ...participant,
    lastSeen: new Date()
  }

  // Add participant to existing participants array
  const updatedParticipants = [...session.participants, participantWithTimestamp]

  const sessionRef = doc(db, 'sessions', sessionId)
  await updateDoc(sessionRef, {
    participants: updatedParticipants.map(p => ({
      ...p,
      lastSeen: Timestamp.fromDate(p.lastSeen)
    })),
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
    participants: updatedParticipants.map(p => ({
      ...p,
      lastSeen: Timestamp.fromDate(p.lastSeen)
    })),
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
    participants: updatedParticipants.map(p => ({
      ...p,
      lastSeen: Timestamp.fromDate(p.lastSeen)
    })),
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
    participants: updatedParticipants.map(p => ({
      ...p,
      lastSeen: Timestamp.fromDate(p.lastSeen)
    })),
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

  // Create voting round record
  const votingRound: {
    id: string
    votes: Record<string, string>
    participantNames: Record<string, string>
    timestamp: Date
    finalEstimate?: string
  } = {
    id: Math.random().toString(36).substring(2, 9),
    votes: {},
    participantNames: {},
    timestamp: new Date(),
    ...(finalEstimate && { finalEstimate })
  }

  // Collect current votes and participant names
  session.participants.forEach(p => {
    if (p.vote !== null && p.vote !== undefined) {
      votingRound.votes[p.id] = p.vote
      votingRound.participantNames[p.id] = p.name
    }
  })

  // Update the story with voting history and final estimate
  const updatedStories = session.stories.map(s => 
    s.id === session.currentStoryId 
      ? { 
          ...s, 
          ...(finalEstimate && { estimate: finalEstimate }),
          isEstimated: !!finalEstimate,
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
  const updateData: Record<string, any> = {
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
    updatedAt: serverTimestamp()
  }

  updateData.currentStoryId = null

  await updateDoc(sessionRef, updateData)
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionRef = doc(db, 'sessions', sessionId)
  await deleteDoc(sessionRef)
}