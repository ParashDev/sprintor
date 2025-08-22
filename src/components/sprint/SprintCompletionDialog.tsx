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
  const [expandedStoryNotes, setExpandedStoryNotes] = useState(false)

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
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{incompleteStories.length} incomplete {incompleteStories.length === 1 ? 'story' : 'stories'}</strong> will be returned to the backlog for re-grooming.
                  <button
                    type="button"
                    onClick={() => setExpandedStoryNotes(!expandedStoryNotes)}
                    className="text-sm text-primary hover:underline ml-2"
                  >
                    {expandedStoryNotes ? 'Hide' : 'Add'} story-specific notes
                  </button>
                </AlertDescription>
              </Alert>
              
              {/* Story-specific notes section */}
              {expandedStoryNotes && (
                <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Story-Specific Retrospective Notes
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Add notes for why each story couldn't be completed. This helps with future estimation.
                  </p>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {incompleteStories.map(story => (
                      <div key={story.id} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{story.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">
                                Status reached: {story.sprintStatus}
                              </span>
                              {story.storyPoints && (
                                <span className="text-xs text-muted-foreground">
                                  • {story.storyPoints} pts
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Textarea
                          placeholder="Why couldn't this story be completed? Any blockers or issues?"
                          value={storyNotes[story.id] || ''}
                          onChange={(e) => updateStoryNote(story.id, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                <li>• Completed stories will move to "completed" status and won't appear in future sprints</li>
                <li>• Incomplete stories will return to "backlog" status for re-grooming</li>
                <li>• Sprint attempt history will be preserved for all stories</li>
                <li>• Sprint board will become read-only for historical reference</li>
                <li>• Sprint metrics will be calculated and archived</li>
              </ul>
            </AlertDescription>
          </Alert>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end gap-3 shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCompleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isCompleting}
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
  )
}