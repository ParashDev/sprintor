'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  useSensor,
  useSensors,
  TouchSensor,
  MouseSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import type { Sprint, SprintStory, SprintParticipant } from '@/types/sprint'
import { updateSprint } from '@/lib/sprint-service'
import { SprintColumn } from './SprintColumn'
import { SprintCard } from './SprintCard'
import { SprintHeader } from './SprintHeader'
import { ParticipantCursors } from './ParticipantCursors'
import { AddStoryModal } from './AddStoryModal'

interface SprintBoardProps {
  sprint: Sprint
  accessLevel: 'view' | 'contribute' | 'admin'
  participantId: string
  participants: SprintParticipant[]
  onSprintUpdate?: (sprint: Sprint) => void
  onLeave?: () => void
}

export function SprintBoard({
  sprint,
  accessLevel,
  participantId,
  participants,
  onSprintUpdate,
  onLeave
}: SprintBoardProps) {
  const [activeStory, setActiveStory] = useState<SprintStory | null>(null)
  const [showAddStoryModal, setShowAddStoryModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10
    }
  })

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5
    }
  })

  const keyboardSensor = useSensor(KeyboardSensor)

  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor)

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (accessLevel === 'view') return
    
    const { active } = event
    const activeStoryData = sprint.stories.find(story => story.id === active.id)
    
    if (activeStoryData) {
      setActiveStory(activeStoryData)
      setIsDragging(true)
    }
  }, [sprint.stories, accessLevel])

  // Handle drag over
  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (accessLevel === 'view') return
    
    const { active, over } = event

    if (!over) return

    const activeStoryId = active.id as string
    const overId = over.id as string

    // Find the active story and the target column
    const activeStory = sprint.stories.find(s => s.id === activeStoryId)
    if (!activeStory) return

    // Check if we're hovering over a column
    const isOverColumn = sprint.columns.some(col => col.id === overId)
    if (isOverColumn && activeStory.columnId !== overId) {
      // Moving to a different column - update the story
      const targetColumn = sprint.columns.find(col => col.id === overId)
      if (targetColumn) {
        const updatedStories = sprint.stories.map(story => {
          if (story.id === activeStoryId) {
            return {
              ...story,
              columnId: overId,
              sprintStatus: targetColumn.status,
              position: sprint.stories.filter(s => s.columnId === overId).length
            }
          }
          return story
        })

        // Update locally first for immediate feedback
        if (onSprintUpdate) {
          onSprintUpdate({
            ...sprint,
            stories: updatedStories
          })
        }
      }
    }
  }, [sprint, accessLevel, onSprintUpdate])

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (accessLevel === 'view') return
    
    const { active, over } = event

    if (!over) {
      setActiveStory(null)
      setIsDragging(false)
      return
    }

    const activeStoryId = active.id as string
    const overId = over.id as string

    try {
      const activeStory = sprint.stories.find(s => s.id === activeStoryId)
      if (!activeStory) return

      let updatedStories = [...sprint.stories]

      // Handle dropping on a column
      const targetColumn = sprint.columns.find(col => col.id === overId)
      if (targetColumn && activeStory.columnId !== overId) {
        // Moving to different column
        updatedStories = updatedStories.map(story => {
          if (story.id === activeStoryId) {
            return {
              ...story,
              columnId: overId,
              sprintStatus: targetColumn.status,
              position: sprint.stories.filter(s => s.columnId === overId).length,
              lastUpdated: new Date(),
              ...(targetColumn.status === 'in_progress' && !story.startedAt && { startedAt: new Date() }),
              ...(targetColumn.status === 'done' && !story.completedAt && { completedAt: new Date() })
            }
          }
          return story
        })
      } else {
        // Reordering within same column
        const activeIndex = sprint.stories.findIndex(s => s.id === activeStoryId)
        const overIndex = sprint.stories.findIndex(s => s.id === overId)

        if (activeIndex !== -1 && overIndex !== -1) {
          updatedStories = arrayMove(updatedStories, activeIndex, overIndex)
          
          // Update positions
          updatedStories.forEach((story, index) => {
            if (story.columnId === activeStory.columnId) {
              story.position = index
            }
          })
        }
      }

      // Update the sprint with new story positions
      await updateSprint(sprint.id, {
        storyUpdates: updatedStories.map(story => ({
          id: story.id,
          sprintStatus: story.sprintStatus,
          columnId: story.columnId,
          position: story.position
        }))
      })

      // Update local state
      if (onSprintUpdate) {
        onSprintUpdate({
          ...sprint,
          stories: updatedStories
        })
      }

    } catch (error) {
      console.error('Error updating story position:', error)
      // Revert local changes on error
      if (onSprintUpdate) {
        onSprintUpdate(sprint)
      }
    } finally {
      setActiveStory(null)
      setIsDragging(false)
    }
  }, [sprint, accessLevel, onSprintUpdate])

  // Calculate column metrics
  const getColumnMetrics = useCallback((columnId: string) => {
    const columnStories = sprint.stories.filter(story => story.columnId === columnId)
    const storyPoints = columnStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
    const column = sprint.columns.find(col => col.id === columnId)
    
    return {
      storyCount: columnStories.length,
      storyPoints,
      isOverWipLimit: column?.wipLimit ? columnStories.length > column.wipLimit : false
    }
  }, [sprint.stories, sprint.columns])

  // Group stories by column
  const storiesByColumn = React.useMemo(() => {
    const grouped: Record<string, SprintStory[]> = {}
    
    sprint.columns.forEach(column => {
      grouped[column.id] = sprint.stories
        .filter(story => story.columnId === column.id)
        .sort((a, b) => a.position - b.position)
    })
    
    return grouped
  }, [sprint.stories, sprint.columns])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (accessLevel === 'admin' && e.key === 'a' && e.ctrlKey) {
        e.preventDefault()
        setShowAddStoryModal(true)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [accessLevel])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Sprint Header */}
      <SprintHeader
        sprint={sprint}
        accessLevel={accessLevel}
        participants={participants}
        onAddStory={() => setShowAddStoryModal(true)}
        onLeave={onLeave}
      />

      {/* Sprint Board */}
      <div className="flex-1 p-4 md:p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          {/* Board Columns */}
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4">
            {sprint.columns.map(column => (
              <div key={column.id} className="flex-shrink-0">
                <SortableContext
                  items={storiesByColumn[column.id]?.map(story => story.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <SprintColumn
                    column={column}
                    stories={storiesByColumn[column.id] || []}
                    metrics={getColumnMetrics(column.id)}
                    accessLevel={accessLevel}
                    isDraggedOver={false}
                  />
                </SortableContext>
              </div>
            ))}
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeStory ? (
              <SprintCard
                story={activeStory}
                accessLevel={accessLevel}
                isDragging={true}
                isOverlay={true}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Real-time Participant Cursors */}
        <ParticipantCursors participants={participants} currentParticipantId={participantId} />
      </div>

      {/* Add Story Modal */}
      {showAddStoryModal && (
        <AddStoryModal
          sprint={sprint}
          isOpen={showAddStoryModal}
          onClose={() => setShowAddStoryModal(false)}
          onStoryAdded={(newStory) => {
            if (onSprintUpdate) {
              onSprintUpdate({
                ...sprint,
                stories: [...sprint.stories, newStory]
              })
            }
            setShowAddStoryModal(false)
          }}
        />
      )}

      {/* Sprint Statistics Overlay (when dragging) */}
      {isDragging && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
            Sprint Overview
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <div className="font-medium">Stories</div>
              <div>{sprint.stories.length} total</div>
            </div>
            <div>
              <div className="font-medium">Points</div>
              <div>{sprint.totalStoryPoints} committed</div>
            </div>
            <div>
              <div className="font-medium">Done</div>
              <div>
                {sprint.stories.filter(s => s.sprintStatus === 'done').length} stories
              </div>
            </div>
            <div>
              <div className="font-medium">In Progress</div>
              <div>
                {sprint.stories.filter(s => s.sprintStatus === 'in_progress').length} stories
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintBoard