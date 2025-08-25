import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Team,
  TeamMember,
  TeamInvite,
  CreateTeamRequest,
  InviteTeamMemberRequest,
  JoinTeamRequest,
  FirestoreTeam,
  FirestoreTeamMember,
  FirestoreTeamInvite
} from '@/types/team'

// Re-export types for convenience
export type {
  Team,
  TeamMember,
  TeamInvite,
  CreateTeamRequest,
  InviteTeamMemberRequest,
  JoinTeamRequest
} from '@/types/team'

// === UTILITY FUNCTIONS ===

// Generate unique IDs and codes
function generateTeamId(): string {
  return `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase()
}

function generateInviteId(): string {
  return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Convert Firestore Team to our Team type
function convertFirestoreTeam(doc: FirestoreTeam): Team {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt?.toDate() || new Date(),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : doc.updatedAt?.toDate() || new Date(),
    members: doc.members?.map(convertFirestoreTeamMember) || [],
    inviteEnabled: doc.inviteEnabled !== undefined ? doc.inviteEnabled : true // Default to true for existing teams
  }
}

function convertFirestoreTeamMember(member: FirestoreTeamMember): TeamMember {
  return {
    ...member,
    joinedAt: member.joinedAt instanceof Date ? member.joinedAt : member.joinedAt?.toDate() || new Date(),
    lastSeen: member.lastSeen instanceof Date ? member.lastSeen : member.lastSeen?.toDate() || new Date()
  }
}

function convertFirestoreTeamInvite(doc: FirestoreTeamInvite): TeamInvite {
  return {
    ...doc,
    expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt : doc.expiresAt?.toDate() || new Date(),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt?.toDate() || new Date()
  }
}

// === TEAM MANAGEMENT FUNCTIONS ===

// Create a new team
export async function createTeam(teamData: CreateTeamRequest): Promise<string> {
  try {
    const teamId = generateTeamId()
    const inviteCode = generateInviteCode()
    
    // Create the owner as first team member
    const ownerMember: TeamMember = {
      id: teamData.ownerId,
      name: teamData.ownerName,
      role: 'product_owner',
      joinedAt: new Date(),
      lastSeen: new Date(),
      isOnline: true,
      invitedBy: teamData.ownerId,
      status: 'active'
    }

    const team: Omit<Team, 'createdAt' | 'updatedAt'> = {
      id: teamId,
      name: teamData.name,
      description: teamData.description,
      ownerId: teamData.ownerId,
      ownerName: teamData.ownerName,
      members: [ownerMember],
      projectId: teamData.projectId,
      inviteCode,
      isPublic: teamData.isPublic,
      defaultRole: teamData.defaultRole || 'developer',
      inviteEnabled: true
    }

    await setDoc(doc(db, 'teams', teamId), {
      ...team,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      members: [{ 
        ...ownerMember,
        joinedAt: Timestamp.fromDate(ownerMember.joinedAt),
        lastSeen: Timestamp.fromDate(ownerMember.lastSeen)
      }]
    })

    return teamId
  } catch (error) {
    console.error('Error creating team:', error)
    throw new Error('Failed to create team')
  }
}

// Get team by ID
export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const teamRef = doc(db, 'teams', teamId)
    const teamSnap = await getDoc(teamRef)
    
    if (!teamSnap.exists()) {
      return null
    }

    const data = teamSnap.data() as FirestoreTeam
    return convertFirestoreTeam(data)
  } catch (error) {
    console.error('Error fetching team:', error)
    return null
  }
}

// Get team by invite code
export async function getTeamByInviteCode(inviteCode: string): Promise<Team | null> {
  try {
    const teamsQuery = query(
      collection(db, 'teams'),
      where('inviteCode', '==', inviteCode),
      limit(1)
    )
    
    const snapshot = await getDocs(teamsQuery)
    
    if (snapshot.empty) {
      return null
    }

    const data = snapshot.docs[0].data() as FirestoreTeam
    return convertFirestoreTeam(data)
  } catch (error) {
    console.error('Error fetching team by invite code:', error)
    return null
  }
}

// Get teams where user is a member (for now, just teams they own)
export async function getTeamsByUser(userId: string): Promise<Team[]> {
  try {
    const teamsQuery = query(
      collection(db, 'teams'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    )
    
    const snapshot = await getDocs(teamsQuery)
    const teams: Team[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreTeam
      teams.push(convertFirestoreTeam(data))
    })
    
    return teams
  } catch (error) {
    console.error('Error fetching user teams:', error)
    return []
  }
}

// Subscribe to teams changes for real-time updates
export function subscribeToUserTeams(userId: string, callback: (teams: Team[]) => void): () => void {
  const teamsQuery = query(
    collection(db, 'teams'),
    where('ownerId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  
  const unsubscribe = onSnapshot(teamsQuery, (snapshot) => {
    const teams: Team[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreTeam
      teams.push(convertFirestoreTeam(data))
    })
    
    callback(teams)
  }, (error) => {
    console.error('Error in teams subscription:', error)
  })
  
  return unsubscribe
}

// Update team
export async function updateTeam(teamId: string, updates: Partial<Omit<Team, 'id' | 'createdAt' | 'ownerId'>>): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId)
    await updateDoc(teamRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating team:', error)
    throw new Error('Failed to update team')
  }
}

// Delete team
export async function deleteTeam(teamId: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId)
    await deleteDoc(teamRef)
  } catch (error) {
    console.error('Error deleting team:', error)
    throw new Error('Failed to delete team')
  }
}

// === TEAM MEMBER MANAGEMENT ===

// Add member to team
export async function addTeamMember(teamId: string, member: Omit<TeamMember, 'joinedAt' | 'lastSeen' | 'isOnline' | 'status'>): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId)
    const teamSnap = await getDoc(teamRef)
    
    if (!teamSnap.exists()) {
      throw new Error('Team not found')
    }

    const teamData = teamSnap.data() as FirestoreTeam
    const existingMember = teamData.members.find(m => m.id === member.id)
    
    if (existingMember) {
      throw new Error('User is already a team member')
    }

    const newMember: TeamMember = {
      ...member,
      joinedAt: new Date(),
      lastSeen: new Date(),
      isOnline: true,
      status: 'active'
    }

    const updatedMembers = [...teamData.members, {
      ...newMember,
      joinedAt: Timestamp.fromDate(newMember.joinedAt),
      lastSeen: Timestamp.fromDate(newMember.lastSeen)
    }]

    await updateDoc(teamRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error adding team member:', error)
    throw new Error('Failed to add team member')
  }
}

// Remove member from team
export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId)
    const teamSnap = await getDoc(teamRef)
    
    if (!teamSnap.exists()) {
      throw new Error('Team not found')
    }

    const teamData = teamSnap.data() as FirestoreTeam
    const updatedMembers = teamData.members.filter(member => member.id !== memberId)

    await updateDoc(teamRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error removing team member:', error)
    throw new Error('Failed to remove team member')
  }
}

// Update member role
export async function updateMemberRole(teamId: string, memberId: string, newRole: TeamMember['role']): Promise<void> {
  try {
    const teamRef = doc(db, 'teams', teamId)
    const teamSnap = await getDoc(teamRef)
    
    if (!teamSnap.exists()) {
      throw new Error('Team not found')
    }

    const teamData = teamSnap.data() as FirestoreTeam
    const updatedMembers = teamData.members.map(member => 
      member.id === memberId ? { ...member, role: newRole } : member
    )

    await updateDoc(teamRef, {
      members: updatedMembers,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating member role:', error)
    throw new Error('Failed to update member role')
  }
}