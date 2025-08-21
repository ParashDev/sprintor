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
  Check
} from 'lucide-react'
import type { Sprint, SprintParticipant } from '@/types/sprint'

interface SprintHeaderProps {
  sprint: Sprint
  accessLevel: 'view' | 'contribute' | 'admin'
  participants: SprintParticipant[]
  onAddStory?: () => void
  onStartSprint?: () => void
  onEndSprint?: () => void
  onLeave?: () => void
}

export function SprintHeader({
  sprint,
  accessLevel,
  participants,
  onAddStory,
  onStartSprint,
  onEndSprint,
  onLeave
}: SprintHeaderProps) {
  const [showStats, setShowStats] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

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
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = url
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 md:px-6 py-4">
        
        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {sprint.name || 'Untitled Sprint'}
              </h1>
              
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
              
              {/* Desktop Stats */}
              <div className="flex items-center gap-4 text-sm">
                <span className={`
                  px-2 py-1 text-xs font-medium rounded border
                  ${sprint.status === 'draft' ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' : ''}
                  ${sprint.status === 'active' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : ''}
                  ${sprint.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : ''}
                `}>
                  {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                </span>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">Stories:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {completedStories.length}/{sprint.stories.length}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">Points:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {completedPoints}/{totalStoryPoints}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">Progress:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {Math.round(progressPercentage)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 dark:text-gray-400">Days:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {daysRemaining}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="flex items-center gap-2">
              {accessLevel === 'admin' && sprint.status === 'draft' && (
                <button
                  onClick={onStartSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Sprint
                </button>
              )}
              
              {accessLevel === 'admin' && sprint.status === 'active' && (
                <button
                  onClick={onEndSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded font-medium transition-colors"
                >
                  <Square className="w-4 h-4" />
                  End Sprint
                </button>
              )}
              
              {accessLevel !== 'view' && (
                <button
                  onClick={onAddStory}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Story
                </button>
              )}
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-medium transition-colors"
              >
                Details
                {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded font-medium transition-colors"
                title="Copy sprint link"
              >
                {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Share className="w-4 h-4" />}
                {linkCopied ? 'Copied!' : 'Share'}
              </button>
              
              <button
                onClick={onLeave}
                className="p-2 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-600 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                title="Leave Sprint"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {sprint.name || 'Untitled Sprint'}
          </h1>
          
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
          
          {/* Mobile Actions - Properly spaced */}
          <div className="flex items-center justify-between mb-3">
            {/* Primary Actions */}
            <div className="flex items-center gap-2">
              {accessLevel === 'admin' && sprint.status === 'draft' && (
                <button
                  onClick={onStartSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded font-medium"
                >
                  <Play className="w-4 h-4" />
                  Start Sprint
                </button>
              )}
              
              {accessLevel === 'admin' && sprint.status === 'active' && (
                <button
                  onClick={onEndSprint}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded font-medium"
                >
                  <Square className="w-4 h-4" />
                  End Sprint
                </button>
              )}
            </div>
            
            {/* Secondary Actions */}
            <div className="flex items-center gap-2">
              {accessLevel !== 'view' && (
                <button
                  onClick={onAddStory}
                  className="p-2 border border-gray-300 text-gray-700 rounded"
                  title="Add Story"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded text-sm"
              >
                Details
              </button>
              
              <button
                onClick={handleCopyLink}
                className="p-2 border border-gray-300 text-gray-700 rounded"
                title="Share sprint"
              >
                {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Share className="w-4 h-4" />}
              </button>
              
              <button
                onClick={onLeave}
                className="p-2 border border-gray-300 text-gray-600 rounded"
                title="Leave"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Mobile Stats */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={`
              px-2 py-1 text-xs font-medium rounded border
              ${sprint.status === 'draft' ? 'bg-gray-100 text-gray-700 border-gray-300' : ''}
              ${sprint.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : ''}
              ${sprint.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
            `}>
              {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
            </span>
            
            <span className="font-medium text-gray-900">
              {completedStories.length}/{sprint.stories.length}
            </span>
            
            <span className="font-medium text-gray-900">
              {completedPoints}/{totalStoryPoints}
            </span>
            
            <span className="font-medium text-gray-900">
              {Math.round(progressPercentage)}%
            </span>
            
            <span className="font-medium text-gray-900">
              {daysRemaining}d
            </span>
          </div>
        </div>
        
        {/* Progress Bar */}
        {totalStoryPoints > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gray-900 dark:bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        )}
        
        {/* Expanded Stats */}
        {showStats && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {sprint.stories.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total Stories
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {completedStories.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Completed
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {inProgressStories.length}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  In Progress
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {totalStoryPoints}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total Points
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {completedPoints}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Points Done
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {daysRemaining}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Days Left
                </div>
              </div>
            </div>
            
            {/* Sprint Dates */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="font-medium">Start:</span> {sprintStart.toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">End:</span> {sprintEnd.toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {sprint.duration} days
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SprintHeader