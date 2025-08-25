"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Users, 
  Settings,
  Crown,
  Shield,
  User,
  Eye,
  Copy,
  UserPlus,
  Edit,
  Folder,
  Loader2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { Team } from '@/types/team'
import type { Project } from '@/lib/project-service'
import { CreateTeamModal } from './CreateTeamModal'
import { InviteMemberModal } from './InviteMemberModal'
import { ManageTeamModal } from './ManageTeamModal'
import { EditTeamModal } from './EditTeamModal'
import { toast } from 'sonner'

interface TeamsContentProps {
  teams: Team[]
  selectedProject: Project | null
  loading?: boolean
  onCreateTeam?: () => void
  showCreateModal?: boolean
  setShowCreateModal?: (show: boolean) => void
}

export function TeamsContent({ 
  teams, 
  selectedProject, 
  loading, 
  onCreateTeam, 
  showCreateModal, 
  setShowCreateModal 
}: TeamsContentProps) {
  const { user } = useAuth()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showManageModal, setShowManageModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'product_owner': return <Crown className="h-3 w-3 text-yellow-600" />
      case 'scrum_master': return <Shield className="h-3 w-3 text-blue-600" />
      case 'business_analyst': return <User className="h-3 w-3 text-purple-600" />
      case 'developer': return <User className="h-3 w-3 text-green-600" />
      case 'tester': return <User className="h-3 w-3 text-orange-600" />
      case 'stakeholder': return <Eye className="h-3 w-3 text-gray-600" />
      default: return <User className="h-3 w-3 text-gray-600" />
    }
  }

  const formatRoleName = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'product_owner': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'scrum_master': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'business_analyst': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'developer': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'tester': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'stakeholder': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const copyInviteLink = (inviteCode: string) => {
    const inviteLink = `${window.location.origin}/join-team?code=${inviteCode}`
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invite link copied to clipboard!')
  }

  const handleCreateTeam = () => {
    if (onCreateTeam) {
      onCreateTeam()
    }
  }

  const handleInviteMember = (team: Team) => {
    setSelectedTeam(team)
    setShowInviteModal(true)
  }

  const handleManageTeam = (team: Team) => {
    setSelectedTeam(team)
    setShowManageModal(true)
  }

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team)
    setShowEditModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Teams Grid */}
      {teams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No teams yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first team to start collaborating with others
            </p>
            <Button onClick={handleCreateTeam} disabled={!selectedProject}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Team
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {teams.map((team) => {
            const userMember = team.members.find(m => m.id === user?.uid)
            const isOwner = team.ownerId === user?.uid
            
            return (
              <Card key={team.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {team.name}
                        {userMember && getRoleIcon(userMember.role)}
                      </CardTitle>
                      {selectedProject && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Folder className="h-3 w-3" />
                          <span>{selectedProject.name} - {selectedProject.companyName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeColor(userMember?.role || 'developer')}>
                          {formatRoleName(userMember?.role || 'developer')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  {team.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {team.description}
                    </p>
                  )}
                  
                  {/* Team Members Preview */}
                  <div className="space-y-3 mb-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Team Members
                    </h4>
                    <div className="space-y-2">
                      {team.members.slice(0, 3).map((member) => (
                        <div key={member.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{member.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            <span className="text-xs text-muted-foreground">
                              {formatRoleName(member.role)}
                            </span>
                          </div>
                        </div>
                      ))}
                      {team.members.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{team.members.length - 3} more members
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Invite Link */}
                  {isOwner && (
                    <div className={`rounded-lg p-3 mb-4 ${team.inviteEnabled === false ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800' : 'bg-muted/50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium mb-1 ${team.inviteEnabled === false ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                            {team.inviteEnabled === false ? 'Invites Disabled' : 'Team Invite Link'}
                          </p>
                          {team.inviteEnabled !== false ? (
                            <div className="text-xs text-blue-600 dark:text-blue-400 bg-background px-2 py-1 rounded border truncate">
                              {`${window.location.origin}/join-team?code=${team.inviteCode}`}
                            </div>
                          ) : (
                            <p className="text-xs text-red-600 dark:text-red-400">
                              New members cannot join with invite link
                            </p>
                          )}
                        </div>
                        {team.inviteEnabled !== false && (
                          <div className="flex-shrink-0 pt-4">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyInviteLink(team.inviteCode)}
                              title="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    {isOwner && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => handleInviteMember(team)}
                        disabled={team.inviteEnabled === false}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {team.inviteEnabled === false ? 'Disabled' : 'Invite'}
                      </Button>
                    )}
                    {isOwner && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditTeam(team)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleManageTeam(team)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Team Roles Information */}
      <Card>
        <CardHeader>
          <CardTitle>Agile Team Roles</CardTitle>
          <CardDescription>
            Standard agile team roles for organizing your sprint team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Product Owner</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Defines requirements, prioritizes backlog, accepts stories
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Scrum Master</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Facilitates ceremonies, removes blockers, coaches team
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Business Analyst</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Analyzes requirements, documents user stories, bridges business-dev gap
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Developer</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Implements features, estimates stories, participates in planning
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Tester</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tests features, defines acceptance criteria, ensures quality
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Stakeholder</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Provides input, reviews progress, represents business interests
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Team members can still join planning sessions and sprint boards using existing room codes and passwords - roles are just for organization.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Team Modal */}
      {showCreateModal && selectedProject && setShowCreateModal && (
        <CreateTeamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          selectedProject={selectedProject}
        />
      )}

      {/* Invite Member Modal */}
      {showInviteModal && selectedTeam && (
        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => {
            setShowInviteModal(false)
            setSelectedTeam(null)
          }}
          team={selectedTeam}
        />
      )}

      {/* Manage Team Modal */}
      {showManageModal && selectedTeam && user && (
        <ManageTeamModal
          isOpen={showManageModal}
          onClose={() => {
            setShowManageModal(false)
            setSelectedTeam(null)
          }}
          team={selectedTeam}
          currentUserId={user.uid}
          onTeamUpdated={() => {
            // Teams will update via real-time subscription
          }}
        />
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <EditTeamModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedTeam(null)
          }}
          team={selectedTeam}
          onTeamUpdated={() => {
            // Teams will update via real-time subscription
          }}
          onTeamDeleted={() => {
            setShowEditModal(false)
            setSelectedTeam(null)
          }}
        />
      )}
    </div>
  )
}