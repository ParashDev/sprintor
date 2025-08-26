'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft,
  TrendingUp,
  Users,
  Target,
  Clock,
  ChevronRight,
  Info
} from 'lucide-react'
import type { Sprint, SprintStory } from '@/types/sprint'

interface SprintCompletionDialogProps {
  isOpen: boolean
  onClose: () => void
  sprint: Sprint | null
  onComplete: (retrospectiveNotes: string, storyNotes: Record<string, string>, lessonsLearned: string[]) => Promise<void>
}

export function SprintCompletionDialog({
  isOpen,
  onClose,
  sprint,
  onComplete
}: SprintCompletionDialogProps) {
  const [retrospectiveNotes, setRetrospectiveNotes] = useState('')
  const [storyNotes, setStoryNotes] = useState<Record<string, string>>({})
  const [lessonsLearned, setLessonsLearned] = useState('')
  const [isCompleting, setIsCompleting] = useState(false)
  const [completedStories, setCompletedStories] = useState<SprintStory[]>([])
  const [incompleteStories, setIncompleteStories] = useState<SprintStory[]>([])

  useEffect(() => {
    if (sprint) {
      const completed = sprint.stories.filter(s => s.sprintStatus === 'done')
      const incomplete = sprint.stories.filter(s => s.sprintStatus !== 'done')
      setCompletedStories(completed)
      setIncompleteStories(incomplete)
    }
  }, [sprint])

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const lessons = lessonsLearned
        .split('\n')
        .filter(l => l.trim())
        .map(l => l.trim())
      
      await onComplete(retrospectiveNotes, storyNotes, lessons)
      
      // Reset form
      setRetrospectiveNotes('')
      setStoryNotes({})
      setLessonsLearned('')
      onClose()
    } catch (error) {
      console.error('Error completing sprint:', error)
    } finally {
      setIsCompleting(false)
    }
  }

  const updateStoryNote = (storyId: string, note: string) => {
    setStoryNotes(prev => ({
      ...prev,
      [storyId]: note
    }))
  }

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !sprint) return null

  const completionRate = sprint.stories.length > 0 
    ? Math.round((completedStories.length / sprint.stories.length) * 100)
    : 0
    
  const completedPoints = completedStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
  const totalPoints = sprint.stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)
  
  // Check if all incomplete stories have notes
  const allIncompleteStoriesHaveNotes = incompleteStories.length === 0 || 
    incompleteStories.every(story => (storyNotes[story.id] || '').trim().length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b shrink-0">
          <h2 className="text-xl font-semibold">Complete Sprint: {sprint.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review sprint results and provide retrospective feedback before completing
          </p>
        </div>

        {/* Content - Scrollable */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <div className="space-y-6">
            {/* Sprint Summary */}
            <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium">Completed</span>
              </div>
              <div className="text-2xl font-bold">{completedStories.length}</div>
              <div className="text-sm text-muted-foreground">
                {completedPoints} story points
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="font-medium">Incomplete</span>
              </div>
              <div className="text-2xl font-bold">{incompleteStories.length}</div>
              <div className="text-sm text-muted-foreground">
                {totalPoints - completedPoints} story points
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Sprint Completion Rate</span>
              <span className="text-lg font-bold">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Incomplete Stories Warning with Notes */}
          {incompleteStories.length > 0 && (
            <div className="space-y-4">
              <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  <strong>{incompleteStories.length} incomplete {incompleteStories.length === 1 ? 'story' : 'stories'}</strong> will be returned to the backlog for re-grooming.
                </AlertDescription>
              </Alert>
              
              {/* Story-specific notes section - Always visible */}
              <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Story-Specific Notes <span className="text-red-500">*</span>
                  </h4>
                  <span className="text-xs text-muted-foreground bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                    Required for incomplete stories
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Please explain why each incomplete story couldn't be finished.</strong> This information will help the team during re-grooming and improve future sprint planning.
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {incompleteStories.map(story => (
                    <div key={story.id} className="bg-white dark:bg-slate-800 border rounded-lg p-2 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                            <p className="text-sm font-medium">{story.title}</p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              Status: {story.sprintStatus?.replace('_', ' ').toUpperCase()}
                            </span>
                            {story.storyPoints && (
                              <span className="bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                                {story.storyPoints} points
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Why wasn't this story completed? <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          placeholder="e.g., Blocked by dependencies, technical complexity underestimated, requirements changed, external API issues..."
                          value={storyNotes[story.id] || ''}
                          onChange={(e) => updateStoryNote(story.id, e.target.value)}
                          rows={2}
                          className="text-sm"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Retrospective Notes */}
          <div className="space-y-2">
            <Label htmlFor="retrospective">
              Sprint Retrospective Notes
              <span className="text-muted-foreground text-sm ml-2">(optional)</span>
            </Label>
            <Textarea
              id="retrospective"
              placeholder="What went well? What could be improved? Any blockers encountered?"
              value={retrospectiveNotes}
              onChange={(e) => setRetrospectiveNotes(e.target.value)}
              rows={4}
            />
          </div>

          {/* Lessons Learned */}
          <div className="space-y-2">
            <Label htmlFor="lessons">
              Key Lessons Learned
              <span className="text-muted-foreground text-sm ml-2">(one per line)</span>
            </Label>
            <Textarea
              id="lessons"
              placeholder="Enter key learnings from this sprint (one per line)"
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info about what happens next */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>What happens when you complete this sprint:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Completed stories will move to &quot;completed&quot; status and won&apos;t appear in future sprints</li>
                <li>• Incomplete stories will return to &quot;backlog&quot; status for re-grooming</li>
                <li>• Sprint attempt history will be preserved for all stories</li>
                <li>• Sprint board will become read-only for historical reference</li>
                <li>• Sprint metrics will be calculated and archived</li>
              </ul>
            </AlertDescription>
          </Alert>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0 bg-background">
          {/* Validation message */}
          {incompleteStories.length > 0 && !allIncompleteStoriesHaveNotes && (
            <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Please provide reasons for all incomplete stories before completing the sprint.
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCompleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={isCompleting || !allIncompleteStoriesHaveNotes}
            >
              {isCompleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Completing Sprint...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Sprint
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}