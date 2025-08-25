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
import { useAuth } from '@/contexts/AuthContext'
import { createTeam, type TeamMember } from '@/lib/team-service'
import { type Project } from '@/lib/project-service'
import { toast } from 'sonner'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  selectedProject: Project
}

export function CreateTeamModal({ isOpen, onClose, selectedProject }: CreateTeamModalProps) {
  const { user } = useAuth()
  const [defaultRole, setDefaultRole] = useState<TeamMember['role']>('developer')
  const [creating, setCreating] = useState(false)
  const [isPublic, setIsPublic] = useState(false)
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('You must be logged in to create a team')
      return
    }

    const name = formRefs.current.name?.value?.trim()
    const description = formRefs.current.description?.value?.trim()

    if (!name) {
      toast.error('Team name is required')
      return
    }

    try {
      setCreating(true)
      await createTeam({
        name,
        description,
        ownerId: user.uid,
        ownerName: user.displayName || user.email || 'Unknown User',
        projectId: selectedProject.id,
        isPublic,
        defaultRole
      })
      
      toast.success('Team created successfully!')
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error('Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    if (formRefs.current.name) formRefs.current.name.value = ''
    if (formRefs.current.description) formRefs.current.description.value = ''
    setIsPublic(false)
    setDefaultRole('developer')
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
                Create New Team
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Set up a new team for collaborative sprint planning
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
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Project Assignment */}
                <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="text-lg font-medium">Project Assignment</h3>
                  
                  <div className="space-y-2">
                    <label htmlFor="project" className="text-sm font-medium">
                      Project <span className="text-destructive">*</span>
                    </label>
                    <div className="p-3 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedProject.name}</span>
                        <span className="text-sm text-muted-foreground">• {selectedProject.companyName}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This team will be created for the selected project
                    </p>
                  </div>
                </div>

                {/* Team Details */}
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
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        All members joining with the invite code will get this role by default
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

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={creating}
              className="min-w-[120px]"
            >
              {creating ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}