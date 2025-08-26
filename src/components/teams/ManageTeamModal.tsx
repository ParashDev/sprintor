"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Crown, Shield, User, Eye, Edit, Trash2, Loader2, Mail, AlertCircle, UserPlus } from 'lucide-react'
import { updateMemberRole, updateMemberDetails, removeTeamMember, updateTeam, addTeamMember, type Team, type TeamMember } from '@/lib/team-service'
import { toast } from 'sonner'

interface ManageTeamModalProps {
  isOpen: boolean
  onClose: () => void
  team: Team
  currentUserId: string
  onTeamUpdated?: () => void
}

export function ManageTeamModal({ isOpen, onClose, team, currentUserId, onTeamUpdated }: ManageTeamModalProps) {
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [newRole, setNewRole] = useState<TeamMember['role']>('developer')
  const [addMemberRole, setAddMemberRole] = useState<TeamMember['role']>('developer')
  const [loading, setLoading] = useState(false)
  const [inviteEnabled, setInviteEnabled] = useState(team.inviteEnabled !== false)
  
  // Use refs for form inputs to prevent input lag
  const editFormRefs = useRef({
    name: null as HTMLInputElement | null,
    email: null as HTMLInputElement | null
  })
  
  const addFormRefs = useRef({
    name: null as HTMLInputElement | null,
    email: null as HTMLInputElement | null
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

  // Update local state when team prop changes
  useEffect(() => {
    setInviteEnabled(team.inviteEnabled !== false)
  }, [team])

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'product_owner': return <Crown className="h-4 w-4 text-yellow-600" />
      case 'scrum_master': return <Shield className="h-4 w-4 text-blue-600" />
      case 'business_analyst': return <User className="h-4 w-4 text-purple-600" />
      case 'developer': return <User className="h-4 w-4 text-green-600" />
      case 'tester': return <User className="h-4 w-4 text-orange-600" />
      case 'stakeholder': return <Eye className="h-4 w-4 text-gray-600" />
      default: return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleEditRole = (member: TeamMember) => {
    setEditingMember(member)
    setNewRole(member.role)
    
    // Populate form refs after modal opens
    setTimeout(() => {
      if (editFormRefs.current.name) editFormRefs.current.name.value = member.name
      if (editFormRefs.current.email) editFormRefs.current.email.value = member.email || ''
    }, 0)
  }

  const handleSaveRole = async () => {
    if (!editingMember) return

    const name = editFormRefs.current.name?.value?.trim() || ''
    const email = editFormRefs.current.email?.value?.trim() || ''

    if (!name) {
      toast.error('Member name is required')
      return
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address')
        return
      }
    }

    try {
      setLoading(true)
      
      const updates: Partial<Pick<TeamMember, 'name' | 'email' | 'role'>> = {
        name,
        role: newRole
      }
      
      // Only update email if it's provided or if clearing it
      if (email) {
        updates.email = email
      } else if (editingMember.email) {
        // If user cleared the email field, set to undefined
        updates.email = undefined
      }

      await updateMemberDetails(team.id, editingMember.id, updates)
      toast.success(`Updated ${name}'s details successfully`)
      setEditingMember(null)
      onTeamUpdated?.() // Trigger refresh of team data
    } catch (error) {
      console.error('Error updating member details:', error)
      toast.error('Failed to update member details')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!removingMember) return

    try {
      setLoading(true)
      await removeTeamMember(team.id, removingMember.id)
      toast.success(`Removed ${removingMember.name} from the team`)
      setRemovingMember(null)
      onTeamUpdated?.() // Trigger refresh of team data
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteToggle = async (enabled: boolean) => {
    try {
      setLoading(true)
      await updateTeam(team.id, { inviteEnabled: enabled })
      setInviteEnabled(enabled)
      toast.success(enabled ? 'Team invites enabled' : 'Team invites disabled')
    } catch (error) {
      console.error('Error updating invite settings:', error)
      toast.error('Failed to update invite settings')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async () => {
    const name = addFormRefs.current.name?.value?.trim() || ''
    const email = addFormRefs.current.email?.value?.trim() || ''

    if (!name) {
      toast.error('Member name is required')
      return
    }

    if (!email) {
      toast.error('Member email is required')
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Check if member with this email already exists
    const existingMember = team.members.find(m => m.email?.toLowerCase() === email.toLowerCase())
    if (existingMember) {
      toast.error('A member with this email already exists')
      return
    }

    try {
      setLoading(true)
      
      // Generate a unique member ID
      const memberId = `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      await addTeamMember(team.id, {
        id: memberId,
        name,
        email,
        role: addMemberRole,
        invitedBy: currentUserId
      })

      toast.success(`Added ${name} to the team`)
      
      // Reset form and close
      if (addFormRefs.current.name) addFormRefs.current.name.value = ''
      if (addFormRefs.current.email) addFormRefs.current.email.value = ''
      setAddMemberRole('developer')
      setShowAddMember(false)
      
      onTeamUpdated?.() // Trigger refresh of team data
    } catch (error) {
      console.error('Error adding member:', error)
      if (error instanceof Error && error.message.includes('already a team member')) {
        toast.error('This person is already a team member')
      } else {
        toast.error('Failed to add team member')
      }
    } finally {
      setLoading(false)
    }
  }

  const isOwner = team.ownerId === currentUserId
  const canManageMembers = isOwner

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-muted/50 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Team Settings
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage settings and members for {team.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-md transition-colors"
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
                
                {/* Invite Settings */}
                {canManageMembers && (
                  <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
                    <h3 className="text-lg font-medium">Invite Settings</h3>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Enable Invite Link</div>
                        <div className="text-xs text-muted-foreground">
                          Allow new members to join using the invite code/link
                        </div>
                      </div>
                      <Switch
                        checked={inviteEnabled}
                        onCheckedChange={handleInviteToggle}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                {/* Team Members List */}
                <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Team Members ({team.members.length})</h3>
                    {canManageMembers && (
                      <Button
                        size="sm"
                        onClick={() => setShowAddMember(true)}
                        disabled={loading}
                        className="h-8"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {team.members.map((member) => {
                      const isCurrentUser = member.id === currentUserId
                      const isTeamOwner = team.ownerId === member.id
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {member.name}
                                  {isCurrentUser && ' (You)'}
                                  {isTeamOwner && ' (Owner)'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                {getRoleIcon(member.role)}
                                <span>{formatRoleName(member.role)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                {member.email ? (
                                  <div className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    <span>{member.email}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>No email (add for sprint access)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {canManageMembers && !isTeamOwner && (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRole(member)}
                                disabled={loading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRemovingMember(member)}
                                disabled={loading}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {!canManageMembers && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Only the team owner can manage member roles and remove members.
                      </p>
                    </div>
                  )}
                  
                  {/* Sprint Access Notice */}
                  {team.members.some(m => !m.email) && (
                    <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-orange-800 dark:text-orange-200">
                            Sprint Access Requirement
                          </p>
                          <p className="text-orange-700 dark:text-orange-300 mt-1">
                            Members without email addresses cannot access sprint boards. 
                            {canManageMembers && ' Click the edit button to add missing emails.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-muted/50 rounded-b-xl">
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Role Dialog */}
      {editingMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setEditingMember(null)}
          />
          
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md border z-[70]">
            <div className="px-6 py-4 border-b bg-muted/50 rounded-t-xl">
              <h3 className="text-lg font-semibold">
                Edit Team Member
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Update {editingMember.name}&apos;s details and permissions
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  ref={(el) => { if (editFormRefs.current) editFormRefs.current.name = el }}
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Member name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email (for sprint access)</label>
                <div className="relative">
                  <input
                    ref={(el) => { if (editFormRefs.current) editFormRefs.current.email = el }}
                    type="email"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="member@company.com"
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required for accessing sprint boards. Leave empty to remove email.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={newRole} onValueChange={(value: TeamMember['role']) => setNewRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    <SelectItem value="developer">Developer - Implements features, estimates stories</SelectItem>
                    <SelectItem value="tester">Tester - Tests features, ensures quality</SelectItem>
                    <SelectItem value="scrum_master">Scrum Master - Facilitates ceremonies</SelectItem>
                    <SelectItem value="business_analyst">Business Analyst - Analyzes requirements</SelectItem>
                    <SelectItem value="stakeholder">Stakeholder - Provides business input</SelectItem>
                    <SelectItem value="product_owner">Product Owner - Defines requirements, prioritizes backlog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-muted/50 rounded-b-xl">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRole} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMember && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowAddMember(false)}
          />
          
          <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md border z-[70]">
            <div className="px-6 py-4 border-b bg-muted/50 rounded-t-xl">
              <h3 className="text-lg font-semibold">
                Add Team Member
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manually add a new member to {team.name}
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  ref={(el) => { if (addFormRefs.current) addFormRefs.current.name = el }}
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Enter member's name"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email (required)</label>
                <div className="relative">
                  <input
                    ref={(el) => { if (addFormRefs.current) addFormRefs.current.email = el }}
                    type="email"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="member@company.com"
                  />
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Required for sprint board access
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={addMemberRole} onValueChange={(value: TeamMember['role']) => setAddMemberRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[80]">
                    <SelectItem value="developer">Developer - Implements features, estimates stories</SelectItem>
                    <SelectItem value="tester">Tester - Tests features, ensures quality</SelectItem>
                    <SelectItem value="scrum_master">Scrum Master - Facilitates ceremonies</SelectItem>
                    <SelectItem value="business_analyst">Business Analyst - Analyzes requirements</SelectItem>
                    <SelectItem value="stakeholder">Stakeholder - Provides business input</SelectItem>
                    <SelectItem value="product_owner">Product Owner - Defines requirements, prioritizes backlog</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-muted/50 rounded-b-xl">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddMember(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removingMember?.name}</strong> from the team? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Member'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}