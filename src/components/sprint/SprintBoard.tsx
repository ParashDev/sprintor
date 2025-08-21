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
  type DragStartEvent
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

  // Use local sprint state for immediate UI updates
  const currentSprint = localSprint

  // Set up real-time subscription for updates from other users
  useEffect(() => {
    const unsubscribe = subscribeToSprint(sprint.id, (updatedSprint) => {
      if (updatedSprint && !isLocalUpdate) {
        // Only update if this isn't our own local update
        setLocalSprint(updatedSprint)
      }
      // Reset the flag
      setIsLocalUpdate(false)
    })

    return unsubscribe
  }, [sprint.id, isLocalUpdate])

  // Update local sprint when prop changes (initial load)
  useEffect(() => {
    setLocalSprint(sprint)
  }, [sprint])

  // Configure drag sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 10 }
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 }
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

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    if (accessLevel === 'view') return
    
    const { active, over } = event
    setActiveStory(null)
    setIsDragging(false)

    if (!over) return

    const activeStoryId = active.id as string
    const overId = over.id as string

    try {
      const activeStory = currentSprint.stories.find(s => s.id === activeStoryId)
      if (!activeStory) return

      let updatedStories = [...currentSprint.stories]

      // Handle dropping on a column
      const targetColumn = currentSprint.columns.find(col => col.id === overId)
      if (targetColumn && activeStory.columnId !== overId) {
        // Moving to different column
        updatedStories = updatedStories.map(story => {
          if (story.id === activeStoryId) {
            return {
              ...story,
              columnId: overId,
              sprintStatus: targetColumn.status,
              position: currentSprint.stories.filter(s => s.columnId === overId).length,
              lastUpdated: new Date(),
              ...(targetColumn.status === 'in_progress' && !story.startedAt && { startedAt: new Date() }),
              ...(targetColumn.status === 'done' && !story.completedAt && { completedAt: new Date() })
            }
          }
          return story
        })
      } else {
        // Reordering within same column
        const activeIndex = currentSprint.stories.findIndex(s => s.id === activeStoryId)
        const overIndex = currentSprint.stories.findIndex(s => s.id === overId)

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
      isOverWipLimit: column?.wipLimit ? columnStories.length > column.wipLimit : false
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Sprint Header */}
      <SprintHeader
        sprint={currentSprint}
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
          onDragEnd={handleDragEnd}
          modifiers={[restrictToWindowEdges]}
        >
          {/* Board Columns */}
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4">
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
          sprint={currentSprint}
          isOpen={showAddStoryModal}
          onClose={() => setShowAddStoryModal(false)}
          onStoryAdded={() => setShowAddStoryModal(false)}
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