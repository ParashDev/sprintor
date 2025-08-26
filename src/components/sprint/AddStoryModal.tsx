'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Search, Plus, Clock, User, Target } from 'lucide-react'
import type { Sprint, SprintStory, TeamMemberRole } from '@/types/sprint'
import type { Story } from '@/types/story'
import type { SprintPermissions } from '@/lib/sprint-permissions'
import { getStoriesByProject } from '@/lib/story-service'
import { addStoryToSprint } from '@/lib/sprint-service'

interface AddStoryModalProps {
  sprint: Sprint
  // NEW: Role-based permission props
  teamRole?: TeamMemberRole
  permissions?: SprintPermissions
  memberName?: string
  isSprintHost?: boolean
  isOpen: boolean
  onClose: () => void
  onStoryAdded: (story: SprintStory) => void
}

export function AddStoryModal({ 
  sprint, 
  teamRole,
  permissions,
  memberName,
  isSprintHost = false,
  isOpen, 
  onClose, 
  onStoryAdded 
}: AddStoryModalProps) {
  const [availableStories, setAvailableStories] = useState<Story[]>([])
  const [filteredStories, setFilteredStories] = useState<Story[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStories, setSelectedStories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAddingStories, setIsAddingStories] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Fetch available stories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableStories()
      setSearchQuery('')
      setSelectedStories([])
    }
  }, [isOpen, sprint.projectId])

  // Filter stories based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStories(availableStories)
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = availableStories.filter(story =>
        story.title.toLowerCase().includes(query) ||
        story.description.toLowerCase().includes(query) ||
        story.labels?.some(label => label.toLowerCase().includes(query))
      )
      setFilteredStories(filtered)
    }
  }, [searchQuery, availableStories])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const fetchAvailableStories = async () => {
    setIsLoading(true)
    try {
      // Get all sprint_ready stories from the project that aren't already in the sprint
      const stories = await getStoriesByProject(sprint.projectId, {
        status: ['sprint_ready']
      })

      // Filter out stories already in the sprint
      const existingStoryIds = new Set(
        sprint.stories.map(s => s.originalStoryId).filter(Boolean)
      )
      
      const available = stories.filter(story => !existingStoryIds.has(story.id))
      
      // If sprint has epic filter, apply it
      const finalStories = sprint.epicId 
        ? available.filter(story => story.epicId === sprint.epicId)
        : available

      setAvailableStories(finalStories)
    } catch (error) {
      console.error('Error fetching available stories:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoryToggle = (storyId: string) => {
    setSelectedStories(prev =>
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    )
  }

  const handleAddStories = async () => {
    if (selectedStories.length === 0) return

    setIsAddingStories(true)
    try {
      // Add each selected story to the sprint
      for (const storyId of selectedStories) {
        await addStoryToSprint(sprint.id, storyId)
        
        // Create the sprint story object for immediate UI update
        const projectStory = availableStories.find(s => s.id === storyId)
        if (projectStory) {
          // Always add new stories to the "To Do" column
          const todoColumn = sprint.columns.find(col => col.status === 'todo')
          const todoColumnId = todoColumn?.id || sprint.columns[0]?.id || 'todo'
          
          const sprintStory: SprintStory = {
            id: `${sprint.id}_${storyId}`,
            originalStoryId: storyId,
            title: projectStory.title,
            description: projectStory.description,
            sprintStatus: 'todo',
            columnId: todoColumnId,
            position: sprint.stories.filter(s => s.columnId === todoColumnId).length,
            storyPoints: projectStory.storyPoints,
            progress: 0,
            blockers: [],
            sprintComments: [],
            statusHistory: [],
            originalData: {
              type: projectStory.type,
              priority: projectStory.priority,
              acceptanceCriteria: projectStory.acceptanceCriteria.map(ac => ac.description),
              labels: projectStory.labels
            },
            addedToSprintAt: new Date(),
            lastUpdated: new Date()
          }
          
          onStoryAdded(sprintStory)
        }
      }
      
      onClose()
    } catch (error) {
      console.error('Error adding stories to sprint:', error)
    } finally {
      setIsAddingStories(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Add Stories to Sprint
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Select stories from your project backlog to add to this sprint
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stories by title, description, or labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stories List */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-slate-400 dark:text-slate-500 mb-2">
                {searchQuery ? 'No stories match your search' : 'No stories available'}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Make sure you have stories in "Sprint Ready" status'
                }
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-3">
                {filteredStories.map(story => {
                  const isSelected = selectedStories.includes(story.id)
                  return (
                    <div
                      key={story.id}
                      onClick={() => handleStoryToggle(story.id)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-gray-500 bg-gray-50 dark:bg-gray-800/50' 
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Story Header */}
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleStoryToggle(story.id)}
                              className="rounded border-slate-300 dark:border-slate-600 text-gray-600 focus:ring-gray-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              #{story.id.slice(-6)}
                            </span>
                            <span className={`
                              px-2 py-0.5 rounded-full text-xs font-medium
                              ${story.type === 'story' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                story.type === 'bug' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                story.type === 'task' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                                'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                              }
                            `}>
                              {story.type}
                            </span>
                            <span className={`
                              px-2 py-0.5 rounded-full text-xs font-medium
                              ${story.priority === 'Must Have' ? 'bg-gray-800 text-gray-100 dark:bg-gray-200 dark:text-gray-800' :
                                story.priority === 'Should Have' ? 'bg-gray-600 text-gray-100 dark:bg-gray-300 dark:text-gray-800' :
                                story.priority === 'Could Have' ? 'bg-gray-400 text-gray-100 dark:bg-gray-400 dark:text-gray-100' :
                                'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              }
                            `}>
                              {story.priority}
                            </span>
                          </div>

                          {/* Story Title */}
                          <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                            {story.title}
                          </h3>

                          {/* Story Description */}
                          {story.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                              {story.description}
                            </p>
                          )}

                          {/* Story Details */}
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            {story.storyPoints && (
                              <div className="flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                <span>{story.storyPoints} points</span>
                              </div>
                            )}
                            {story.timeEstimate && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{story.timeEstimate}</span>
                              </div>
                            )}
                            {story.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>Assigned</span>
                              </div>
                            )}
                          </div>

                          {/* Labels */}
                          {story.labels && story.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {story.labels.slice(0, 3).map(label => (
                                <span
                                  key={label}
                                  className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                                >
                                  {label}
                                </span>
                              ))}
                              {story.labels.length > 3 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-500">
                                  +{story.labels.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {selectedStories.length > 0 
              ? `${selectedStories.length} ${selectedStories.length === 1 ? 'story' : 'stories'} selected`
              : 'Select stories to add to the sprint'
            }
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddStories}
              disabled={selectedStories.length === 0 || isAddingStories}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 disabled:bg-slate-400 disabled:cursor-not-allowed text-white dark:text-gray-900 rounded-lg transition-colors"
            >
              {isAddingStories ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add {selectedStories.length > 0 ? `${selectedStories.length} ` : ''}Stories
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddStoryModal