// Sprint Management Types

export interface Sprint {
  // Basic Info
  id: string
  name: string
  description: string
  goal: string
  
  // Project Association
  projectId: string
  projectName: string     // Cached for display
  epicId?: string         // Optional epic filter
  epicName?: string       // Cached for display
  
  // Access Control
  password: string        // Hashed password for board access
  shareableLink: string   // Generated shareable URL
  isPublic: boolean       // Allow viewing without password
  
  // Sprint Duration
  startDate: Date
  endDate: Date
  duration: number        // Sprint length in days
  
  // Status & Lifecycle  
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  completedAt?: Date          // When sprint was completed (only for completed sprints)
  
  // Story Management
  stories: SprintStory[]
  backlogStoryIds: string[]     // Stories pulled from project backlog
  totalStoryPoints: number
  committedStoryPoints: number
  
  // Board Configuration
  columns: SprintColumn[]
  
  // Team & Collaboration
  hostId: string          // Sprint creator
  hostName: string        // Cached for display
  members: SprintMember[]
  participants: SprintParticipant[]   // Active collaborators
  
  // Velocity & Analytics
  velocity?: number       // Previous sprint velocity
  burndownData: BurndownPoint[]
  
  // Settings
  allowGuestAccess: boolean
  autoMoveToNextColumn: boolean
  requireEstimation: boolean
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  lastActivity: Date
  
  // Metrics (calculated on sprint completion)
  metrics?: SprintMetrics
}

export interface SprintStory {
  // Story Reference
  id: string              // Unique ID for sprint context
  originalStoryId: string // Reference to project story
  title: string
  description: string
  
  // Sprint-specific Status
  sprintStatus: 'todo' | 'in_progress' | 'review' | 'testing' | 'done'
  columnId: string        // Current column position
  position: number        // Position within column
  
  // Estimation & Planning
  storyPoints?: number
  timeEstimate?: string
  actualTime?: number     // Time spent (in hours)
  
  // Assignment & Ownership
  assignedTo?: string
  assignedToName?: string // Cached for display
  
  // Progress Tracking
  progress: number        // 0-100%
  blockers: SprintBlocker[]
  
  // Sprint-specific Comments & Updates
  sprintComments: SprintComment[]
  statusHistory: StatusChange[]
  
  // Original Story Data (cached for performance)
  originalData: {
    type: string
    priority: string
    acceptanceCriteria: string[]
    labels: string[]
  }
  
  // Metadata
  addedToSprintAt: Date
  startedAt?: Date
  completedAt?: Date
  lastUpdated: Date
}

export interface SprintColumn {
  id: string
  name: string
  status: 'todo' | 'in_progress' | 'review' | 'testing' | 'done'
  color: string           // Hex color for visual identification
  wipLimit?: number       // Work in progress limit
  position: number        // Column order
  isDefaultForStatus: boolean
}

export interface SprintMember {
  id: string
  name: string
  email?: string
  // NEW: Use actual team member roles instead of generic roles
  teamRole: TeamMemberRole
  // DEPRECATED: Keep for backward compatibility during transition
  role?: 'host' | 'member' | 'viewer'
  avatar?: string
  capacity?: number       // Hours per day available
  joinedAt: Date
  lastSeen: Date
  isOnline: boolean
  // NEW: Permission flags derived from team role
  isHost?: boolean        // True if sprint creator
}

export interface SprintParticipant {
  id: string              // Unique session ID
  name: string
  color: string           // Visual identifier for real-time presence
  cursor?: {
    x: number
    y: number
    cardId?: string       // Card being interacted with
  }
  isActive: boolean
  joinedAt: Date
  lastSeen: Date
}

export interface SprintComment {
  id: string
  text: string
  authorId: string
  authorName: string
  createdAt: Date
  type: 'comment' | 'status_change' | 'assignment' | 'blocker' | 'time_log'
  mentions?: string[]
  attachments?: string[]
}

export interface SprintBlocker {
  id: string
  description: string
  type: 'technical' | 'dependency' | 'external' | 'resource'
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
  resolvedAt?: Date
  createdBy: string
  assignedTo?: string
}

export interface StatusChange {
  id: string
  fromStatus: string
  toStatus: string
  changedBy: string
  changedByName: string
  timestamp: Date
  reason?: string
}

export interface BurndownPoint {
  date: Date
  remainingPoints: number
  completedPoints: number
  addedPoints?: number    // Scope changes
  idealRemaining: number  // Ideal burndown line
}

export interface SprintMetrics {
  // Velocity & Completion
  plannedPoints: number
  completedPoints: number
  carryOverPoints: number
  velocityAchieved: number
  completionRate: number          // % of stories completed
  
  // Time & Efficiency  
  averageCycleTime: number        // Hours from start to done
  averageLeadTime: number         // Hours from todo to done
  timeToFirstMove: number         // Hours from todo to in_progress
  
  // Team Performance
  teamUtilization: number         // % of available capacity used
  collaborationScore: number      // Based on comments, handoffs
  
  // Quality Metrics
  defectRate: number              // % of stories with bugs
  reworkRate: number              // % of stories moved backwards
  blockerImpact: number           // Hours lost to blockers
  
  // Flow Metrics
  throughput: number              // Stories completed per day
  wipEfficiency: number           // WIP limits adherence %
  flowPredictability: number      // Consistency of delivery
  
  // Sprint Health
  scopeChange: number             // % change in committed scope
  sprintGoalAchievement: number   // % of goal achieved (subjective)
  retrospectiveFeedback?: string  // Optional retrospective notes
}

