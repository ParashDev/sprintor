// Team Management Types

export interface Team {
  id: string
  name: string
  description?: string
  ownerId: string
  ownerName: string
  members: TeamMember[]
  createdAt: Date
  updatedAt: Date
  projectId: string
  inviteCode: string
  isPublic: boolean
  defaultRole: TeamMember['role']
  inviteEnabled: boolean
}

export interface TeamMember {
  id: string
  name: string
  email?: string
  role: 'product_owner' | 'scrum_master' | 'business_analyst' | 'developer' | 'tester' | 'stakeholder'
  joinedAt: Date
  lastSeen: Date
  isOnline: boolean
  invitedBy: string
  status: 'active' | 'invited' | 'inactive'
}

export interface TeamInvite {
  id: string
  teamId: string
  teamName: string
  invitedEmail?: string
  invitedBy: string
  invitedByName: string
  role: TeamMember['role']
  inviteCode: string
  expiresAt: Date
  createdAt: Date
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}

export interface CreateTeamRequest {
  name: string
  description?: string
  ownerId: string
  ownerName: string
  ownerEmail?: string // Include owner's email for sprint access verification
  projectId: string
  isPublic: boolean
  defaultRole?: TeamMember['role']
}

export interface InviteTeamMemberRequest {
  teamId: string
  email?: string
  inviteCode?: string
  role: TeamMember['role']
  invitedBy: string
  invitedByName: string
}

export interface JoinTeamRequest {
  inviteCode: string
  memberName: string
  memberId: string
}

// Firestore document types for proper timestamp handling
export interface FirestoreTeam extends Omit<Team, 'createdAt' | 'updatedAt' | 'members'> {
  createdAt: { toDate(): Date } | Date
  updatedAt: { toDate(): Date } | Date
  members: FirestoreTeamMember[]
}

export interface FirestoreTeamMember extends Omit<TeamMember, 'joinedAt' | 'lastSeen'> {
  joinedAt: { toDate(): Date } | Date
  lastSeen: { toDate(): Date } | Date
}

export interface FirestoreTeamInvite extends Omit<TeamInvite, 'expiresAt' | 'createdAt'> {
  expiresAt: { toDate(): Date } | Date
  createdAt: { toDate(): Date } | Date
}