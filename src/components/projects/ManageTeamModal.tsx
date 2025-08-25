"use client"

import React, { useState, useEffect } from 'react'
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
import { Crown, Shield, User, Eye, Edit, Trash2, Loader2 } from 'lucide-react'
import { updateMemberRole, removeTeamMember, updateTeam, type Team, type TeamMember } from '@/lib/team-service'
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
  const [newRole, setNewRole] = useState<TeamMember['role']>('developer')
  const [loading, setLoading] = useState(false)
  const [inviteEnabled, setInviteEnabled] = useState(team.inviteEnabled !== false)

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
  }

  const handleSaveRole = async () => {
    if (!editingMember) return

    try {
      setLoading(true)
      await updateMemberRole(team.id, editingMember.id, newRole)
      toast.success(`Updated ${editingMember.name}'s role to ${formatRoleName(newRole)}`)
      setEditingMember(null)
      onTeamUpdated?.() // Trigger refresh of team data
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error('Failed to update member role')
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
        <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Team Settings
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Manage settings and members for {team.name}
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
                
                {/* Invite Settings */}
                {canManageMembers && (
                  <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
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
                <div className="space-y-4 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="text-lg font-medium">Team Members ({team.members.length})</h3>
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
                </div>

              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50">
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
          
          <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border z-[70]">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Update Member Role
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Change {editingMember.name}'s role in the team
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Role</label>
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

            <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRole} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Role'
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