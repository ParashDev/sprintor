// Story Management Types

export interface StoryTemplate {
  // Basic Info
  id: string
  name: string
  category: 'feature' | 'bug' | 'technical' | 'research' | 'epic'
  description: string
  isDefault: boolean
  
  // User Story Format
  asA: string
  iWant: string
  soThat: string
  
  // Alternative Formats
  given?: string
  when?: string
  then?: string
  
  // Business Value & Prioritization
  defaultBusinessValue: number  // 1-10 scale
  defaultPriority: 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have'
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  complexity: 'Simple' | 'Moderate' | 'Complex' | 'Epic'
  
  // Estimation
  suggestedStoryPoints?: number[]
  defaultTimeEstimate?: string
  
  // Acceptance Criteria Templates
  defaultAcceptanceCriteria: string[]
  
  // Suggested Fields
  suggestedLabels: string[]
  suggestedDependencies?: string[]
  suggestedTestScenarios?: string[]
  
  // Requirements
  performanceRequirements?: string
  securityConsiderations?: string
  accessibilityRequirements?: string
  
  // Bug-specific
  bugReproductionSteps?: string[]
  
  // Documentation
  suggestedAttachments?: string[]
  relatedDocumentation?: string[]
  
  // Stakeholders
  suggestedStakeholders?: string[]
  
  // Metadata
  createdAt: Date
  createdBy: string
  projectId?: string
  lastUsed?: Date
  usageCount: number
}

export interface Story {
  // Basic Info
  id: string
  title: string
  description: string
  type: 'story' | 'task' | 'bug' | 'spike'
  
  // User Story Format
  asA?: string
  iWant?: string
  soThat?: string
  
  // Business Details
  businessValue: number
  priority: 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have'
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'
  complexity: 'Simple' | 'Moderate' | 'Complex' | 'Epic'
  
  // Acceptance Criteria & Requirements
  acceptanceCriteria: AcceptanceCriterion[]
  definitionOfDone: string[]
  functionalRequirements: string[]
  nonFunctionalRequirements: string[]
  businessRules: string[]
  
  // Estimation & Planning
  storyPoints?: number
  timeEstimate?: string
  estimationConfidence: 'Low' | 'Medium' | 'High'
  
  // Sprint & Release Management
  sprintId?: string
  releaseId?: string
  milestoneId?: string
  
  // Hierarchy & Relationships
  epicId?: string
  parentStoryId?: string
  childStoryIds: string[]
  dependencyIds: string[]
  blockedByIds: string[]
  relatedStoryIds: string[]
  
  // Status & Workflow - Complete story lifecycle
  status: 'backlog' | 'planning' | 'sprint_ready' | 'completed'
  workflowStatus?: string
  blockers: Blocker[]
  
  // Assignment & Ownership
  assignedTo?: string
  reportedBy: string
  productOwner?: string
  stakeholders: string[]
  
  // Categorization
  labels: string[]
  components: string[]
  fixVersion?: string
  
  // Testing & Quality
  testScenarios: string[]
  testingNotes?: string
  bugReproductionSteps?: string[]
  
  // Attachments & Documentation
  attachments: Attachment[]
  mockups: string[]
  wireframes: string[]
  specifications: string[]
  
  // Comments & Communication
  comments: Comment[]
  lastDiscussion?: Date
  
  // Analytics & Tracking
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  timeInProgress?: number
  reopenedCount: number
  
  // Project Association
  projectId: string
  
  // Template Info
  createdFromTemplate?: string
  
  // Sprint History Tracking
  sprintAttempts?: SprintAttempt[] // Optional to maintain backward compatibility
}

export interface AcceptanceCriterion {
  id: string
  description: string
  type: 'given-when-then' | 'checklist' | 'scenario'
  isCompleted: boolean
  testable: boolean
  priority: 'must' | 'should' | 'could'
}

export interface Blocker {
  id: string
  description: string
  type: 'technical' | 'dependency' | 'resource' | 'external'
  severity: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
  resolvedAt?: Date
  assignedTo?: string
}

export interface Comment {
  id: string
  text: string
  authorId: string
  authorName: string
  createdAt: Date
  type: 'comment' | 'status_change' | 'assignment' | 'estimate_change'
  mentions?: string[]
}

export interface Attachment {
  id: string
  name: string
  url: string
  type: 'image' | 'document' | 'link' | 'mockup' | 'spec'
  uploadedBy: string
  uploadedAt: Date
  size?: number
}

// Sprint Attempt History for Stories
export interface SprintAttempt {
  // Sprint Context
  sprintId: string
  sprintName: string
  sprintGoal: string
  sprintStartDate: Date
  sprintEndDate: Date
  sprintDuration: number // days
  
  // Estimation & Planning Context
  estimationSessionId?: string
  originalStoryPoints?: number
  adjustedStoryPoints?: number // if re-estimated during sprint
  estimationConfidence: 'Low' | 'Medium' | 'High'
  estimationParticipants?: string[]
  
  // Progress Tracking
  statusReached: 'todo' | 'in_progress' | 'review' | 'testing' | 'done'
  progressPercentage: number // 0-100
  stagesCompleted: Array<{
    stage: 'todo' | 'in_progress' | 'review' | 'testing' | 'done'
    enteredAt: Date
    exitedAt?: Date
    timeSpent: number // hours
  }>
  
  // Assignment History
  assignments: Array<{
    assignedTo: string
    assignedToName: string
    assignedAt: Date
    unassignedAt?: Date
    reason?: string
  }>
  
  // Completion Details
  completionStatus: 'completed' | 'incomplete' | 'carried_over'
  completionReason?: 'done' | 'sprint_ended' | 'removed' | 'descoped' | 'blocked'
  completedAt?: Date
  incompleteReason?: string
  
  // Blockers & Issues
  blockersEncountered: Array<{
    description: string
    type: 'technical' | 'dependency' | 'resource' | 'external'
    severity: 'low' | 'medium' | 'high' | 'critical'
    reportedAt: Date
    resolvedAt?: Date
    impactHours?: number
    resolution?: string
  }>
  
  // Scope Changes
  scopeChanges: Array<{
    changeType: 'added' | 'modified' | 'removed'
    description: string
    changedAt: Date
    changedBy: string
    reason: string
  }>
  
  // Learning & Insights
  complexityInsights?: string // Notes about actual vs estimated complexity
  velocityImpact?: number // How this story affected sprint velocity
  teamFeedback?: string[]
  retrospectiveNotes?: string
  lessonsLearned?: string[]
  
  // Metrics
  cycleTime?: number // hours from start to done
  leadTime?: number // hours from todo to done
  touchTime?: number // actual hours worked
  waitTime?: number // hours waiting/blocked
  reworkCount: number // times moved backward in workflow
  
  // Sprint Attempt Metadata
  attemptNumber: number // 1st attempt, 2nd attempt, etc.
  attemptedAt: Date // When story was added to sprint
  lastUpdatedAt: Date
}

export interface Epic {
  id: string
  title: string
  description: string
  businessValue: number
  priority: 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have'
  status: 'planning' | 'in_progress' | 'completed' | 'cancelled'
  
  // Stories in this epic
  storyIds: string[]
  
  // Planning
  targetRelease?: string
  startDate?: Date
  endDate?: Date
  estimatedEffort?: number
  
  // Progress tracking
  completedStories: number
  totalStories: number
  progressPercentage: number
  
  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
  projectId: string
}