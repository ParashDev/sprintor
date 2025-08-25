"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from 'lucide-react'
import { updateTeam, deleteTeam, type Team, type TeamMember } from '@/lib/team-service'
import { subscribeToUserProjects, type Project } from '@/lib/project-service'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface EditTeamModalProps {
  isOpen: boolean
  onClose: () => void
  team: Team
  onTeamUpdated?: () => void
  onTeamDeleted?: () => void
}

export function EditTeamModal({ isOpen, onClose, team, onTeamUpdated, onTeamDeleted }: EditTeamModalProps) {
  const { user } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [defaultRole, setDefaultRole] = useState<TeamMember['role']>(team.defaultRole || 'developer')
  const [selectedProjectId, setSelectedProjectId] = useState<string>(team.projectId)
  const [projects, setProjects] = useState<Project[]>([])
  const [isPublic, setIsPublic] = useState<boolean>(team.isPublic)
  
  const formRefs = useRef({
    name: null as HTMLInputElement | null,
    description: null as HTMLTextAreaElement | null
  })

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

  // Load user's projects
  useEffect(() => {
    if (!user || !isOpen) return

    const unsubscribe = subscribeToUserProjects(user.uid, (userProjects) => {
      setProjects(userProjects)
    })

    return unsubscribe
  }, [user, isOpen])

  // Populate form with current team data
  useEffect(() => {
    if (isOpen && team) {
      setTimeout(() => {
        if (formRefs.current.name) formRefs.current.name.value = team.name
        if (formRefs.current.description) formRefs.current.description.value = team.description || ''
        setIsPublic(team.isPublic)
        setDefaultRole(team.defaultRole || 'developer')
        setSelectedProjectId(team.projectId)
      }, 0)
    }
  }, [isOpen, team])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const name = formRefs.current.name?.value?.trim()
    const description = formRefs.current.description?.value?.trim()

    if (!name) {
      toast.error('Team name is required')
      return
    }

    if (!selectedProjectId) {
      toast.error('Please select a project for this team')
      return
    }

    try {
      setUpdating(true)
      
      await updateTeam(team.id, {
        name,
        description,
        isPublic,
        defaultRole,
        projectId: selectedProjectId
      })
      
      toast.success('Team updated successfully!')
      onTeamUpdated?.()
      onClose()
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error('Failed to update team')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteTeam = async () => {
    try {
      setDeleting(true)
      
      await deleteTeam(team.id)
      
      toast.success('Team deleted successfully!')
      onTeamDeleted?.()
      onClose()
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error('Failed to delete team')
    } finally {
      setDeleting(false)
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
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Team Settings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Update team information and settings
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-[60vh] overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              
              {!showDeleteConfirm ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Project Assignment */}
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <h3 className="text-lg font-medium">Project Assignment</h3>
                    
                    <div className="space-y-2">
                      <label htmlFor="project" className="text-sm font-medium">
                        Select Project <span className="text-destructive">*</span>
                      </label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose which project this team belongs to" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name} - {project.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Teams are project-specific to keep members organized by their work focus
                      </p>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <h3 className="text-lg font-medium">Team Details</h3>
                    
                    <div className="space-y-4">
                      {/* Team Name */}
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">
                          Team Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          ref={(el) => { if (formRefs.current) formRefs.current.name = el }}
                          id="name"
                          type="text"
                          placeholder="e.g., Frontend Team, Product Development"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          required
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium">
                          Description
                        </label>
                        <textarea
                          ref={(el) => { if (formRefs.current) formRefs.current.description = el }}
                          id="description"
                          rows={3}
                          placeholder="Describe your team's purpose and responsibilities..."
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Team Settings */}
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <h3 className="text-lg font-medium">Team Settings</h3>
                    
                    <div className="space-y-4">
                      {/* Default Role Selection */}
                      <div className="space-y-2">
                        <label htmlFor="defaultRole" className="text-sm font-medium">
                          Default Role for New Members
                        </label>
                        <Select value={defaultRole} onValueChange={(value: TeamMember['role']) => setDefaultRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="developer">Developer - Implements features, estimates stories</SelectItem>
                            <SelectItem value="tester">Tester - Tests features, ensures quality</SelectItem>
                            <SelectItem value="scrum_master">Scrum Master - Facilitates ceremonies</SelectItem>
                            <SelectItem value="business_analyst">Business Analyst - Analyzes requirements</SelectItem>
                            <SelectItem value="stakeholder">Stakeholder - Provides business input</SelectItem>
                            <SelectItem value="product_owner">Product Owner - Defines requirements, prioritizes backlog</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          All new members joining with the invite code will get this role by default
                        </p>
                      </div>

                      {/* Team Visibility */}
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">Public Team</div>
                          <div className="text-xs text-muted-foreground">
                            Allow anyone with the invite code to join this team
                          </div>
                        </div>
                        <Switch
                          checked={isPublic}
                          onCheckedChange={setIsPublic}
                        />
                      </div>

                    </div>
                  </div>
                </form>
              ) : (
                /* Delete Confirmation */
                <div className="space-y-6">
                  <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                          Delete Team Permanently
                        </h3>
                        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                          <p>
                            Are you sure you want to delete <strong>"{team.name}"</strong>? This action cannot be undone.
                          </p>
                          <ul className="mt-2 list-disc list-inside space-y-1">
                            <li>All team members will be removed</li>
                            <li>Team invite codes will become invalid</li>
                            <li>This action is permanent and cannot be reversed</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50">
          {!showDeleteConfirm ? (
            <div className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm"
              >
                Delete Team
              </Button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={updating}
                  className="text-sm"
                >
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Team'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteTeam}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Team Permanently'
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}