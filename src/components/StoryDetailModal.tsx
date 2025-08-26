"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StorySprintHistory } from "@/components/story/StorySprintHistory"
import { 
  Edit, 
  Calendar, 
  User, 
  Target, 
  AlertCircle, 
  MessageSquare,
  Send,
  Clock,
  Hash,
  Flag,
  Zap,
  X,
  Trash2
} from "lucide-react"
import type { Story } from "@/types/story"
import { addStoryComment, deleteStoryComment } from "@/lib/story-service"
import { useAuth } from "@/contexts/AuthContext"

interface StoryDetailModalProps {
  story: Story | null
  isOpen: boolean
  onClose: () => void
  onEdit?: () => void
  onStoryUpdated?: () => void
}

export function StoryDetailModal({ story, isOpen, onClose, onEdit, onStoryUpdated }: StoryDetailModalProps) {
  const { user } = useAuth()
  const [newComment, setNewComment] = useState("")
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

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

  if (!story) return null

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return

    setIsAddingComment(true)
    try {
      await addStoryComment(story.id, {
        text: newComment.trim(),
        authorId: user.uid,
        authorName: user.displayName || user.email || "Unknown User",
        type: 'comment',
        mentions: []
      })
      setNewComment("")
      
      // Notify parent to refresh story data
      if (onStoryUpdated) {
        onStoryUpdated()
      }
    } catch (error) {
      console.error("Failed to add comment:", error)
    } finally {
      setIsAddingComment(false)
    }
  }

  const handleDeleteComment = async () => {
    if (!user || !story || !commentToDelete) return

    setDeletingCommentId(commentToDelete)
    try {
      await deleteStoryComment(story.id, commentToDelete)
      
      // Notify parent to refresh story data
      if (onStoryUpdated) {
        onStoryUpdated()
      }
    } catch (error) {
      console.error("Failed to delete comment:", error)
    } finally {
      setDeletingCommentId(null)
      setCommentToDelete(null)
    }
  }

  const confirmDeleteComment = (commentId: string) => {
    setCommentToDelete(commentId)
  }

  const cancelDeleteComment = () => {
    setCommentToDelete(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'backlog': return 'bg-muted text-muted-foreground'
      case 'planning': return 'bg-muted text-muted-foreground'
      case 'sprint_ready': return 'bg-muted text-muted-foreground'
      case 'completed': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Must Have': return 'bg-muted text-muted-foreground'
      case 'Should Have': return 'bg-muted text-muted-foreground'
      case 'Could Have': return 'bg-muted text-muted-foreground'
      case 'Won\'t Have': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical': return 'bg-muted text-muted-foreground'
      case 'High': return 'bg-muted text-muted-foreground'
      case 'Medium': return 'bg-muted text-muted-foreground'
      case 'Low': return 'bg-muted text-muted-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border">
        {/* Header */}
        <div className="px-4 py-3 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base md:text-lg font-semibold mb-1 line-clamp-2">{story.title}</h2>
              <div className="flex items-center gap-1 flex-wrap">
                <Badge variant="outline" className="text-xs px-1 py-0">
                  #{story.id.split('_')[2] || story.id.slice(-6)}
                </Badge>
                <Badge variant="outline" className="text-xs px-1 py-0">
                  {story.type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="px-2 py-1 h-7 text-xs md:px-3 md:h-8 md:text-sm"
                  onClick={onEdit}
                >
                  <Edit className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                  <span className="hidden md:inline">Edit</span>
                </Button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-accent rounded-md transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-[75vh] overflow-y-auto px-4 md:px-6 py-4">
            
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column - Story Content */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* User Story - Compact */}
                {(story.asA || story.iWant || story.soThat) && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">User Story</h4>
                    <div className="space-y-1 text-sm">
                      {story.asA && <p><span className="font-medium">As a</span> {story.asA}</p>}
                      {story.iWant && <p><span className="font-medium">I want</span> {story.iWant}</p>}
                      {story.soThat && <p><span className="font-medium">So that</span> {story.soThat}</p>}
                    </div>
                  </div>
                )}

                {/* Description - Compact */}
                {story.description && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {story.description}
                    </p>
                  </div>
                )}

                {/* Acceptance Criteria */}
                {story.acceptanceCriteria.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">
                      Acceptance Criteria ({story.acceptanceCriteria.length})
                    </h4>
                    <div className="space-y-2">
                      {story.acceptanceCriteria.slice(0, 5).map((criterion, index) => (
                        <div key={criterion.id} className="flex items-start gap-2">
                          <span className="text-xs text-muted-foreground mt-0.5 font-mono">
                            {index + 1}.
                          </span>
                          <p className="text-sm flex-1">{criterion.description}</p>
                        </div>
                      ))}
                      {story.acceptanceCriteria.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          +{story.acceptanceCriteria.length - 5} more criteria...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Labels */}
                {story.labels.length > 0 && (
                  <div className="bg-muted/50 border border-border rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Labels</h4>
                    <div className="flex flex-wrap gap-1">
                      {story.labels.map((label) => (
                        <Badge key={label} variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Sidebar */}
              <div className="space-y-4">
                
                {/* Key Details */}
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-3">Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <Badge className={`text-xs ${getStatusColor(story.status)}`}>
                        {story.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Priority</span>
                      <Badge className={`text-xs ${getPriorityColor(story.priority)}`}>
                        {story.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Risk</span>
                      <Badge className={`text-xs ${getRiskColor(story.riskLevel)}`}>
                        {story.riskLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Points</span>
                      <span className="text-sm font-medium">{story.storyPoints || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Business Value</span>
                      <span className="text-sm font-medium">{story.businessValue}/10</span>
                    </div>
                  </div>
                </div>

                {/* People */}
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-3">People</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Reporter</p>
                        <p className="text-sm">
                          {story.reportedBy === user?.uid 
                            ? (user?.displayName || user?.email || "You") 
                            : "Team Member"}
                        </p>
                      </div>
                    </div>
                    {story.assignedTo && (
                      <div className="flex items-center gap-2">
                        <User className="w-3 h-3 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground">Assigned To</p>
                          <p className="text-sm">{story.assignedTo}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-muted/50 border border-border rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-3">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm">{story.createdAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Updated</p>
                        <p className="text-sm">{story.updatedAt.toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments Section - Full Width */}
            <div className="mt-6 bg-muted/50 border border-border rounded-lg p-4">
              <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4" />
                Comments ({story.comments.length})
              </h4>
              
              {/* Add Comment */}
              {user && (
                <div className="bg-background border border-border rounded-lg p-3 mb-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] mb-3 resize-none border-0 bg-transparent focus-visible:ring-1"
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || isAddingComment}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {isAddingComment ? "Adding..." : "Comment"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Comments List */}
              {story.comments.length > 0 ? (
                <div className="space-y-3">
                  {story.comments.map((comment) => (
                    <div key={comment.id} className="bg-background border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {comment.authorName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium">{comment.authorName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {comment.createdAt instanceof Date 
                              ? (
                                <>
                                  <span className="hidden md:inline">{comment.createdAt.toLocaleString()}</span>
                                  <span className="md:hidden">{comment.createdAt.toLocaleDateString()}</span>
                                </>
                              ) : (
                                <>
                                  <span className="hidden md:inline">{new Date(comment.createdAt).toLocaleString()}</span>
                                  <span className="md:hidden">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                </>
                              )}
                          </span>
                          {/* Show delete button only for own comments */}
                          {user && comment.authorId === user.uid && (
                            <button
                              onClick={() => confirmDeleteComment(comment.id)}
                              disabled={deletingCommentId === comment.id}
                              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors disabled:opacity-50"
                              title="Delete comment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap mt-2 pl-8">{comment.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                  {user && <p className="text-xs">Be the first to add a comment!</p>}
                </div>
              )}
            </div>

            {/* Sprint History Section - Full Width */}
            {story.sprintAttempts && story.sprintAttempts.length > 0 && (
              <div className="mt-6">
                <StorySprintHistory sprintAttempts={story.sprintAttempts} />
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Delete Comment Confirmation Dialog */}
      {commentToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelDeleteComment} />
          <div className="relative bg-background rounded-lg shadow-xl p-6 w-full max-w-md border">
            <h3 className="text-lg font-semibold mb-2">Delete Comment</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this comment? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDeleteComment} disabled={deletingCommentId !== null}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteComment}
                disabled={deletingCommentId !== null}
              >
                {deletingCommentId ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}