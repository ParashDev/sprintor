"use client"

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { addTeamMember, type Team, type TeamMember } from '@/lib/team-service'
import { toast } from 'sonner'

// Helper function to format role names consistently
const formatRoleName = (role: string) => {
  return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  team: Team
}

export function InviteMemberModal({ isOpen, onClose, team }: InviteMemberModalProps) {
  const { user } = useAuth()
  const [selectedRole, setSelectedRole] = useState<TeamMember['role']>(team.defaultRole || 'developer')
  const [inviteMethod, setInviteMethod] = useState<'code' | 'email'>('code')
  
  const formRefs = useRef({
    memberName: null as HTMLInputElement | null,
    email: null as HTMLInputElement | null
  })

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.inviteCode)
    toast.success('Invite code copied to clipboard!')
  }

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join-team?code=${team.inviteCode}`
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invite link copied to clipboard!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error('You must be logged in to invite members')
      return
    }

    if (inviteMethod === 'email') {
      // For now, just show the invite code - email invites would require backend email service
      toast.info('Email invites coming soon! Please share the invite code manually.')
      return
    }

    // For direct code-based invites, we'll just show instructions
    toast.success('Share the invite code with your team members!')
    onClose()
  }

  const resetForm = () => {
    if (formRefs.current.memberName) formRefs.current.memberName.value = ''
    if (formRefs.current.email) formRefs.current.email.value = ''
    setSelectedRole(team.defaultRole || 'developer')
    setInviteMethod('code')
  }

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

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
                Invite Team Members
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Invite new members to join {team.name} team
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
          {/* Invite Code Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Share Invite Code</h4>
            
            {/* Invite Code Display */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Team Invite Code</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={copyInviteCode}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <code className="text-lg font-mono bg-background px-3 py-2 rounded block text-center">
                {team.inviteCode}
              </code>
            </div>

            {/* Action Buttons */}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={copyInviteCode} className="w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </Button>
              <Button variant="outline" onClick={copyInviteLink} className="w-full">
                <Users className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              How to invite members:
            </h4>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Copy the invite code or link above</li>
              <li>2. Share it with team members via email, Slack, etc.</li>
              <li>3. Members can join by entering the code or clicking the link</li>
              <li>4. All new members will get '{formatRoleName(team.defaultRole || 'developer')}' role by default</li>
            </ol>
          </div>

          {/* Default Role Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Role for New Members</label>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">{formatRoleName(team.defaultRole || 'developer')}</span>
                <span className="text-xs text-muted-foreground">Current default</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              All members joining with this invite code will get '{formatRoleName(team.defaultRole || 'developer')}' role. You can change individual member roles later from team settings.
            </p>
          </div>

          {/* Current Team Members */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Current Members ({team.members.length})</h4>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {team.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{member.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatRoleName(member.role)}
                  </span>
                </div>
              ))}
            </div>
          </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}