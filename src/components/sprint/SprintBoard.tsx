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
import type { Sprint, SprintStory, SprintParticipant, TeamMemberRole } from '@/types/sprint'
import { updateSprint, subscribeToSprint, completeSprint } from '@/lib/sprint-service'
import { getStory, updateStory } from '@/lib/story-service'
import { getTeamsByUser } from '@/lib/team-service'
import type { TeamMember } from '@/types/team'
import { getSprintPermissions } from '@/lib/sprint-permissions'
import { SprintCompletionDialog } from './SprintCompletionDialog'
import { SprintColumn } from './SprintColumn'
import { SprintCard } from './SprintCard'
import { SprintHeader } from './SprintHeader'
import { ParticipantCursors } from './ParticipantCursors'
import { AddStoryModal } from './AddStoryModal'
import { StoryDetailModal } from '@/components/StoryDetailModal'
import type { Story } from '@/types/story'

interface SprintBoardProps {
  sprint: Sprint
  // NEW: Use team member role for proper permission handling
  teamRole: TeamMemberRole
  // DEPRECATED: Keep for backward compatibility during transition
  accessLevel?: 'view' | 'contribute' | 'admin'
  participantId: string
  participants: SprintParticipant[]
  memberName?: string
  isSprintHost?: boolean  // NEW: Whether user is the sprint creator
  onSprintUpdate?: (sprint: Sprint) => void
  onLeave?: () => void
}

