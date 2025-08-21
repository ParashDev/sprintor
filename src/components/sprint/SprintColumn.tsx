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
        w-80 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700
        ${isOver ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 dark:bg-blue-900/20' : ''}
        ${isDraggedOver ? 'bg-slate-50 dark:bg-slate-750' : ''}
        transition-all duration-200
      `}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Column Color Indicator */}
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            
            {/* Column Title */}
            <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {column.name}
            </h3>
            
            {/* Story Count Badge */}
            <div className={`
              px-2 py-0.5 rounded-full text-xs font-medium
              ${metrics.isOverWipLimit 
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }
            `}>
              {metrics.storyCount}
              {column.wipLimit && ` / ${column.wipLimit}`}
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
          
          {metrics.isOverWipLimit && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              <span>Over WIP limit</span>
            </div>
          )}
        </div>
      </div>

      {/* Story Cards */}
      <div className={`
        p-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto
        ${isOver ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
        transition-colors duration-200
      `}>
        <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {stories.map(story => (
              <SprintCard
                key={story.id}
                story={story}
                accessLevel={accessLevel}
                isDragging={false}
              />
            ))}
            
            {/* Empty State */}
            {stories.length === 0 && (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <div className="text-sm">No stories in {column.name.toLowerCase()}</div>
                {canAddStories && (
                  <button
                    onClick={onAddStory}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Add your first story
                  </button>
                )}
              </div>
            )}
          </div>
        </SortableContext>
      </div>

      {/* Column Footer (if needed for additional info) */}
      {(column.wipLimit || column.status === 'done') && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-750 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            {column.wipLimit && (
              <div>
                WIP Limit: {column.wipLimit}
              </div>
            )}
            
            {column.status === 'done' && metrics.storyCount > 0 && (
              <div className="text-green-600 dark:text-green-400">
                ✓ {metrics.storyCount} completed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintColumn