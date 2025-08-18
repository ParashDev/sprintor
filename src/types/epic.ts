export interface Epic {
  id: string
  name: string
  description: string
  acceptanceCriteria: string[] // list of acceptance criteria
  projectId: string
  color: string // hex color for visual identification
  icon?: string // optional icon (emoji or icon name)
  status: 'planning' | 'active' | 'completed'
  storyCount: number
  completedStoryCount: number
  createdAt: Date
  updatedAt: Date
  targetDate?: Date
  ownerId: string
  order?: number // for sorting epics
}

export interface EpicStats {
  totalStories: number
  completedStories: number
  inProgressStories: number
  backlogStories: number
  completionPercentage: number
  averageStoryPoints?: number
  totalStoryPoints?: number
  completedStoryPoints?: number
}

export const EPIC_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Cyan', value: '#06B6D4' }
]

export const EPIC_ICONS = [
  'Rocket', // Rocket - for launches
  'Zap', // Lightning - for performance
  'Target', // Target - for goals
  'Wrench', // Wrench - for fixes
  'Lightbulb', // Lightbulb - for features
  'Shield', // Shield - for security
  'BarChart3', // Chart - for analytics
  'Palette', // Palette - for design
  'Search', // Magnifying glass - for search
  'Settings', // Gear - for settings
  'Smartphone', // Mobile - for mobile features
  'Star', // Star - for improvements
  'Building2', // Construction - for infrastructure
  'Lock', // Lock - for auth/security
  'FileText'  // Memo - for documentation
]