// Access Control Types
export type TeamMemberRole = 'product_owner' | 'scrum_master' | 'business_analyst' | 'developer' | 'tester' | 'stakeholder'

export interface SprintAccess {
  sprintId: string
  participantId: string
  // NEW: Use actual team member roles instead of generic access levels
  teamRole: TeamMemberRole
  // DEPRECATED: Keep for backward compatibility, will be removed
  accessLevel?: 'view' | 'contribute' | 'admin'
  passwordRequired: boolean
  sessionToken?: string           // For password-verified sessions
  expiresAt?: Date
  grantedAt: Date
  grantedBy: string
  // NEW: User identification from team membership (optional - may not be provided)
  memberEmail?: string | undefined
  memberName?: string | undefined
}

// Real-time Collaboration Types
export interface SprintActivity {
  id: string
  type: 'story_move' | 'story_update' | 'comment_add' | 'member_join' | 'member_leave' | 'column_update'
  sprintId: string
  userId: string
  userName: string
  timestamp: Date
  data: Record<string, unknown>   // Activity-specific data
}

// Firestore Document Types (for proper timestamp handling)
export interface FirestoreSprint extends Omit<Sprint, 'createdAt' | 'updatedAt' | 'lastActivity' | 'startDate' | 'endDate' | 'completedAt' | 'stories' | 'burndownData' | 'members' | 'participants'> {
  createdAt: { toDate(): Date } | Date
  updatedAt: { toDate(): Date } | Date
  lastActivity: { toDate(): Date } | Date
  startDate: { toDate(): Date } | Date
  endDate: { toDate(): Date } | Date
  completedAt?: { toDate(): Date } | Date
  stories: FirestoreSprintStory[]
  burndownData: FirestoreBurndownPoint[]
  members: FirestoreSprintMember[]
  participants: FirestoreSprintParticipant[]
}

export interface FirestoreSprintStory extends Omit<SprintStory, 'addedToSprintAt' | 'startedAt' | 'completedAt' | 'lastUpdated' | 'sprintComments' | 'statusHistory' | 'blockers'> {
  addedToSprintAt: { toDate(): Date } | Date
  startedAt?: { toDate(): Date } | Date | null
  completedAt?: { toDate(): Date } | Date | null
  lastUpdated: { toDate(): Date } | Date
  sprintComments: FirestoreSprintComment[]
  statusHistory: FirestoreStatusChange[]
  blockers: FirestoreSprintBlocker[]
}

export interface FirestoreSprintComment extends Omit<SprintComment, 'createdAt'> {
  createdAt: { toDate(): Date } | Date
}

export interface FirestoreStatusChange extends Omit<StatusChange, 'timestamp'> {
  timestamp: { toDate(): Date } | Date
}

export interface FirestoreSprintBlocker extends Omit<SprintBlocker, 'createdAt' | 'resolvedAt'> {
  createdAt: { toDate(): Date } | Date
  resolvedAt?: { toDate(): Date } | Date | null
}

export interface FirestoreBurndownPoint extends Omit<BurndownPoint, 'date'> {
  date: { toDate(): Date } | Date
}

export interface FirestoreSprintMember extends Omit<SprintMember, 'joinedAt' | 'lastSeen'> {
  joinedAt: { toDate(): Date } | Date
  lastSeen: { toDate(): Date } | Date
}

export interface FirestoreSprintParticipant extends Omit<SprintParticipant, 'joinedAt' | 'lastSeen'> {
  joinedAt: { toDate(): Date } | Date
  lastSeen: { toDate(): Date } | Date
}

// API Request/Response Types
export interface CreateSprintRequest {
  name: string
  description: string
  goal: string
  projectId: string
  epicId?: string
  startDate: Date
  endDate: Date
  password: string
  storyIds: string[]              // Initial stories to include
  allowGuestAccess: boolean
  hostId: string                  // Sprint creator
  hostName: string                // Sprint creator name
}

export interface UpdateSprintRequest {
  name?: string
  description?: string
  goal?: string
  status?: Sprint['status']
  storyUpdates?: Array<{
    id: string
    sprintStatus?: SprintStory['sprintStatus']
    assignedTo?: string
    position?: number
    columnId?: string
  }>
}

export interface JoinSprintRequest {
  sprintId: string
  password?: string               // Required if sprint is password-protected
  participantName: string
  role?: 'viewer' | 'contributor'
}

export interface SprintBoardState {
  sprint: Sprint
  realTimeParticipants: SprintParticipant[]
  activities: SprintActivity[]
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
}

// Sprint Completion Types
export interface CompleteSprintRequest {
  sprintId: string
  completionReason: 'manual' | 'expired'
  retrospectiveNotes?: string
  storyNotes?: Record<string, string> // storyId -> story-specific retrospective notes
  nextSprintRecommendations?: string[]
  lessonsLearned?: string[]
  teamFeedback?: Record<string, string> // userId -> feedback
}

export interface SprintCompletionResult {
  completedStoryIds: string[]
  incompleteStoryIds: string[]
  revertedToBacklogIds: string[]
  metrics: SprintMetrics
  epicImpacts: Array<{
    epicId: string
    storiesReturned: number
    progressImpact: number // percentage change
  }>
  nextActions: string[]
}

export interface StoryReversionDetails {
  storyId: string
  originalStoryId: string
  title: string
  epicId?: string
  statusBefore: 'sprint_ready'
  statusAfter: 'backlog'
  progressReached: number
  stageReached: 'todo' | 'in_progress' | 'review' | 'testing'
  blockersEncountered: SprintBlocker[]
  timeSpentHours: number
  assignmentHistory: Array<{
    assignedTo: string
    duration: number
  }>
}