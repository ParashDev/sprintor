'use client'

import React from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, AlertTriangle } from 'lucide-react'
import type { SprintColumn as SprintColumnType, SprintStory } from '@/types/sprint'
import { SprintCard } from './SprintCard'

interface SprintColumnProps {
  column: SprintColumnType
  stories: SprintStory[]
  metrics: {
    storyCount: number
    storyPoints: number
    isOverWipLimit: boolean
  }
  accessLevel: 'view' | 'contribute' | 'admin'
  isDraggedOver: boolean
  onAddStory?: () => void
}

export function SprintColumn({
  column,
  stories,
  metrics,
  accessLevel,
  isDraggedOver,
  onAddStory
}: SprintColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id
  })

  const canAddStories = accessLevel !== 'view' && (column.status === 'todo' || accessLevel === 'admin')

  return (
    <div
      ref={setNodeRef}
      className={`
        w-72 sm:w-80 h-full bg-white dark:bg-slate-800 rounded-xl shadow-sm transition-all duration-200 flex flex-col
        ${isDraggedOver 
          ? 'border-2 border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-900/20' 
          : 'border border-slate-200 dark:border-slate-700'
        }
      `}
    >
      {/* Column Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Column Color Indicator */}
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            
            {/* Column Title */}
            <h3 className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {column.name}
            </h3>
            
            {/* Story Count Badge */}
            <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
              {metrics.storyCount}
            </div>
          </div>

          {/* Add Story Button */}
          {canAddStories && (
            <button
              onClick={onAddStory}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              title={`Add story to ${column.name}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Column Metrics */}
        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
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
            <div className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
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
                accessLevel={accessLevel}
                isDragging={false}
              />
            ))}
          </SortableContext>
          
          {/* Empty State Only */}
          {stories.length === 0 && (
            <div className="flex items-center justify-center h-full text-center py-16 text-slate-400 dark:text-slate-500">
              <div>
                <div className="text-sm mb-2">No stories in {column.name.toLowerCase()}</div>
                <div className="text-xs text-slate-300 dark:text-slate-600 mb-3">Drag stories here</div>
                {canAddStories && (
                  <button
                    onClick={onAddStory}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
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
        <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-slate-750 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-center items-center text-xs text-green-600 dark:text-green-400">
            ✓ {metrics.storyCount} completed
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintColumn