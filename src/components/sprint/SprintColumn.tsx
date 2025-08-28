'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, AlertTriangle } from 'lucide-react'
import type { SprintColumn as SprintColumnType, SprintStory, TeamMemberRole } from '@/types/sprint'
import type { SprintPermissions } from '@/lib/sprint-permissions'
import { SprintCard } from './SprintCard'

interface SprintColumnProps {
  column: SprintColumnType
  stories: SprintStory[]
  metrics: {
    storyCount: number
    storyPoints: number
    isOverWipLimit: boolean
  }
  // NEW: Use team member role for proper permission handling
  teamRole?: TeamMemberRole
  permissions?: SprintPermissions
  // DEPRECATED: Keep for backward compatibility, now optional
  accessLevel?: 'view' | 'contribute' | 'admin'
  isDraggedOver: boolean
  onAddStory?: () => void
  onStoryClick?: (story: SprintStory) => void
}

export function SprintColumn({
  column,
  stories,
  metrics,
  teamRole,
  permissions,
  accessLevel, // DEPRECATED: Keep for backward compatibility
  isDraggedOver,
  onAddStory,
  onStoryClick
}: SprintColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id
  })

  // NEW: Use role-based permissions with fallback to old logic for backward compatibility
  const canAddStories = permissions 
    ? permissions.canCreateStory && (column.status === 'todo' || permissions.canEditStory)
    : (accessLevel !== 'view' && (column.status === 'todo' || accessLevel === 'admin'))

  return (
    <div
      ref={setNodeRef}
      className={`
        w-72 sm:w-80 h-full bg-card rounded-xl shadow-sm transition-all duration-200 flex flex-col
        ${isDraggedOver 
          ? 'border-2 border-primary ring-2 ring-primary/20 bg-accent' 
          : 'border border-border'
        }
      `}
    >
      {/* Column Header */}
      <div className="p-3 sm:p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Column Color Indicator */}
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            
            {/* Column Title */}
            <h3 className="text-xs sm:text-sm font-medium text-card-foreground truncate">
              {column.name}
            </h3>
            
            {/* Story Count Badge */}
            <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
              {metrics.storyCount}
            </div>
          </div>

          {/* Add Story Button */}
          {canAddStories && (
            <button
              onClick={onAddStory}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={`Add story to ${column.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Column Metrics */}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>{metrics.storyPoints} points</span>
          </div>
        </div>
      </div>

      {/* Story Cards Area */}
      <div className="relative flex-1 overflow-y-auto">
        {/* Visual Drop Indicator when hovering */}
        {isDraggedOver && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
              Drop story here
            </div>
          </div>
        )}

        <div className="p-2 sm:p-3 space-y-2 sm:space-y-3 h-full">
          <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {stories.map(story => (
              <SprintCard
                key={story.id}
                story={story}
                teamRole={teamRole}
                permissions={permissions}
                accessLevel={accessLevel || 'view'} // DEPRECATED: Provide fallback for backward compatibility
                isDragging={false}
                onClick={onStoryClick ? () => onStoryClick(story) : undefined}
              />
            ))}
          </SortableContext>
          
          {/* Empty State Only */}
          {stories.length === 0 && (
            <div className="flex items-center justify-center h-full text-center py-16 text-muted-foreground">
              <div>
                <div className="text-sm mb-2">No stories in {column.name.toLowerCase()}</div>
                <div className="text-xs text-muted-foreground/60 mb-3">Drag stories here</div>
                {canAddStories && (
                  <button
                    onClick={onAddStory}
                    className="text-xs text-foreground hover:underline"
                  >
                    Add your first story
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Footer - Only show completion for done column */}
      {column.status === 'done' && metrics.storyCount > 0 && (
        <div className="px-3 sm:px-4 py-2 bg-muted rounded-b-xl border-t border-border">
          <div className="flex justify-center items-center text-xs text-foreground">
            ✓ {metrics.storyCount} completed
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintColumn