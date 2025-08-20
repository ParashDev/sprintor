export interface Participant {
  id: string
  name: string
  isHost: boolean
  isOnline: boolean
  lastSeen: Date
  vote?: string | null
}

// Comprehensive metrics captured when session ends
export interface SessionMetrics {
  totalStoryPoints: number           // Sum of all estimated story points (numeric decks only)
  averagePoints: number              // Average story points per story
  mostCommonEstimate?: string        // Most common estimate (T-shirt sizes)
  consensusRate: number              // % of stories that reached consensus in first round
  participationRate: number          // % of possible votes that were cast
  highVarianceStories: number        // Count of stories with significant voting disagreement
  reVotingRate: number              // % of stories that needed multiple voting rounds
  sessionDurationMinutes: number     // Total session duration in minutes
  totalVotingRounds: number         // Total number of voting rounds across all stories
  storiesEstimated: number          // Count of stories that got estimates
  storiesNotEstimated: number       // Count of stories without estimates
  deckTypeUsed: string              // Deck type used for estimation
  uniqueParticipants: number        // Number of unique participants (excluding host)
  averageVotesPerRound: number      // Average number of votes per voting round
  epicSpecificMetrics?: {
    epicId: string
    epicName: string
    epicColor: string
    storiesFromEpic: number
    epicCompletionRate: number     // % of epic stories that were estimated
  }
}

// NOTE: Story interface removed - sessions now use Story from @/types/story
// Session stories are minimal representations for voting only:
// { id, title, description, estimate, isEstimated, createdAt, votingHistory, originalStoryId }

export interface VotingRound {
  id: string
  votes: { [participantId: string]: string }
  participantNames: { [participantId: string]: string }
  timestamp: Date
  finalEstimate?: string
}

// Minimal story representation for voting sessions
export interface SessionStory {
  id: string
  title: string
  description?: string
  estimate?: string | null
  isEstimated: boolean
  createdAt: Date
  votingHistory?: VotingRound[]
  originalStoryId?: string  // Reference to the project story this came from
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
  stories: SessionStory[]
  currentStoryId?: string | null
  votingInProgress: boolean
  votesRevealed: boolean
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  metrics?: SessionMetrics  // Comprehensive metrics stored when session ends
}

export interface Vote {
  participantId: string
  storyId: string
  vote: string
  timestamp: Date
}