export function SprintBoard({
  sprint,
  teamRole,
  accessLevel, // DEPRECATED: Keep for backward compatibility
  participantId,
  participants,
  memberName,
  isSprintHost = false,
  onSprintUpdate,
  onLeave
}: SprintBoardProps) {
  // NEW: Get role-based permissions
  const permissions = getSprintPermissions(teamRole, isSprintHost)
  
  const [localSprint, setLocalSprint] = useState(sprint)
  const [activeStory, setActiveStory] = useState<SprintStory | null>(null)
  const [showAddStoryModal, setShowAddStoryModal] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [isStartingSprint, setIsStartingSprint] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [selectedStory, setSelectedStory] = useState<SprintStory | null>(null)
  const [selectedOriginalStory, setSelectedOriginalStory] = useState<Story | null>(null)
  const [showStoryDetailModal, setShowStoryDetailModal] = useState(false)
  const [projectTeamMembers, setProjectTeamMembers] = useState<TeamMember[]>([])

  // Use local sprint state for immediate UI updates
  const currentSprint = localSprint

  // Fetch project team members for assignment (only for authorized roles)
  useEffect(() => {
    const fetchProjectTeam = async () => {
      // Only PO, Scrum Master, and Business Analyst can assign stories
      const canAssignStories = teamRole === 'product_owner' || 
                              teamRole === 'scrum_master' || 
                              teamRole === 'business_analyst' ||
                              isSprintHost
      
      if (!canAssignStories) {
        setProjectTeamMembers([])
        return
      }

      try {
        const teams = await getTeamsByUser(currentSprint.hostId)
        const projectTeam = teams.find(team => team.projectId === currentSprint.projectId)
        setProjectTeamMembers(projectTeam?.members || [])
      } catch (error) {
        console.warn('Could not fetch project team for assignment dropdown:', error instanceof Error ? error.message : String(error))
        setProjectTeamMembers([])
      }
    }

    fetchProjectTeam()
  }, [currentSprint.hostId, currentSprint.projectId, teamRole, isSprintHost])

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
    // NEW: Use role-based permission check
    if (!permissions.canMoveStories) return
    
    const { active } = event
    const activeStoryData = currentSprint.stories.find(story => story.id === active.id)
    
    if (activeStoryData) {
      setActiveStory(activeStoryData)
      setIsDragging(true)
    }
  }

  // Handle drag over to track which column is being hovered
  const handleDragOver = (event: DragOverEvent) => {
    // NEW: Use role-based permission check
    if (!permissions.canMoveStories) return

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
    // NEW: Use role-based permission check
    if (!permissions.canMoveStories) return
    
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
    
    return {
      storyCount: columnStories.length,
      storyPoints,
      isOverWipLimit: false
    }
  }

  // Handle story detail view
  const handleStoryClick = async (sprintStory: SprintStory) => {
    setSelectedStory(sprintStory)
    
    try {
      // Try to fetch the ORIGINAL story data (only works for hosts/team members)
      const originalStory = await getStory(sprintStory.originalStoryId)
      setSelectedOriginalStory(originalStory)
      setShowStoryDetailModal(true)
    } catch (error) {
      console.error('Failed to fetch original story (likely permissions):', error)
      // Fallback to converted data for participants who don't have story permissions
      const convertedStory = convertSprintStoryToStory(sprintStory)
      setSelectedOriginalStory(convertedStory)
      setShowStoryDetailModal(true)
    }
  }

  // Handle story assignment in sprint context
  const handleStoryAssignmentChange = async (storyId: string, assignedToName: string | undefined) => {
    // Check role-based permissions before attempting assignment
    const canAssignStories = teamRole === 'product_owner' || 
                            teamRole === 'scrum_master' || 
                            teamRole === 'business_analyst' ||
                            isSprintHost
    
    if (!canAssignStories) {
      console.warn('User role does not have permission to assign stories')
      return
    }

    try {
      const sprintStory = currentSprint.stories.find(s => s.id === storyId)
      if (!sprintStory) {
        console.warn('Sprint story not found:', storyId)
        return
      }

      // assignedToName is already the name from the dropdown

      // Update sprint story
      const updatedStories = currentSprint.stories.map(story => 
        story.id === storyId 
          ? { 
              ...story, 
              assignedTo: assignedToName, 
              assignedToName: assignedToName
            }
          : story
      )
      
      const updatedSprint = {
        ...currentSprint,
        stories: updatedStories,
        updatedAt: new Date()
      }

      // Update local state immediately for responsive UI
      setLocalSprint(updatedSprint)

      // Update ORIGINAL story so both modals show same assignment
      if (sprintStory.originalStoryId) {
        await updateStory(sprintStory.originalStoryId, {
          assignedTo: assignedToName || undefined  // Save the NAME
        })
      }

      // Update sprint story assignment
      await updateSprint(currentSprint.id, {
        storyUpdates: [{
          id: storyId,
          assignedTo: assignedToName
        }]
      })

      // Update selected story to reflect new assignment
      if (selectedStory && selectedStory.id === storyId) {
        setSelectedStory({
          ...selectedStory,
          assignedTo: assignedToName,
          assignedToName: assignedToName
        })
      }

      // Refresh the original story modal if open to show updated assignment
      if (selectedOriginalStory && sprintStory.originalStoryId) {
        const refreshedStory = await getStory(sprintStory.originalStoryId)
        if (refreshedStory) {
          setSelectedOriginalStory(refreshedStory)
        }
      }

    } catch (error) {
      console.warn('Failed to update story assignment:', error instanceof Error ? error.message : String(error))
      // Revert local state on error
      setLocalSprint(currentSprint)
      // Don't throw error to avoid breaking UI
    }
  }

  // Convert SprintStory to Story for the detail modal
  const convertSprintStoryToStory = (sprintStory: SprintStory): Story => {
    // Safely handle date conversion
    const safeDate = (date: unknown): Date => {
      if (!date) return new Date()
      if (date instanceof Date) return date
      if (typeof date === 'object' && date !== null && 'toDate' in date && typeof (date as any).toDate === 'function') {
        return (date as any).toDate()
      }
      if (typeof date === 'string' || typeof date === 'number') {
        const parsed = new Date(date)
        return isNaN(parsed.getTime()) ? new Date() : parsed
      }
      return new Date()
    }

    // Convert sprint comments to story comments format
    const convertedComments = (sprintStory.sprintComments || []).map(comment => ({
      id: comment.id,
      text: comment.text,
      authorId: comment.authorId,
      authorName: comment.authorName,
      createdAt: safeDate(comment.createdAt),
      type: (comment.type || 'comment') as 'comment' | 'status_change' | 'assignment' | 'estimate_change',
      mentions: comment.mentions || []
    }))

    return {
      // Basic Info
      id: sprintStory.originalStoryId || sprintStory.id,
      title: sprintStory.title || '',
      description: sprintStory.description || '',
      type: (sprintStory.originalData?.type || 'story') as 'story' | 'task' | 'bug' | 'spike',
      
      // User Story Format - not available in sprint data
      asA: undefined,
      iWant: undefined,
      soThat: undefined,
      
      // Business Details
      businessValue: 5,
      priority: (sprintStory.originalData?.priority || 'Could Have') as 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have',
      riskLevel: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
      complexity: 'Moderate' as 'Simple' | 'Moderate' | 'Complex' | 'Epic',
      
      // Acceptance Criteria & Requirements  
      acceptanceCriteria: (sprintStory.originalData?.acceptanceCriteria || []).map((criterion, index) => ({
        id: `ac-${sprintStory.id}-${index}`,
        description: criterion, // criterion is already a string
        type: 'checklist' as 'given-when-then' | 'checklist' | 'scenario',
        isCompleted: false,
        testable: true,
        priority: 'must' as 'must' | 'should' | 'could'
      })),
      definitionOfDone: [],
      functionalRequirements: [],
      nonFunctionalRequirements: [],
      businessRules: [],
      
      // Estimation & Planning
      storyPoints: sprintStory.storyPoints,
      timeEstimate: sprintStory.timeEstimate,
      estimationConfidence: 'Medium' as 'Low' | 'Medium' | 'High',
      
      // Sprint & Release Management
      sprintId: currentSprint.id,
      releaseId: undefined,
      milestoneId: undefined,
      
      // Hierarchy & Relationships
      epicId: currentSprint.epicId,
      parentStoryId: undefined,
      childStoryIds: [],
      dependencyIds: [],
      blockedByIds: [],
      relatedStoryIds: [],
      
      // Status & Workflow - Complete story lifecycle
      status: sprintStory.sprintStatus === 'todo' ? 'sprint_ready' : 
              sprintStory.sprintStatus === 'in_progress' ? 'planning' :
              sprintStory.sprintStatus === 'done' ? 'completed' : 'sprint_ready',
      workflowStatus: sprintStory.sprintStatus || 'todo',
      blockers: sprintStory.blockers || [],
      
      // Assignment & Ownership
      assignedTo: sprintStory.assignedToName,
      reportedBy: currentSprint.hostId,
      productOwner: undefined,
      stakeholders: [],
      
      // Categorization
      labels: sprintStory.originalData?.labels || [],
      components: [],
      fixVersion: undefined,
      
      // Testing & Quality
      testScenarios: [],
      testingNotes: undefined,
      bugReproductionSteps: undefined,
      
      // Attachments & Documentation
      attachments: [],
      mockups: [],
      wireframes: [],
      specifications: [],
      
      // Comments & Communication
      comments: convertedComments,
      lastDiscussion: convertedComments.length > 0 ? safeDate(convertedComments[convertedComments.length - 1].createdAt) : undefined,
      
      // Analytics & Tracking
      createdAt: safeDate(sprintStory.addedToSprintAt),
      updatedAt: safeDate(sprintStory.lastUpdated),
      startedAt: safeDate(sprintStory.startedAt),
      completedAt: safeDate(sprintStory.completedAt),
      timeInProgress: sprintStory.actualTime,
      reopenedCount: 0,
      
      // Project Association
      projectId: currentSprint.projectId,
      
      // Template Info
      createdFromTemplate: undefined,
      
      // Sprint History Tracking - Keep it simple for now
      sprintAttempts: []
    }
  }

  // Handle starting the sprint
  const handleStartSprint = async () => {
    // NEW: Use role-based permission check
    if (isStartingSprint || !permissions.canStartSprint) return
    
    try {
      setIsStartingSprint(true)
      await updateSprint(currentSprint.id, {
        status: 'active'
      })
      
      // Update local state to show active status immediately
      setLocalSprint(prev => ({
        ...prev,
        status: 'active',
        startDate: new Date()
      }))
    } catch (error) {
      console.error('Error starting sprint:', error)
    } finally {
      setIsStartingSprint(false)
    }
  }

  // Handle completing the sprint
  const handleCompleteSprint = () => {
    // NEW: Use role-based permission check
    if (!permissions.canCompleteSprint) return
    setShowCompletionDialog(true)
  }

  // Handle sprint completion
  const handleSprintCompletion = async (
    retrospectiveNotes: string,
    storyNotes: Record<string, string>,
    lessonsLearned: string[]
  ) => {
    try {
      await completeSprint({
        sprintId: currentSprint.id,
        completionReason: 'manual',
        retrospectiveNotes,
        storyNotes,
        lessonsLearned
      })
            
      // Update local state to show completed status
      setLocalSprint(prev => ({
        ...prev,
        status: 'completed',
        completedAt: new Date()
      }))
      
      setShowCompletionDialog(false)
      
      // Optionally trigger parent update or navigation
      if (onSprintUpdate) {
        onSprintUpdate({
          ...currentSprint,
          status: 'completed',
          completedAt: new Date()
        })
      }
    } catch (error) {
      console.error('Error completing sprint:', error)
    }
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Sprint Header */}
      <SprintHeader
        sprint={currentSprint}
        teamRole={teamRole}
        permissions={permissions}
        accessLevel={accessLevel} // DEPRECATED: Keep for backward compatibility
        participants={participants}
        memberName={memberName}
        isSprintHost={isSprintHost}
        onAddStory={() => setShowAddStoryModal(true)}
        onStartSprint={handleStartSprint}
        onCompleteSprint={handleCompleteSprint}
        onLeave={onLeave}
        isStartingSprint={isStartingSprint}
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
                    teamRole={teamRole}
                    permissions={permissions}
                    accessLevel={accessLevel || 'view'} // DEPRECATED: Provide fallback for backward compatibility
                    isDraggedOver={dragOverColumn === column.id}
                    onStoryClick={handleStoryClick}
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
          teamRole={teamRole}
          permissions={permissions}
          memberName={memberName}
          isSprintHost={isSprintHost}
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
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Sprint Overview
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
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

      {/* Sprint Completion Dialog */}
      {showCompletionDialog && (
        <SprintCompletionDialog
          isOpen={showCompletionDialog}
          onClose={() => setShowCompletionDialog(false)}
          sprint={currentSprint}
          onComplete={handleSprintCompletion}
        />
      )}

      {/* Story Detail Modal */}
      {selectedStory && selectedOriginalStory && (
        <StoryDetailModal
          story={selectedOriginalStory}
          isOpen={showStoryDetailModal}
          onClose={() => {
            setShowStoryDetailModal(false)
            setSelectedOriginalStory(null)
          }}
          onStoryUpdated={async () => {
            // Refresh the original story to show new comments instantly
            if (selectedStory?.originalStoryId) {
              const refreshedStory = await getStory(selectedStory.originalStoryId)
              if (refreshedStory) {
                setSelectedOriginalStory(refreshedStory)
              }
            }
          }}
          isSprintContext={true}
          sprintMembers={projectTeamMembers.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            teamRole: member.role,
            role: undefined,
            avatar: undefined,
            capacity: undefined,
            joinedAt: member.joinedAt,
            lastSeen: member.lastSeen,
            isOnline: member.isOnline,
            isHost: false
          }))}
          currentAssignee={selectedStory.assignedTo}
          onAssignmentChange={(teamRole === 'product_owner' || teamRole === 'scrum_master' || teamRole === 'business_analyst' || isSprintHost) ? async (assignedToName) => {
            await handleStoryAssignmentChange(selectedStory.id, assignedToName)
          } : undefined}
        />
      )}
    </div>
  )
}

export default SprintBoard