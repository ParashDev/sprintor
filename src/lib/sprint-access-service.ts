import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  Timestamp,
  query,
  collection,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore'
import { db } from './firebase'
import type { SprintAccess } from '@/types/sprint'
import { hashPassword, verifyPassword } from './sprint-service'

// === UTILITY FUNCTIONS ===

// Helper function to clean data for Firestore (remove undefined fields)
function cleanDataForFirestore(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {}
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value
    }
  })
  return cleaned
}

// === ACCESS TOKEN MANAGEMENT ===

// Generate secure access token
function generateAccessToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Generate participant ID
function generateParticipantId(): string {
  return `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// === SPRINT ACCESS VALIDATION ===

// Validate sprint access with password and team membership
export async function validateSprintAccess(
  sprintId: string, 
  password?: string,
  participantName?: string,
  hostId?: string,  // If provided, check if user is the host
  email?: string    // NEW: Email for team member verification
): Promise<{
  success: boolean
  accessToken?: string
  participantId?: string
  // NEW: Return team member role for proper permission handling
  teamRole?: 'product_owner' | 'scrum_master' | 'business_analyst' | 'developer' | 'tester' | 'stakeholder'
  // DEPRECATED: Keep for backward compatibility
  accessLevel?: 'view' | 'contribute' | 'admin'
  memberName?: string  // NEW: Team member's name
  error?: string
}> {
  try {
    // Get sprint document to check access requirements
    const sprintRef = doc(db, 'sprints', sprintId)
    const sprintSnap = await getDoc(sprintRef)
    
    if (!sprintSnap.exists()) {
      return { success: false, error: 'Sprint not found' }
    }
    
    const sprintData = sprintSnap.data()
    
    // NEW: Team member email verification with role extraction
    let userTeamRole: 'product_owner' | 'scrum_master' | 'business_analyst' | 'developer' | 'tester' | 'stakeholder' | undefined
    let userMemberName: string | undefined
    
    if (email && sprintData.projectId) {
      // Query all teams for this project to check if email exists in any team member
      const teamsQuery = query(
        collection(db, 'teams'),
        where('projectId', '==', sprintData.projectId)
      )
      
      const teamsSnapshot = await getDocs(teamsQuery)
      let isTeamMember = false
      
      // Check if the provided email matches any team member email and capture their role
      teamsSnapshot.forEach((teamDoc) => {
        const teamData = teamDoc.data()
        if (teamData.members && Array.isArray(teamData.members)) {
          const member = teamData.members.find((member: { email?: string; status: string }) => 
            member.email && member.email.toLowerCase() === email.toLowerCase() && 
            member.status === 'active'
          )
          if (member) {
            isTeamMember = true
            userTeamRole = member.role // Capture the team member's role
            userMemberName = member.name // Capture the team member's name
          }
        }
      })
      
      if (!isTeamMember) {
        return { success: false, error: 'Not a team member' }
      }
    } else if (email) {
      // Email provided but sprint has no project ID - deny access
      return { success: false, error: 'Sprint access verification failed' }
    }
    
    // Check if user is the host (creator) - they get admin access automatically
    if (hostId && sprintData.hostId === hostId) {
      const accessToken = generateAccessToken()
      const participantId = generateParticipantId()
      
      // Create access record for host with admin access
      const accessRecord: SprintAccess = {
        sprintId,
        participantId,
        // NEW: Sprint host gets product_owner role by default (can be overridden)
        teamRole: userTeamRole || 'product_owner', // Default to product_owner for host
        accessLevel: 'admin', // DEPRECATED: Keep for backward compatibility
        passwordRequired: false,
        sessionToken: accessToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        grantedAt: new Date(),
        grantedBy: 'host_access',
        memberEmail: email,
        memberName: userMemberName || participantName
      }
      
      await setDoc(doc(db, 'sprintAccess', accessToken), cleanDataForFirestore({
        ...accessRecord,
        grantedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(accessRecord.expiresAt!)
      }))
      
      return {
        success: true,
        accessToken,
        participantId,
        teamRole: accessRecord.teamRole,
        accessLevel: 'admin', // DEPRECATED: Keep for backward compatibility
        memberName: accessRecord.memberName
      }
    }
    
    // Check if sprint allows guest access (no password required)
    if (sprintData.allowGuestAccess) {
      const accessToken = generateAccessToken()
      const participantId = generateParticipantId()
      
      // Create access record for guest
      const accessRecord: SprintAccess = {
        sprintId,
        participantId,
        // NEW: Guests get stakeholder role (view-only)
        teamRole: userTeamRole || 'stakeholder', // Default to stakeholder for guests
        accessLevel: 'view', // DEPRECATED: Keep for backward compatibility
        passwordRequired: false,
        sessionToken: accessToken,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours for guest access
        grantedAt: new Date(),
        grantedBy: 'system',
        memberEmail: email,
        memberName: userMemberName || participantName
      }
      
      await setDoc(doc(db, 'sprintAccess', accessToken), cleanDataForFirestore({
        ...accessRecord,
        grantedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(accessRecord.expiresAt!)
      }))
      
      return {
        success: true,
        accessToken,
        participantId,
        teamRole: accessRecord.teamRole,
        accessLevel: 'view', // DEPRECATED: Keep for backward compatibility
        memberName: accessRecord.memberName
      }
    }
    
    // Password is required for this sprint
    if (!password) {
      return { success: false, error: 'Password required for this sprint' }
    }
    
    // Skip password verification if stored password indicates guest access
    if (sprintData.password === 'guest_access_no_password') {
      const accessToken = generateAccessToken()
      const participantId = generateParticipantId()
      
      // Create access record for guest (fallback case)
      const accessRecord: SprintAccess = {
        sprintId,
        participantId,
        // NEW: Fallback guests get stakeholder role (view-only)
        teamRole: userTeamRole || 'stakeholder', // Default to stakeholder for fallback guests
        accessLevel: 'view', // DEPRECATED: Keep for backward compatibility
        passwordRequired: false,
        sessionToken: accessToken,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        grantedAt: new Date(),
        grantedBy: 'system',
        memberEmail: email,
        memberName: userMemberName || participantName
      }
      
      await setDoc(doc(db, 'sprintAccess', accessToken), cleanDataForFirestore({
        ...accessRecord,
        grantedAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(accessRecord.expiresAt!)
      }))
      
      return {
        success: true,
        accessToken,
        participantId,
        teamRole: accessRecord.teamRole,
        accessLevel: 'view', // DEPRECATED: Keep for backward compatibility
        memberName: accessRecord.memberName
      }
    }
    
    // Verify password
    console.log('Verifying password...', { 
      inputPassword: password, 
      storedHash: sprintData.password?.substring(0, 20) + '...' 
    })
    
    const passwordValid = await verifyPassword(password, sprintData.password)
    console.log('Password verification result:', passwordValid)
    
    if (!passwordValid) {
      return { success: false, error: 'Incorrect password' }
    }
    
    // Password is correct - grant access
    const accessToken = generateAccessToken()
    const participantId = generateParticipantId()
    
    const accessRecord: SprintAccess = {
      sprintId,
      participantId,
      // NEW: Use team member's actual role, default to developer for password auth
      teamRole: userTeamRole || 'developer', // Default to developer for password-authenticated users
      accessLevel: 'contribute', // DEPRECATED: Keep for backward compatibility
      passwordRequired: true,
      sessionToken: accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours for authenticated access
      grantedAt: new Date(),
      grantedBy: 'password_auth',
      memberEmail: email,
      memberName: userMemberName || participantName
    }
    
    await setDoc(doc(db, 'sprintAccess', accessToken), {
      ...accessRecord,
      grantedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(accessRecord.expiresAt!)
    })
    
    return {
      success: true,
      accessToken,
      participantId,
      teamRole: accessRecord.teamRole,
      accessLevel: 'contribute', // DEPRECATED: Keep for backward compatibility  
      memberName: accessRecord.memberName
    }
    
  } catch (error) {
    console.error('Error validating sprint access:', error)
    return { success: false, error: 'Failed to validate access' }
  }
}

// Verify existing access token
export async function verifyAccessToken(accessToken: string): Promise<{
  valid: boolean
  access?: SprintAccess
  error?: string
}> {
  try {
    const accessRef = doc(db, 'sprintAccess', accessToken)
    const accessSnap = await getDoc(accessRef)
    
    if (!accessSnap.exists()) {
      return { valid: false, error: 'Access token not found' }
    }
    
    const data = accessSnap.data()
    const accessRecord: SprintAccess = {
      ...data,
      grantedAt: data.grantedAt.toDate(),
      expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined
    } as SprintAccess
    
    // Check if token is expired
    if (accessRecord.expiresAt && accessRecord.expiresAt < new Date()) {
      // Clean up expired token
      await deleteDoc(accessRef)
      return { valid: false, error: 'Access token expired' }
    }
    
    // Update last seen timestamp
    await updateDoc(accessRef, {
      lastSeen: serverTimestamp()
    })
    
    return {
      valid: true,
      access: accessRecord
    }
    
  } catch (error) {
    console.error('Error verifying access token:', error)
    return { valid: false, error: 'Failed to verify access token' }
  }
}

// Refresh access token (extend expiry)
export async function refreshAccessToken(accessToken: string): Promise<{
  success: boolean
  newExpiresAt?: Date
  error?: string
}> {
  try {
    const verification = await verifyAccessToken(accessToken)
    if (!verification.valid || !verification.access) {
      return { success: false, error: 'Invalid access token' }
    }
    
    // Extend expiry based on access level
    const extensionHours = verification.access.accessLevel === 'view' ? 4 : 12
    const newExpiresAt = new Date(Date.now() + extensionHours * 60 * 60 * 1000)
    
    await updateDoc(doc(db, 'sprintAccess', accessToken), {
      expiresAt: Timestamp.fromDate(newExpiresAt),
      updatedAt: serverTimestamp()
    })
    
    return {
      success: true,
      newExpiresAt
    }
    
  } catch (error) {
    console.error('Error refreshing access token:', error)
    return { success: false, error: 'Failed to refresh access token' }
  }
}

// Revoke access token
export async function revokeAccessToken(accessToken: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'sprintAccess', accessToken))
  } catch (error) {
    console.error('Error revoking access token:', error)
    throw new Error('Failed to revoke access token')
  }
}

// === SPRINT LINK MANAGEMENT ===

// Generate shareable sprint link
export function generateSprintLink(sprintId: string, options?: {
  includePassword?: boolean
  password?: string
  expiresAt?: Date
  accessLevel?: 'view' | 'contribute'
}): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  let link = `${baseUrl}/sprint/${sprintId}`
  
  // Add query parameters if specified
  const params = new URLSearchParams()
  
  if (options?.includePassword && options.password) {
    // For testing/demo purposes - in production, password should never be in URL
    console.warn('Password in URL is not secure - this should only be used for testing')
    params.append('pwd', btoa(options.password))
  }
  
  if (options?.accessLevel) {
    params.append('access', options.accessLevel)
  }
  
  if (options?.expiresAt) {
    params.append('expires', options.expiresAt.getTime().toString())
  }
  
  if (params.toString()) {
    link += `?${params.toString()}`
  }
  
  return link
}

// Parse sprint link and extract information
export function parseSprintLink(url: string): {
  sprintId?: string
  password?: string
  accessLevel?: 'view' | 'contribute'
  expiresAt?: Date
  isValid: boolean
  error?: string
} {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    
    // Check if it's a valid sprint URL pattern
    if (pathParts.length < 3 || pathParts[1] !== 'sprint') {
      return { isValid: false, error: 'Invalid sprint URL format' }
    }
    
    const sprintId = pathParts[2]
    if (!sprintId) {
      return { isValid: false, error: 'Sprint ID not found in URL' }
    }
    
    const params = urlObj.searchParams
    let password: string | undefined
    let accessLevel: 'view' | 'contribute' | undefined
    let expiresAt: Date | undefined
    
    // Extract password (base64 encoded for URL safety)
    if (params.has('pwd')) {
      try {
        password = atob(params.get('pwd')!)
      } catch (error) {
        console.warn('Invalid password encoding in URL')
      }
    }
    
    // Extract access level
    if (params.has('access')) {
      const access = params.get('access')
      if (access === 'view' || access === 'contribute') {
        accessLevel = access
      }
    }
    
    // Extract expiration
    if (params.has('expires')) {
      const expiresTimestamp = parseInt(params.get('expires')!)
      if (!isNaN(expiresTimestamp)) {
        expiresAt = new Date(expiresTimestamp)
        
        // Check if link is expired
        if (expiresAt < new Date()) {
          return { isValid: false, error: 'Sprint link has expired' }
        }
      }
    }
    
    return {
      sprintId,
      password,
      accessLevel,
      expiresAt,
      isValid: true
    }
    
  } catch (error) {
    console.error('Error parsing sprint link:', error)
    return { isValid: false, error: 'Failed to parse sprint link' }
  }
}

// === ACCESS ANALYTICS ===

// Get sprint access statistics
export async function getSprintAccessStats(sprintId: string): Promise<{
  totalAccesses: number
  activeTokens: number
  guestAccesses: number
  authenticatedAccesses: number
  averageSessionDuration: number
  uniqueParticipants: number
}> {
  try {
    const q = query(
      collection(db, 'sprintAccess'),
      where('sprintId', '==', sprintId),
      orderBy('grantedAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const accesses: SprintAccess[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      accesses.push({
        ...data,
        grantedAt: data.grantedAt.toDate(),
        expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined
      } as SprintAccess)
    })
    
    const now = new Date()
    const activeTokens = accesses.filter(access => 
      !access.expiresAt || access.expiresAt > now
    ).length
    
    const guestAccesses = accesses.filter(access => !access.passwordRequired).length
    const authenticatedAccesses = accesses.filter(access => access.passwordRequired).length
    
    const uniqueParticipants = new Set(accesses.map(access => access.participantId)).size
    
    // Calculate average session duration (simplified)
    const averageSessionDuration = 0 // Would need more detailed tracking
    
    return {
      totalAccesses: accesses.length,
      activeTokens,
      guestAccesses,
      authenticatedAccesses,
      averageSessionDuration,
      uniqueParticipants
    }
    
  } catch (error) {
    console.error('Error getting sprint access stats:', error)
    return {
      totalAccesses: 0,
      activeTokens: 0,
      guestAccesses: 0,
      authenticatedAccesses: 0,
      averageSessionDuration: 0,
      uniqueParticipants: 0
    }
  }
}

// === ACCESS CLEANUP ===

// Clean up expired access tokens
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    const now = new Date()
    const q = query(
      collection(db, 'sprintAccess'),
      where('expiresAt', '<', Timestamp.fromDate(now)),
      limit(100) // Process in batches
    )
    
    const querySnapshot = await getDocs(q)
    const deletions = querySnapshot.docs.map(doc => deleteDoc(doc.ref))
    
    await Promise.all(deletions)
    
    console.log(`Cleaned up ${deletions.length} expired access tokens`)
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error)
  }
}

// === HOST PERMISSIONS ===

// Check if user is sprint host
export async function isSprintHost(sprintId: string, userId: string): Promise<boolean> {
  try {
    const sprintRef = doc(db, 'sprints', sprintId)
    const sprintSnap = await getDoc(sprintRef)
    
    if (!sprintSnap.exists()) {
      return false
    }
    
    const sprintData = sprintSnap.data()
    return sprintData.hostId === userId
  } catch (error) {
    console.error('Error checking sprint host:', error)
    return false
  }
}

// Grant elevated access to host
export async function grantHostAccess(sprintId: string, hostId: string): Promise<string> {
  try {
    const accessToken = generateAccessToken()
    
    const accessRecord: SprintAccess = {
      sprintId,
      participantId: hostId,
      accessLevel: 'admin',
      passwordRequired: false,
      sessionToken: accessToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for host
      grantedAt: new Date(),
      grantedBy: 'host_auth'
    }
    
    await setDoc(doc(db, 'sprintAccess', accessToken), {
      ...accessRecord,
      grantedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(accessRecord.expiresAt!)
    })
    
    return accessToken
  } catch (error) {
    console.error('Error granting host access:', error)
    throw new Error('Failed to grant host access')
  }
}