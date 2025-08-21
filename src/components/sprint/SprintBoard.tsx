'use client'

import React, { useState, useEffect } from 'react'
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
import { updateSprint, subscribeToSprint } from '@/lib/sprint-service'
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
  const [localSprint, setLocalSprint] = useState(sprint)
  const [activeStory, setActiveStory] = useState<SprintStory | null>(null)
  const [showAddStoryModal, setShowAddStoryModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isLocalUpdate, setIsLocalUpdate] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Use local sprint state for immediate UI updates
  const currentSprint = localSprint

  // Set up real-time subscription for updates from other users
  useEffect(() => {
    const unsubscribe = subscribeToSprint(sprint.id, (updatedSprint) => {
      if (updatedSprint) {
        setLocalSprint(updatedSprint)
      }
    })

    return unsubscribe
  }, [sprint.id])

  // Update local sprint when prop changes (initial load)
  useEffect(() => {
    setLocalSprint(sprint)
  }, [sprint])

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 10 }
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { 
      delay: 200,      // Slightly faster activation
      tolerance: 8     // More tolerance for finger movement
    }
  })
  const keyboardSensor = useSensor(KeyboardSensor)
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor)

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    if (accessLevel === 'view') return
    
    const { active } = event
    const activeStoryData = currentSprint.stories.find(story => story.id === active.id)
    
    if (activeStoryData) {
      setActiveStory(activeStoryData)
      setIsDragging(true)
    }
  }

  // Handle drag over to track which column is being hovered
  const handleDragOver = (event: DragOverEvent) => {
    if (accessLevel === 'view') return

    const { over } = event
    if (!over) {
      setDragOverColumn(null)
      return
    }

    const overId = over.id as string
    
    // Check if we're over a column directly
    const targetColumn = currentSprint.columns.find(col => col.id === overId)
    if (targetColumn) {
      setDragOverColumn(overId)
      return
    }

    // Check if we're over a story - find which column it belongs to
    const overStory = currentSprint.stories.find(s => s.id === overId)
    if (overStory) {
      setDragOverColumn(overStory.columnId)
      return
    }

    setDragOverColumn(null)
  }

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    if (accessLevel === 'view') return
    
    const { active, over } = event
    setActiveStory(null)
    setIsDragging(false)
    setDragOverColumn(null)

    if (!over) return

    const activeStoryId = active.id as string
    const overId = over.id as string

    try {
      const activeStory = currentSprint.stories.find(s => s.id === activeStoryId)
      if (!activeStory) return

      let updatedStories = [...currentSprint.stories]

      // Handle dropping on a column (check if overId is a column ID)
      const targetColumn = currentSprint.columns.find(col => col.id === overId)
      if (targetColumn && activeStory.columnId !== overId) {
        // Moving to different column - add to end of target column
        const targetColumnStories = currentSprint.stories.filter(s => s.columnId === overId)
        
        updatedStories = updatedStories.map(story => {
          if (story.id === activeStoryId) {
            return {
              ...story,
              columnId: overId,
              sprintStatus: targetColumn.status,
              position: targetColumnStories.length, // Add to end
              lastUpdated: new Date(),
              ...(targetColumn.status === 'in_progress' && !story.startedAt && { startedAt: new Date() }),
              ...(targetColumn.status === 'done' && !story.completedAt && { completedAt: new Date() })
            }
          }
          return story
        })
      } else {
        // Handle dropping on another story (reordering within column or between columns)
        const overStory = currentSprint.stories.find(s => s.id === overId)
        if (overStory) {
          if (activeStory.columnId === overStory.columnId) {
            // Reordering within same column
            const activeIndex = currentSprint.stories.findIndex(s => s.id === activeStoryId)
            const overIndex = currentSprint.stories.findIndex(s => s.id === overId)

            if (activeIndex !== -1 && overIndex !== -1) {
              updatedStories = arrayMove(updatedStories, activeIndex, overIndex)
              
              // Update positions for stories in this column
              const columnStories = updatedStories.filter(s => s.columnId === activeStory.columnId)
              columnStories.forEach((story, index) => {
                story.position = index
              })
            }
          } else {
            // Moving to different column - insert at the position of the over story
            const overStoryColumn = currentSprint.columns.find(col => col.id === overStory.columnId)
            if (overStoryColumn) {
              updatedStories = updatedStories.map(story => {
                if (story.id === activeStoryId) {
                  return {
                    ...story,
                    columnId: overStory.columnId,
                    sprintStatus: overStoryColumn.status,
                    position: overStory.position,
                    lastUpdated: new Date(),
                    ...(overStoryColumn.status === 'in_progress' && !story.startedAt && { startedAt: new Date() }),
                    ...(overStoryColumn.status === 'done' && !story.completedAt && { completedAt: new Date() })
                  }
                }
                return story
              })
            }
          }
        }
      }

      // Mark this as our local update to prevent subscription override
      setIsLocalUpdate(true)
      
      // Update local state immediately for instant UI feedback
      const newSprint = { ...currentSprint, stories: updatedStories }
      setLocalSprint(newSprint)

      // Update database in background
      await updateSprint(currentSprint.id, {
        storyUpdates: updatedStories.map(story => ({
          id: story.id,
          sprintStatus: story.sprintStatus,
          columnId: story.columnId,
          position: story.position
        }))
      })

    } catch (error) {
      console.error('Error updating story position:', error)
      // Revert local state on error
      setLocalSprint(sprint)
    }
  }

  // Group stories by column
  const storiesByColumn: Record<string, SprintStory[]> = {}
  currentSprint.columns.forEach(column => {
    storiesByColumn[column.id] = currentSprint.stories
      .filter(story => story.columnId === column.id)
      .sort((a, b) => a.position - b.position)
  })

  // Calculate column metrics
  const getColumnMetrics = (columnId: string) => {
    const columnStories = storiesByColumn[columnId] || []
    const storyPoints = columnStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
    const column = currentSprint.columns.find(col => col.id === columnId)
    
    return {
      storyCount: columnStories.length,
      storyPoints,
      isOverWipLimit: false
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Sprint Header */}
      <SprintHeader
        sprint={currentSprint}
        accessLevel={accessLevel}
        participants={participants}
        onAddStory={() => setShowAddStoryModal(true)}
        onLeave={onLeave}
      />

      {/* Sprint Board */}
      <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          {/* Board Columns */}
          <div className="flex gap-3 sm:gap-4 md:gap-6 overflow-x-auto h-full pb-4">
            {currentSprint.columns.map(column => (
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
                    isDraggedOver={dragOverColumn === column.id}
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
          sprint={currentSprint}
          isOpen={showAddStoryModal}
          onClose={() => setShowAddStoryModal(false)}
          onStoryAdded={(newStory) => {
            // Update local sprint state with the new story (check for duplicates)
            setLocalSprint(prev => {
              // Check if story already exists to prevent duplicates
              const existingStory = prev.stories.find(s => s.id === newStory.id)
              if (existingStory) {
                return prev
              }
              
              return {
                ...prev,
                stories: [...prev.stories, newStory]
              }
            })
            
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
              <div>{currentSprint.stories.length} total</div>
            </div>
            <div>
              <div className="font-medium">Points</div>
              <div>{currentSprint.totalStoryPoints} committed</div>
            </div>
            <div>
              <div className="font-medium">Done</div>
              <div>
                {currentSprint.stories.filter(s => s.sprintStatus === 'done').length} stories
              </div>
            </div>
            <div>
              <div className="font-medium">In Progress</div>
              <div>
                {currentSprint.stories.filter(s => s.sprintStatus === 'in_progress').length} stories
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SprintBoard