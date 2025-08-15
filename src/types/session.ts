export interface Participant {
  id: string
  name: string
  isHost: boolean
  isOnline: boolean
  lastSeen: Date
  vote?: string | null
}

export interface Story {
  id: string
  title: string
  description?: string
  estimate?: string | null
  isEstimated: boolean
  createdAt: Date
  votingHistory?: VotingRound[]
}

export interface VotingRound {
  id: string
  votes: { [participantId: string]: string }
  participantNames: { [participantId: string]: string }
  timestamp: Date
  finalEstimate?: string
}

export interface Session {
  id: string
  name: string
  description?: string
  hostId: string
  projectId?: string
  deckType: 'fibonacci' | 'tshirt' | 'powers' | 'custom'
  customDeck?: string[]
  participants: Participant[]
  stories: Story[]
  currentStoryId?: string | null
  votingInProgress: boolean
  votesRevealed: boolean
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface Vote {
  participantId: string
  storyId: string
  vote: string
  timestamp: Date
}