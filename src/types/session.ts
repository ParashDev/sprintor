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
  originalStoryId?: string  // Reference to the project story this came from
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
  projectName?: string      // Project name for display (stored to avoid permission issues)
  epicId?: string           // Links session to specific epic
  epicName?: string         // Display name for UI
  epicColor?: string        // Epic color for visual identification
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