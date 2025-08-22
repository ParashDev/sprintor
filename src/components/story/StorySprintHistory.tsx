'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Users,
  BarChart3,
  ArrowRight,
  Info
} from 'lucide-react'
import type { SprintAttempt } from '@/types/story'

interface StorySprintHistoryProps {
  sprintAttempts?: SprintAttempt[]
}

export function StorySprintHistory({ sprintAttempts }: StorySprintHistoryProps) {
  if (!sprintAttempts || sprintAttempts.length === 0) {
    return null
  }

  const formatDate = (date: Date | { toDate?: () => Date } | string | number) => {
    if (!date) return 'Unknown'
    
    // Handle Firestore Timestamp objects
    let dateObj: Date
    if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
      dateObj = date.toDate()
    } else if (date instanceof Date) {
      dateObj = date
    } else {
      dateObj = new Date(date)
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date'
    }
    
    return dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: SprintAttempt['completionStatus']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'carried_over':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStageProgress = (stage: string) => {
    const stages = ['todo', 'in_progress', 'review', 'testing', 'done']
    const index = stages.indexOf(stage)
    return ((index + 1) / stages.length) * 100
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Sprint History
          <Badge variant="secondary">{sprintAttempts.length} attempts</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sprintAttempts.map((attempt, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            {/* Sprint Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  {attempt.sprintName}
                  <Badge className={getStatusColor(attempt.completionStatus)}>
                    {attempt.completionStatus === 'completed' ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {attempt.completionStatus}
                  </Badge>
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Attempt #{attempt.attemptNumber} • {formatDate(attempt.sprintStartDate)} - {formatDate(attempt.sprintEndDate)}
                </p>
              </div>
              {attempt.originalStoryPoints && (
                <Badge variant="outline">
                  {attempt.originalStoryPoints} pts
                </Badge>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress reached</span>
                <span className="font-medium">{attempt.progressPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    attempt.completionStatus === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                  }`}
                  style={{ width: `${getStageProgress(attempt.statusReached)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Todo</span>
                <span>In Progress</span>
                <span>Review</span>
                <span>Testing</span>
                <span>Done</span>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {attempt.cycleTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">{Math.round(attempt.cycleTime)}</span> hours cycle time
                  </span>
                </div>
              )}
              {attempt.blockersEncountered.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>
                    <span className="font-medium">{attempt.blockersEncountered.length}</span> blockers
                  </span>
                </div>
              )}
              {attempt.assignments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Assigned to <span className="font-medium">{attempt.assignments[0].assignedToName}</span>
                  </span>
                </div>
              )}
              {attempt.reworkCount > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-red-600" />
                  <span>
                    <span className="font-medium">{attempt.reworkCount}</span> rework cycles
                  </span>
                </div>
              )}
            </div>

            {/* Blockers if any */}
            {attempt.blockersEncountered.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Blockers encountered:</p>
                <div className="space-y-1">
                  {attempt.blockersEncountered.map((blocker, bIndex) => (
                    <div key={bIndex} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className={`h-3 w-3 mt-0.5 ${
                        blocker.severity === 'critical' ? 'text-red-600' :
                        blocker.severity === 'high' ? 'text-orange-600' :
                        blocker.severity === 'medium' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`} />
                      <div className="flex-1">
                        <span>{blocker.description}</span>
                        {blocker.resolution && (
                          <span className="text-muted-foreground ml-2">
                            → {blocker.resolution}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Retrospective Notes & Insights */}
            {(attempt.retrospectiveNotes || attempt.complexityInsights) && (
              <div className="bg-muted/50 rounded-md p-3 space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  {attempt.retrospectiveNotes ? 'Sprint Retrospective' : 'Insights'}
                </p>
                {attempt.retrospectiveNotes && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                      Why this story couldn&apos;t be completed:
                    </p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">
                      {attempt.retrospectiveNotes}
                    </p>
                  </div>
                )}
                {attempt.complexityInsights && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Complexity insights:</span> {attempt.complexityInsights}
                  </p>
                )}
              </div>
            )}

            {/* Completion reason if incomplete */}
            {attempt.completionStatus === 'incomplete' && attempt.incompleteReason && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Reason:</span> {attempt.incompleteReason}
              </div>
            )}
          </div>
        ))}

        {/* Summary insights */}
        {sprintAttempts.length > 1 && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pattern Analysis
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>• Story attempted {sprintAttempts.length} times across different sprints</p>
              {sprintAttempts.filter(a => a.completionStatus === 'completed').length > 0 && (
                <p>• Successfully completed in {sprintAttempts.filter(a => a.completionStatus === 'completed').length} sprint(s)</p>
              )}
              {sprintAttempts.some(a => a.blockersEncountered.length > 0) && (
                <p className="text-yellow-600">• Recurring blockers detected - consider re-estimation or breaking down the story</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}