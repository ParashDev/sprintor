'use client'

import React, { useState } from 'react'
import { 
  Users, 
  Target, 
  Plus, 
  Settings, 
  Share2, 
  Play, 
  Pause, 
  Square,
  LogOut,
  BarChart3,
  Clock,
  TrendingUp
} from 'lucide-react'
import type { Sprint, SprintParticipant } from '@/types/sprint'

interface SprintHeaderProps {
  sprint: Sprint
  accessLevel: 'view' | 'contribute' | 'admin'
  participants: SprintParticipant[]
  onAddStory?: () => void
  onStartSprint?: () => void
  onPauseSprint?: () => void
  onEndSprint?: () => void
  onShare?: () => void
  onSettings?: () => void
  onLeave?: () => void
}

export function SprintHeader({
  sprint,
  accessLevel,
  participants,
  onAddStory,
  onStartSprint,
  onPauseSprint,
  onEndSprint,
  onShare,
  onSettings,
  onLeave
}: SprintHeaderProps) {
  const [showStats, setShowStats] = useState(false)

  // Calculate sprint progress
  const completedStories = sprint.stories.filter(s => s.sprintStatus === 'done')
  const inProgressStories = sprint.stories.filter(s => s.sprintStatus === 'in_progress')
  const completedPoints = completedStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
  const progressPercentage = sprint.totalStoryPoints > 0 
    ? (completedPoints / sprint.totalStoryPoints) * 100 
    : 0

  // Calculate sprint time progress
  const now = new Date()
  const sprintStart = new Date(sprint.startDate)
  const sprintEnd = new Date(sprint.endDate)
  const totalDuration = sprintEnd.getTime() - sprintStart.getTime()
  const elapsed = Math.max(0, now.getTime() - sprintStart.getTime())
  const timeProgress = Math.min(100, (elapsed / totalDuration) * 100)
  
  const daysRemaining = Math.max(0, Math.ceil((sprintEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Get sprint status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      case 'completed': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="px-4 md:px-6 py-4">
        {/* Top Row - Title and Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Sprint Title */}
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {sprint.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sprint.status)}`}>
                  {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {sprint.projectName}
                </span>
                {sprint.epicName && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {sprint.epicName}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4 ml-8">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {completedStories.length}/{sprint.stories.length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Stories</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {completedPoints}/{sprint.totalStoryPoints}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Points</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {daysRemaining}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Days Left</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Sprint Controls */}
            {accessLevel === 'admin' && (
              <div className="flex items-center gap-1">
                {sprint.status === 'draft' && (
                  <button
                    onClick={onStartSprint}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Start Sprint
                  </button>
                )}
                
                {sprint.status === 'active' && (
                  <>
                    <button
                      onClick={onPauseSprint}
                      className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                    <button
                      onClick={onEndSprint}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <Square className="w-4 h-4" />
                      End Sprint
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Add Story */}
            {accessLevel !== 'view' && (
              <button
                onClick={onAddStory}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Story</span>
              </button>
            )}

            {/* Share Sprint */}
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Statistics Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className="flex items-center gap-2 px-3 py-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* Settings */}
            {accessLevel === 'admin' && (
              <button
                onClick={onSettings}
                className="p-2 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* Leave Sprint */}
            <button
              onClick={onLeave}
              className="p-2 border border-slate-300 dark:border-slate-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-300 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sprint Description */}
        {sprint.description && (
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {sprint.description}
            </p>
          </div>
        )}

        {/* Sprint Goal */}
        {sprint.goal && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-400">
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Sprint Goal
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {sprint.goal}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bars and Participants */}
        <div className="flex items-center justify-between">
          {/* Progress Indicators */}
          <div className="flex items-center gap-6">
            {/* Story Progress */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Progress:</span>
              <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {Math.round(progressPercentage)}%
              </span>
            </div>

            {/* Time Progress */}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${timeProgress}%` }}
                />
              </div>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {daysRemaining}d left
              </span>
            </div>

            {/* Velocity Indicator */}
            {sprint.velocity && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <TrendingUp className="w-4 h-4" />
                <span>Velocity: {sprint.velocity}</span>
              </div>
            )}
          </div>

          {/* Active Participants */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <div className="flex -space-x-2">
              {participants.filter(p => p.isActive).slice(0, 5).map(participant => (
                <div
                  key={participant.id}
                  className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-medium text-white"
                  style={{ backgroundColor: participant.color }}
                  title={participant.name}
                >
                  {participant.name.charAt(0).toUpperCase()}
                </div>
              ))}
              {participants.filter(p => p.isActive).length > 5 && (
                <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-medium text-slate-600 dark:text-slate-300">
                  +{participants.filter(p => p.isActive).length - 5}
                </div>
              )}
            </div>
            <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
              {participants.filter(p => p.isActive).length} online
            </span>
          </div>
        </div>

        {/* Expanded Statistics */}
        {showStats && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {sprint.stories.length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Stories</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {completedStories.length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  {inProgressStories.length}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {sprint.totalStoryPoints}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Total Points</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {completedPoints}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Points Done</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {sprint.duration}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Sprint Days</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SprintHeader