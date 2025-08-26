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
  Eye,
  Bug,
  Zap,
  FileText,
  Book,
  CheckCircle
} from 'lucide-react'
import type { SprintStory, TeamMemberRole } from '@/types/sprint'
import type { SprintPermissions } from '@/lib/sprint-permissions'

interface SprintCardProps {
  story: SprintStory
  // NEW: Use team member role for proper permission handling
  teamRole?: TeamMemberRole
  permissions?: SprintPermissions
  // DEPRECATED: Keep for backward compatibility, now optional
  accessLevel?: 'view' | 'contribute' | 'admin'
  isDragging: boolean
  isOverlay?: boolean
  onClick?: () => void
}

export function SprintCard({ 
  story,
  teamRole,
  permissions, 
  accessLevel, // DEPRECATED: Keep for backward compatibility
  isDragging, 
  isOverlay = false,
  onClick 
}: SprintCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  
  // NEW: Use role-based permissions with fallback for backward compatibility
  const canMoveStories = permissions?.canMoveStories ?? (accessLevel !== 'view')
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging
  } = useSortable({
    id: story.id,
    disabled: !canMoveStories
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: sortableIsDragging ? 1000 : 1
  }

  // Get priority indicator (just returns empty string now since we removed left border)
  const getPriorityColor = (priority: string) => {
    return '' // No special coloring, just use regular card styling
  }

  // Get story type icon component and color
  const getTypeDisplay = (type: string) => {
    const iconProps = { className: "w-4 h-4" }
    switch (type) {
      case 'story': return { icon: <Book {...iconProps} />, color: 'text-muted-foreground' }
      case 'bug': return { icon: <Bug {...iconProps} />, color: 'text-muted-foreground' }
      case 'task': return { icon: <CheckCircle {...iconProps} />, color: 'text-muted-foreground' }
      case 'spike': return { icon: <Zap {...iconProps} />, color: 'text-muted-foreground' }
      default: return { icon: <FileText {...iconProps} />, color: 'text-muted-foreground' }
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
      {...(canMoveStories ? listeners : {})}
      onClick={onClick}
      className={`
        group relative bg-card rounded-lg border border-border shadow-sm
        ${getPriorityColor(story.originalData.priority)}
        ${isDragging || sortableIsDragging ? 'rotate-3 scale-105 shadow-lg z-50' : 'hover:shadow-md'}
        ${isOverlay ? 'cursor-grabbing' : canMoveStories ? 'cursor-grab active:cursor-grabbing touch-manipulation' : 'cursor-pointer'}
        transition-all duration-200
        ${isCompleted ? 'opacity-75' : ''}
        ${canMoveStories ? 'select-none' : ''}
      `}
    >
      {/* Card Header */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Story Type and ID */}
            <div className="flex items-center gap-2 mb-1">
              <span className={typeDisplay.color}>{typeDisplay.icon}</span>
              <span className={`text-xs font-medium ${typeDisplay.color}`}>
                {story.originalData.type.toUpperCase()}
              </span>
              <span className="text-xs text-muted-foreground">
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
              <CheckCircle2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            )}
            {isInProgress && (
              <Circle className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
            {hasBlockers && (
              <AlertTriangle className="w-4 h-4 text-gray-700 dark:text-gray-300" />
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
                className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {label}
              </span>
            ))}
            {story.originalData.labels.length > 3 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                +{story.originalData.labels.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {story.progress > 0 && story.progress < 100 && (
        <div className="px-3 pb-2">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${story.progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {story.progress}% complete
          </span>
        </div>
      )}

      {/* Card Footer */}
      <div className="px-3 py-2 bg-muted rounded-b-lg border-t border-border">
        <div className="flex items-center justify-between">
          {/* Left side - Story Points and Assignment */}
          <div className="flex items-center gap-2">
            {/* Story Points */}
            {story.storyPoints && (
              <div className="flex items-center gap-1">
                <div className="w-5 h-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
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
            {(permissions?.canEditStory ?? (accessLevel !== 'view')) && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDetails(!showDetails)
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            )}

            {/* View Only Indicator */}
            {!canMoveStories && !(permissions?.canEditStory ?? (accessLevel !== 'view')) && (
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
                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">
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
      {canMoveStories && !isOverlay && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-30 transition-opacity">
          <div className="w-1 h-4 bg-muted-foreground rounded-full"></div>
        </div>
      )}
    </div>
  )
}

export default SprintCard