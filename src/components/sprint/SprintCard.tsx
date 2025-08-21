'use client'

import React, { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  MessageSquare, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle2,
  Circle,
  MoreHorizontal,
  Eye
} from 'lucide-react'
import type { SprintStory } from '@/types/sprint'

interface SprintCardProps {
  story: SprintStory
  accessLevel: 'view' | 'contribute' | 'admin'
  isDragging: boolean
  isOverlay?: boolean
  onClick?: () => void
}

export function SprintCard({ 
  story, 
  accessLevel, 
  isDragging, 
  isOverlay = false,
  onClick 
}: SprintCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging
  } = useSortable({
    id: story.id,
    disabled: accessLevel === 'view'
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: sortableIsDragging ? 1000 : 1
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Must Have': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'Should Have': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      case 'Could Have': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case "Won't Have": return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
      default: return 'border-slate-300 bg-white dark:bg-slate-800'
    }
  }

  // Get story type icon and color
  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'story': return { icon: '📖', color: 'text-blue-600 dark:text-blue-400' }
      case 'bug': return { icon: '🐛', color: 'text-red-600 dark:text-red-400' }
      case 'task': return { icon: '✅', color: 'text-green-600 dark:text-green-400' }
      case 'spike': return { icon: '⚡', color: 'text-purple-600 dark:text-purple-400' }
      default: return { icon: '📄', color: 'text-slate-600 dark:text-slate-400' }
    }
  }

  const typeDisplay = getTypeDisplay(story.originalData.type)
  const hasBlockers = story.blockers && story.blockers.length > 0
  const hasComments = story.sprintComments && story.sprintComments.length > 0
  const isCompleted = story.sprintStatus === 'done'
  const isInProgress = story.sprintStatus === 'in_progress'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(accessLevel !== 'view' ? listeners : {})}
      onClick={onClick}
      className={`
        group relative bg-white dark:bg-slate-800 rounded-lg border-l-4 shadow-sm
        ${getPriorityColor(story.originalData.priority)}
        ${isDragging || sortableIsDragging ? 'rotate-3 scale-105 shadow-lg z-50' : 'hover:shadow-md'}
        ${isOverlay ? 'cursor-grabbing' : accessLevel !== 'view' ? 'cursor-grab active:cursor-grabbing touch-manipulation' : 'cursor-pointer'}
        transition-all duration-200
        ${isCompleted ? 'opacity-75' : ''}
        ${accessLevel !== 'view' ? 'select-none' : ''}
      `}
    >
      {/* Card Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Story Type and ID */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm">{typeDisplay.icon}</span>
              <span className={`text-xs font-medium ${typeDisplay.color}`}>
                {story.originalData.type.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                #{story.originalStoryId?.slice(-6)}
              </span>
            </div>

            {/* Story Title */}
            <h4 className={`
              text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2
              ${isCompleted ? 'line-through' : ''}
            `}>
              {story.title}
            </h4>
          </div>

          {/* Status Icons */}
          <div className="flex items-center gap-1 ml-2">
            {isCompleted && (
              <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
            )}
            {isInProgress && (
              <Circle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
            )}
            {hasBlockers && (
              <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
            )}
          </div>
        </div>

        {/* Story Description */}
        {story.description && (
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
            {story.description}
          </p>
        )}
      </div>

      {/* Card Body - Labels */}
      {story.originalData.labels && story.originalData.labels.length > 0 && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-1">
            {story.originalData.labels.slice(0, 3).map(label => (
              <span
                key={label}
                className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              >
                {label}
              </span>
            ))}
            {story.originalData.labels.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-500">
                +{story.originalData.labels.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {story.progress > 0 && story.progress < 100 && (
        <div className="px-3 pb-2">
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-blue-500 dark:bg-blue-400 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${story.progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {story.progress}% complete
          </span>
        </div>
      )}

      {/* Card Footer */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-750 rounded-b-lg border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between">
          {/* Left side - Story Points and Assignment */}
          <div className="flex items-center gap-2">
            {/* Story Points */}
            {story.storyPoints && (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-medium">
                  {story.storyPoints}
                </div>
              </div>
            )}

            {/* Assigned User */}
            {story.assignedToName && (
              <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                <User className="w-3 h-3" />
                <span className="truncate max-w-16">{story.assignedToName}</span>
              </div>
            )}
          </div>

          {/* Right side - Comments and Time */}
          <div className="flex items-center gap-2">
            {/* Comments Count */}
            {hasComments && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-3 h-3" />
                <span>{story.sprintComments.length}</span>
              </div>
            )}

            {/* Time Tracking */}
            {(story.actualTime || story.timeEstimate) && (
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="w-3 h-3" />
                <span>
                  {story.actualTime ? `${story.actualTime}h` : story.timeEstimate}
                </span>
              </div>
            )}

            {/* More Actions */}
            {accessLevel !== 'view' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDetails(!showDetails)
                }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:text-slate-300 dark:hover:bg-slate-600 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            )}

            {/* View Only Indicator */}
            {accessLevel === 'view' && (
              <Eye className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-medium">Priority:</span> {story.originalData.priority}
              </div>
              <div>
                <span className="font-medium">Status:</span> {story.sprintStatus}
              </div>
              {story.addedToSprintAt && (
                <div className="col-span-2">
                  <span className="font-medium">Added:</span>{' '}
                  {new Date(story.addedToSprintAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Blockers */}
            {hasBlockers && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                  Blockers:
                </div>
                {story.blockers.slice(0, 2).map(blocker => (
                  <div key={blocker.id} className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    • {blocker.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drag Handle Indicator */}
      {accessLevel !== 'view' && !isOverlay && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity">
          <div className="w-1 h-4 bg-slate-400 dark:bg-slate-500 rounded-full"></div>
        </div>
      )}
    </div>
  )
}

export default SprintCard