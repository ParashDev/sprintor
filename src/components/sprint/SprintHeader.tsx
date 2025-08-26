'use client'

import React, { useState } from 'react'
import { 
  Plus, 
  Play, 
  Square,
  LogOut,
  ChevronDown,
  ChevronUp,
  Target,
  FileText,
  Share,
  Copy,
  Check,
  Crown,
  Shield,
  User,
  Eye
} from 'lucide-react'
import type { Sprint, SprintParticipant, TeamMemberRole } from '@/types/sprint'
import type { SprintPermissions } from '@/lib/sprint-permissions'

interface SprintHeaderProps {
  sprint: Sprint
  // NEW: Use team member role for proper permission handling
  teamRole: TeamMemberRole
  permissions: SprintPermissions
  // DEPRECATED: Keep for backward compatibility
  accessLevel?: 'view' | 'contribute' | 'admin'
  participants: SprintParticipant[]
  memberName?: string
  isSprintHost?: boolean
  onAddStory?: () => void
  onStartSprint?: () => void
  onCompleteSprint?: () => void
  onLeave?: () => void
  isStartingSprint?: boolean
}

export function SprintHeader({
  sprint,
  teamRole,
  permissions,
  accessLevel, // DEPRECATED: Keep for backward compatibility
  participants,
  memberName,
  isSprintHost = false,
  onAddStory,
  onStartSprint,
  onCompleteSprint,
  onLeave,
  isStartingSprint = false
}: SprintHeaderProps) {
  const [showStats, setShowStats] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  // Helper function to format role names nicely
  const formatRoleName = (role: TeamMemberRole): string => {
    switch (role) {
      case 'product_owner': return 'Product Owner'
      case 'scrum_master': return 'Scrum Master'
      case 'business_analyst': return 'Business Analyst'
      case 'developer': return 'Developer'
      case 'tester': return 'Tester'
      case 'stakeholder': return 'Stakeholder'
      default: return role
    }
  }

  // Helper function to get role icon
  const getRoleIcon = (role: TeamMemberRole) => {
    switch (role) {
      case 'product_owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'scrum_master': return <Shield className="h-4 w-4 text-blue-600" />
      case 'business_analyst': return <User className="h-4 w-4 text-purple-600" />
      case 'developer': return <User className="h-4 w-4 text-green-600" />
      case 'tester': return <User className="h-4 w-4 text-orange-600" />
      case 'stakeholder': return <Eye className="h-4 w-4 text-gray-600" />
      default: return <User className="h-4 w-4 text-gray-600" />
    }
  }

  // Calculate sprint progress
  const completedStories = sprint.stories.filter(s => s.sprintStatus === 'done')
  const inProgressStories = sprint.stories.filter(s => s.sprintStatus === 'in_progress')
  const completedPoints = completedStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
  const totalStoryPoints = sprint.stories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
  const progressPercentage = totalStoryPoints > 0 ? (completedPoints / totalStoryPoints) * 100 : 0

  // Calculate sprint time progress
  const now = new Date()
  const sprintStart = new Date(sprint.startDate)
  const sprintEnd = new Date(sprint.endDate)
  const daysRemaining = Math.max(0, Math.ceil((sprintEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Handle share/copy link
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/sprint/${sprint.id}`
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 md:px-6 py-4">
        
        {/* Desktop Layout - Professional Compact Design */}
        <div className="hidden lg:block">
          {/* Main Header Row */}
          <div className="flex items-center justify-between gap-6 mb-3">
            {/* Left Side: Title + User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sprint.name || 'Untitled Sprint'}
                </h1>
                {/* User Info Badge - Inline with Title */}
                {memberName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                    {getRoleIcon(teamRole)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {memberName}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      • {formatRoleName(teamRole)}
                      {isSprintHost && <span className="text-blue-600 dark:text-blue-400 font-semibold ml-1">(Host)</span>}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Description & Goal - Compact */}
              <div className="space-y-1">
                {sprint.description && sprint.description.trim() !== '' && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                    {sprint.description}
                  </p>
                )}
                
                {sprint.goal && sprint.goal.trim() !== '' && (
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <span className="font-medium text-gray-500 dark:text-gray-400">Goal:</span> 
                    <span className="ml-1">{sprint.goal}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-3">
              {permissions.canStartSprint && sprint.status === 'draft' && (
                <button
                  onClick={onStartSprint}
                  disabled={isStartingSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                >
                  {isStartingSprint ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isStartingSprint ? 'Starting...' : 'Start Sprint'}
                </button>
              )}
              
              {permissions.canCompleteSprint && sprint.status === 'active' && (
                <button
                  onClick={onCompleteSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
                >
                  <Square className="w-4 h-4" />
                  Complete Sprint
                </button>
              )}
              
              {permissions.canCreateStory && (
                <button
                  onClick={onAddStory}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Story
                </button>
              )}
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                Details
                {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <button
                onClick={onLeave}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            </div>
          </div>

          {/* Compact Stats Row */}
          <div className="flex items-center justify-between">
            {/* Left: Status + Key Metrics */}
            <div className="flex items-center gap-6">
              <span className={`
                px-3 py-1.5 text-sm font-medium rounded-full
                ${sprint.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : ''}
                ${sprint.status === 'active' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : ''}
                ${sprint.status === 'completed' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : ''}
              `}>
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
              
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <span>Stories:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {completedStories.length}/{sprint.stories.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span>Points:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {completedPoints}/{totalStoryPoints}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span>Progress:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span>Days:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {daysRemaining}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Right: Share Link */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Copy sprint link"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Share className="w-4 h-4" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {sprint.name || 'Untitled Sprint'}
          </h1>
          
          {/* User Info Display - Mobile */}
          {memberName && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 w-fit">
              <div className="flex items-center gap-1.5">
                <div className="scale-75">
                  {getRoleIcon(teamRole)}
                </div>
                <div className="text-xs">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {memberName}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                    • {formatRoleName(teamRole)}
                    {isSprintHost && <span className="text-blue-600 dark:text-blue-400 font-medium ml-1">(Host)</span>}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {sprint.description && sprint.description.trim() !== '' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {sprint.description}
            </p>
          )}
          
          {sprint.goal && sprint.goal.trim() !== '' && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              <span className="font-medium">Goal:</span> {sprint.goal}
            </p>
          )}
          
          {/* Mobile Actions - 2x2 Grid with full width buttons */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            {permissions.canStartSprint && sprint.status === 'draft' && (
              <button
                onClick={onStartSprint}
                disabled={isStartingSprint}
                className="flex items-center justify-center gap-2 py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-sm"
              >
                {isStartingSprint ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isStartingSprint ? 'Starting...' : 'Start Sprint'}
              </button>
            )}
            
            {permissions.canCompleteSprint && sprint.status === 'active' && (
              <button
                onClick={onCompleteSprint}
                className="flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md text-sm"
              >
                <Square className="w-4 h-4" />
                End Sprint
              </button>
            )}
            
            {permissions.canCreateStory && (
              <button
                onClick={onAddStory}
                className="flex items-center justify-center gap-2 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Story
              </button>
            )}
            
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center justify-center gap-2 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 hover:border-gray-400 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors text-sm"
            >
              {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Details
            </button>
            
            <button
              onClick={onLeave}
              className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Leave Sprint
            </button>
          </div>
          
          {/* Mobile Stats */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className={`
                px-2 py-1 text-xs font-medium rounded
                ${sprint.status === 'draft' ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : ''}
                ${sprint.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : ''}
                ${sprint.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : ''}
              `}>
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
              
              <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                <span>Stories: <strong>{completedStories.length}/{sprint.stories.length}</strong></span>
                <span>Points: <strong>{completedPoints}/{totalStoryPoints}</strong></span>
                <span>Progress: <strong>{Math.round(progressPercentage)}%</strong></span>
                <span>Days: <strong>{daysRemaining}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Stats Panel (Both Desktop & Mobile) */}
        {showStats && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{sprint.stories.length}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Total</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{completedStories.length}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Done</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{inProgressStories.length}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Active</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{participants.length}</div>
                <div className="text-gray-500 dark:text-gray-400 text-xs">Team</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Sprint Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SprintHeader