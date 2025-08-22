import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  increment,
  type FieldValue
} from 'firebase/firestore'
import { db } from './firebase'
import type { 
  Sprint, 
  SprintStory, 
  SprintMember, 
  SprintParticipant,
  SprintAccess,
  SprintActivity,
  CreateSprintRequest,
  UpdateSprintRequest,
  JoinSprintRequest,
  FirestoreSprint,
  FirestoreSprintStory,
  SprintMetrics,
  SprintColumn,
  CompleteSprintRequest,
  SprintCompletionResult,
  StoryReversionDetails
} from '@/types/sprint'
import type { Story, SprintAttempt } from '@/types/story'
import { getStoriesByProject, getStory, updateStory } from './story-service'
import { updateEpicStoryCounts } from './epic-service'
// === UTILITY FUNCTIONS ===

// Generate unique IDs
function generateSprintId(): string {
  return `sprint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function generateShareableLink(sprintId: string): string {
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/sprint/${sprintId}`
}

// Simple password storage (for development - in production, use proper hashing)
export async function hashPassword(password: string): Promise<string> {
  // For now, just store the password as-is for simplicity
  // In production, you'd want proper hashing
  return password
}

export async function verifyPassword(password: string, storedPassword: string): Promise<boolean> {
  try {
    console.log('verifyPassword - simple comparison:', { 
      inputPassword: password, 
      storedPassword: storedPassword,
      match: password === storedPassword
    })
    
    // Simple comparison for now
    return password === storedPassword
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}


// Clean object for Firestore (remove undefined values)
function cleanSprintDataForFirestore(data: Record<string, unknown>): Record<string, FieldValue | Partial<unknown> | undefined> {
  const cleanData: Record<string, FieldValue | Partial<unknown> | undefined> = {}
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value as FieldValue | Partial<unknown>
    }
  })
  return cleanData
}

// Convert Firestore Sprint to our Sprint type
function convertFirestoreSprint(doc: FirestoreSprint): Sprint {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt?.toDate() || new Date(),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : doc.updatedAt?.toDate() || new Date(),
    lastActivity: doc.lastActivity instanceof Date ? doc.lastActivity : doc.lastActivity?.toDate() || new Date(),
    startDate: doc.startDate instanceof Date ? doc.startDate : doc.startDate?.toDate() || new Date(),
    endDate: doc.endDate instanceof Date ? doc.endDate : doc.endDate?.toDate() || new Date(),
    stories: doc.stories?.map(convertFirestoreSprintStory) || [],
    burndownData: doc.burndownData?.map(point => ({
      ...point,
      date: point.date instanceof Date ? point.date : point.date?.toDate() || new Date()
    })) || []
  } as Sprint
}

function convertFirestoreSprintStory(doc: FirestoreSprintStory): SprintStory {
  return {
    ...doc,
    addedToSprintAt: doc.addedToSprintAt instanceof Date ? doc.addedToSprintAt : doc.addedToSprintAt?.toDate() || new Date(),
    startedAt: doc.startedAt instanceof Date ? doc.startedAt : doc.startedAt?.toDate() || undefined,
    completedAt: doc.completedAt instanceof Date ? doc.completedAt : doc.completedAt?.toDate() || undefined,
    lastUpdated: doc.lastUpdated instanceof Date ? doc.lastUpdated : doc.lastUpdated?.toDate() || new Date(),
    sprintComments: doc.sprintComments?.map(comment => ({
      ...comment,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt : comment.createdAt?.toDate() || new Date()
    })) || [],
    statusHistory: doc.statusHistory?.map(change => ({
      ...change,
      timestamp: change.timestamp instanceof Date ? change.timestamp : change.timestamp?.toDate() || new Date()
    })) || []
  } as SprintStory
}

// Default sprint columns
const DEFAULT_SPRINT_COLUMNS: SprintColumn[] = [
  { id: 'todo', name: 'To Do', status: 'todo', color: '#64748b', position: 0, isDefaultForStatus: true },
  { id: 'in_progress', name: 'In Progress', status: 'in_progress', color: '#f59e0b', wipLimit: 3, position: 1, isDefaultForStatus: true },
  { id: 'review', name: 'Review', status: 'review', color: '#8b5cf6', position: 2, isDefaultForStatus: true },
  { id: 'testing', name: 'Testing', status: 'testing', color: '#06b6d4', position: 3, isDefaultForStatus: true },
  { id: 'done', name: 'Done', status: 'done', color: '#10b981', position: 4, isDefaultForStatus: true }
]

// === SPRINT CRUD OPERATIONS ===

// Create a new sprint
export async function createSprint(sprintData: CreateSprintRequest): Promise<string> {
  try {
    const sprintId = generateSprintId()
    
    // Debug log for password handling
    console.log('Creating sprint with password:', {
      password: sprintData.password,
      allowGuestAccess: sprintData.allowGuestAccess,
      passwordLength: sprintData.password.length
    })
    
    const hashedPassword = await hashPassword(sprintData.password)
    
    // Fetch the initial stories from the project
    const projectStories = await getStoriesByProject(sprintData.projectId, {
      status: ['sprint_ready']
    })
    
    // Filter stories if epic is specified
    const selectedStories = sprintData.epicId 
      ? projectStories.filter(story => story.epicId === sprintData.epicId)
      : projectStories.filter(story => sprintData.storyIds.includes(story.id))
    
    // Convert project stories to sprint stories
    const sprintStories: SprintStory[] = selectedStories.map(story => ({
      id: `${sprintId}_${story.id}`,
      originalStoryId: story.id,
      title: story.title,
      description: story.description,
      sprintStatus: 'todo',
      columnId: 'todo',
      position: 0,
      storyPoints: story.storyPoints,
      progress: 0,
      blockers: [],
      sprintComments: [],
      statusHistory: [],
      originalData: {
        type: story.type,
        priority: story.priority,
        acceptanceCriteria: story.acceptanceCriteria.map(ac => ac.description),
        labels: story.labels
      },
      addedToSprintAt: new Date(),
      lastUpdated: new Date()
    }))
    
    const totalStoryPoints = sprintStories.reduce((sum, story) => 
      sum + (story.storyPoints || 0), 0
    )
    
    // Create sprint document
    const sprint: Omit<Sprint, 'createdAt' | 'updatedAt' | 'lastActivity'> = {
      id: sprintId,
      name: sprintData.name,
      description: sprintData.description,
      goal: sprintData.goal,
      projectId: sprintData.projectId,
      projectName: '', // Will be populated by frontend
      epicId: sprintData.epicId,
      password: hashedPassword,
      shareableLink: generateShareableLink(sprintId),
      isPublic: false,
      startDate: sprintData.startDate,
      endDate: sprintData.endDate,
      duration: Math.ceil((sprintData.endDate.getTime() - sprintData.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      status: 'draft',
      stories: sprintStories,
      backlogStoryIds: selectedStories.map(s => s.id),
      totalStoryPoints,
      committedStoryPoints: totalStoryPoints,
      columns: DEFAULT_SPRINT_COLUMNS,
      hostId: sprintData.hostId,
      hostName: sprintData.hostName,
      members: [],
      participants: [],
      burndownData: [],
      allowGuestAccess: sprintData.allowGuestAccess,
      autoMoveToNextColumn: false,
      requireEstimation: true
    }
    
    console.log('Sprint before clean:', {
      name: sprint.name,
      description: sprint.description,
      goal: sprint.goal
    })

    const cleanData = cleanSprintDataForFirestore({
      ...sprint,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      // Convert story timestamps for Firestore
      stories: sprintStories.map(story => ({
        ...story,
        addedToSprintAt: Timestamp.fromDate(story.addedToSprintAt),
        lastUpdated: Timestamp.fromDate(story.lastUpdated)
      }))
    })

    console.log('Sprint after clean:', {
      name: cleanData.name,
      description: cleanData.description,
      goal: cleanData.goal
    })
    
    await setDoc(doc(db, 'sprints', sprintId), cleanData)
    
    return sprintId
  } catch (error) {
    console.error('Error creating sprint:', error)
    throw new Error('Failed to create sprint')
  }
}

// Get sprint by ID
export async function getSprint(sprintId: string): Promise<Sprint | null> {
  try {
    const sprintRef = doc(db, 'sprints', sprintId)
    const sprintSnap = await getDoc(sprintRef)
    
    if (!sprintSnap.exists()) {
      return null
    }

    const data = sprintSnap.data() as FirestoreSprint
    return convertFirestoreSprint(data)
  } catch (error) {
    console.error('Error fetching sprint:', error)
    return null
  }
}

// Force server fetch for debugging (bypasses cache completely)
export async function getSprintFromServer(sprintId: string): Promise<Sprint | null> {
  try {
    console.log('Forcing server fetch for sprint:', sprintId)
    const sprintRef = doc(db, 'sprints', sprintId)
    
    // Force server fetch by disabling cache
    const sprintSnap = await getDoc(sprintRef)
    
    if (!sprintSnap.exists()) {
      console.log('Sprint does not exist on server')
      return null
    }

    const data = sprintSnap.data() as FirestoreSprint
    const sprint = convertFirestoreSprint(data)
    console.log('Server fetch result:', sprint.stories.map(s => ({ id: s.id, columnId: s.columnId, status: s.sprintStatus })))
    return sprint
  } catch (error) {
    console.error('Error fetching sprint from server:', error)
    return null
  }
}

// Get sprints by project
export async function getSprintsByProject(projectId: string, limitCount: number = 20): Promise<Sprint[]> {
  try {
    const q = query(
      collection(db, 'sprints'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const sprints: Sprint[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreSprint
      sprints.push(convertFirestoreSprint(data))
    })
    
    return sprints
  } catch (error) {
    console.error('Error fetching sprints by project:', error)
    return []
  }
}

// Update sprint
export async function updateSprint(sprintId: string, updates: UpdateSprintRequest): Promise<void> {
  try {
    const sprintRef = doc(db, 'sprints', sprintId)
    
    // If updating story positions/status, handle the complex update
    if (updates.storyUpdates) {
      const sprint = await getSprint(sprintId)
      if (!sprint) throw new Error('Sprint not found')
      
      const updatedStories = sprint.stories.map(story => {
        const update = updates.storyUpdates?.find(u => u.id === story.id)
        if (update) {
          const updatedStory = { ...story, ...update, lastUpdated: new Date() }
          
          // Add status change to history if status changed
          if (update.sprintStatus && update.sprintStatus !== story.sprintStatus) {
            updatedStory.statusHistory.push({
              id: Math.random().toString(36).substring(2, 9),
              fromStatus: story.sprintStatus,
              toStatus: update.sprintStatus,
              changedBy: '', // Will be set by frontend
              changedByName: '', // Will be set by frontend
              timestamp: new Date(),
              reason: 'Manual update'
            })
          }
          
          return updatedStory
        }
        return story
      })
      
      const cleanUpdates = cleanSprintDataForFirestore({
        stories: updatedStories.map(story => ({
          ...story,
          addedToSprintAt: Timestamp.fromDate(story.addedToSprintAt),
          startedAt: story.startedAt ? Timestamp.fromDate(story.startedAt) : null,
          completedAt: story.completedAt ? Timestamp.fromDate(story.completedAt) : null,
          lastUpdated: Timestamp.fromDate(story.lastUpdated),
          sprintComments: story.sprintComments.map(comment => ({
            ...comment,
            createdAt: Timestamp.fromDate(comment.createdAt)
          })),
          statusHistory: story.statusHistory.map(change => ({
            ...change,
            timestamp: Timestamp.fromDate(change.timestamp)
          }))
        })),
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      await updateDoc(sprintRef, cleanUpdates)
    } else {
      // Simple field updates
      const cleanUpdates = cleanSprintDataForFirestore({
        ...updates,
        lastActivity: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      await updateDoc(sprintRef, cleanUpdates)
    }
  } catch (error) {
    console.error('Error updating sprint:', error)
    throw new Error('Failed to update sprint')
  }
}

// Delete sprint
export async function deleteSprint(sprintId: string): Promise<void> {
  try {
    const batch = writeBatch(db)
    
    // Delete sprint document
    const sprintRef = doc(db, 'sprints', sprintId)
    batch.delete(sprintRef)
    
    // Delete associated access records
    const accessQuery = query(
      collection(db, 'sprintAccess'),
      where('sprintId', '==', sprintId)
    )
    const accessSnapshot = await getDocs(accessQuery)
    accessSnapshot.docs.forEach(accessDoc => {
      batch.delete(accessDoc.ref)
    })
    
    // Delete associated activities
    const activityQuery = query(
      collection(db, 'sprintActivities'),
      where('sprintId', '==', sprintId)
    )
    const activitySnapshot = await getDocs(activityQuery)
    activitySnapshot.docs.forEach(activityDoc => {
      batch.delete(activityDoc.ref)
    })
    
    await batch.commit()
  } catch (error) {
    console.error('Error deleting sprint:', error)
    throw new Error('Failed to delete sprint')
  }
}

// === SPRINT ACCESS CONTROL ===

// Verify sprint password and grant access
export async function joinSprint(request: JoinSprintRequest): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const sprint = await getSprint(request.sprintId)
    if (!sprint) {
      return { success: false, error: 'Sprint not found' }
    }
    
    // Check if password is required
    if (!sprint.allowGuestAccess && request.password) {
      const passwordValid = await verifyPassword(request.password, sprint.password)
      if (!passwordValid) {
        return { success: false, error: 'Invalid password' }
      }
    }
    
    // Generate access token
    const accessToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    // Store access record
    const accessRecord: SprintAccess = {
      sprintId: request.sprintId,
      participantId: Math.random().toString(36).substring(2, 9),
      accessLevel: request.role === 'contributor' ? 'contribute' : 'view',
      passwordRequired: !sprint.allowGuestAccess,
      sessionToken: accessToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      grantedAt: new Date(),
      grantedBy: 'system'
    }
    
    await setDoc(doc(db, 'sprintAccess', accessToken), {
      ...accessRecord,
      grantedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(accessRecord.expiresAt!)
    })
    
    return { success: true, accessToken }
  } catch (error) {
    console.error('Error joining sprint:', error)
    return { success: false, error: 'Failed to join sprint' }
  }
}

// Verify access token
export async function verifySprintAccess(accessToken: string): Promise<SprintAccess | null> {
  try {
    const accessRef = doc(db, 'sprintAccess', accessToken)
    const accessSnap = await getDoc(accessRef)
    
    if (!accessSnap.exists()) {
      return null
    }
    
    const data = accessSnap.data()
    const accessRecord: SprintAccess = {
      ...data,
      grantedAt: data.grantedAt.toDate(),
      expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined
    } as SprintAccess
    
    // Check if token is expired
    if (accessRecord.expiresAt && accessRecord.expiresAt < new Date()) {
      return null
    }
    
    return accessRecord
  } catch (error) {
    console.error('Error verifying sprint access:', error)
    return null
  }
}

// === REAL-TIME SUBSCRIPTIONS ===

// Subscribe to sprint updates
export function subscribeToSprint(sprintId: string, callback: (sprint: Sprint | null) => void): () => void {
  const sprintRef = doc(db, 'sprints', sprintId)
  
  return onSnapshot(sprintRef, (doc) => {
    if (!doc.exists()) {
      callback(null)
      return
    }

    try {
      const data = doc.data() as FirestoreSprint
      const sprint = convertFirestoreSprint(data)
      callback(sprint)
    } catch (error) {
      console.error('Error processing sprint data:', error)
      callback(null)
    }
  }, (error) => {
    console.error('Firestore subscription error:', error)
    callback(null)
  })
}

// Subscribe to sprint activities (for real-time collaboration)
export function subscribeToSprintActivities(sprintId: string, callback: (activities: SprintActivity[]) => void): () => void {
  const q = query(
    collection(db, 'sprintActivities'),
    where('sprintId', '==', sprintId),
    orderBy('timestamp', 'desc'),
    limit(50)
  )
  
  return onSnapshot(q, (snapshot) => {
    const activities: SprintActivity[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data()
      activities.push({
        ...data,
        timestamp: data.timestamp.toDate()
      } as SprintActivity)
    })
    
    callback(activities)
  }, (error) => {
    console.error('Error in sprint activities subscription:', error)
    callback([])
  })
}

// === SPRINT STORY OPERATIONS ===

// Add story to sprint
export async function addStoryToSprint(sprintId: string, storyId: string): Promise<void> {
  try {
    const sprint = await getSprint(sprintId)
    if (!sprint) throw new Error('Sprint not found')
    
    // Fetch the project story
    const projectStories = await getStoriesByProject(sprint.projectId, {
      status: ['sprint_ready']
    })
    const projectStory = projectStories.find(s => s.id === storyId)
    if (!projectStory) throw new Error('Story not found or not ready for sprint')
    
    // Convert to sprint story
    // Find the "todo" column ID
    const todoColumn = sprint.columns.find(col => col.status === 'todo')
    const todoColumnId = todoColumn?.id || sprint.columns[0]?.id || 'todo'
    
    const sprintStory: SprintStory = {
      id: `${sprintId}_${storyId}`,
      originalStoryId: storyId,
      title: projectStory.title,
      description: projectStory.description,
      sprintStatus: 'todo',
      columnId: todoColumnId,
      position: sprint.stories.filter(s => s.columnId === todoColumnId).length,
      storyPoints: projectStory.storyPoints,
      progress: 0,
      blockers: [],
      sprintComments: [],
      statusHistory: [],
      originalData: {
        type: projectStory.type,
        priority: projectStory.priority,
        acceptanceCriteria: projectStory.acceptanceCriteria.map(ac => ac.description),
        labels: projectStory.labels
      },
      addedToSprintAt: new Date(),
      lastUpdated: new Date()
    }
    
    const updatedStories = [...sprint.stories, sprintStory]
    const updatedBacklogIds = [...sprint.backlogStoryIds, storyId]
    const updatedTotalPoints = sprint.totalStoryPoints + (sprintStory.storyPoints || 0)
    
    // Convert stories for Firestore
    const firestoreStories = updatedStories.map(story => ({
      ...story,
      addedToSprintAt: Timestamp.fromDate(story.addedToSprintAt),
      startedAt: story.startedAt ? Timestamp.fromDate(story.startedAt) : null,
      completedAt: story.completedAt ? Timestamp.fromDate(story.completedAt) : null,
      lastUpdated: Timestamp.fromDate(story.lastUpdated),
      sprintComments: story.sprintComments.map(comment => ({
        ...comment,
        createdAt: Timestamp.fromDate(comment.createdAt)
      })),
      statusHistory: story.statusHistory.map(change => ({
        ...change,
        timestamp: Timestamp.fromDate(change.timestamp)
      })),
      blockers: story.blockers.map(blocker => ({
        ...blocker,
        createdAt: Timestamp.fromDate(blocker.createdAt),
        resolvedAt: blocker.resolvedAt ? Timestamp.fromDate(blocker.resolvedAt) : null
      }))
    }))
    
    // Update sprint document directly
    await updateDoc(doc(db, 'sprints', sprintId), {
      stories: firestoreStories,
      backlogStoryIds: updatedBacklogIds,
      totalStoryPoints: updatedTotalPoints,
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error adding story to sprint:', error)
    throw new Error('Failed to add story to sprint')
  }
}

// Remove story from sprint
export async function removeStoryFromSprint(sprintId: string, storyId: string): Promise<void> {
  try {
    const sprint = await getSprint(sprintId)
    if (!sprint) throw new Error('Sprint not found')
    
    const storyToRemove = sprint.stories.find(s => s.id === storyId)
    if (!storyToRemove) throw new Error('Story not found in sprint')
    
    const updatedStories = sprint.stories.filter(s => s.id !== storyId)
    const updatedBacklogIds = sprint.backlogStoryIds.filter(id => id !== storyToRemove.originalStoryId)
    const updatedTotalPoints = sprint.totalStoryPoints - (storyToRemove.storyPoints || 0)
    
    await updateDoc(doc(db, 'sprints', sprintId), {
      stories: updatedStories.map(story => ({
        ...story,
        addedToSprintAt: Timestamp.fromDate(story.addedToSprintAt),
        startedAt: story.startedAt ? Timestamp.fromDate(story.startedAt) : null,
        completedAt: story.completedAt ? Timestamp.fromDate(story.completedAt) : null,
        lastUpdated: Timestamp.fromDate(story.lastUpdated),
        sprintComments: story.sprintComments.map(comment => ({
          ...comment,
          createdAt: Timestamp.fromDate(comment.createdAt)
        })),
        statusHistory: story.statusHistory.map(change => ({
          ...change,
          timestamp: Timestamp.fromDate(change.timestamp)
        }))
      })),
      backlogStoryIds: updatedBacklogIds,
      totalStoryPoints: updatedTotalPoints,
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error removing story from sprint:', error)
    throw new Error('Failed to remove story from sprint')
  }
}

// === SPRINT METRICS ===

// Calculate sprint metrics (called when sprint ends)
export async function calculateSprintMetrics(sprintId: string): Promise<SprintMetrics> {
  try {
    const sprint = await getSprint(sprintId)
    if (!sprint) throw new Error('Sprint not found')
    
    const completedStories = sprint.stories.filter(s => s.sprintStatus === 'done')
    const totalStories = sprint.stories.length
    
    const completedPoints = completedStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
    const carryOverPoints = sprint.totalStoryPoints - completedPoints
    
    // Calculate cycle times
    const cycleTimesMs = completedStories
      .filter(story => story.startedAt && story.completedAt)
      .map(story => story.completedAt!.getTime() - story.startedAt!.getTime())
    
    const averageCycleTime = cycleTimesMs.length > 0 
      ? cycleTimesMs.reduce((sum, time) => sum + time, 0) / cycleTimesMs.length / (1000 * 60 * 60) // Convert to hours
      : 0
    
    // Calculate other metrics
    const sprintDurationMs = sprint.endDate.getTime() - sprint.startDate.getTime()
    const sprintDurationDays = sprintDurationMs / (1000 * 60 * 60 * 24)
    const throughput = completedStories.length / sprintDurationDays
    
    const metrics: SprintMetrics = {
      plannedPoints: sprint.committedStoryPoints,
      completedPoints,
      carryOverPoints,
      velocityAchieved: completedPoints,
      completionRate: totalStories > 0 ? (completedStories.length / totalStories) * 100 : 0,
      averageCycleTime,
      averageLeadTime: averageCycleTime, // Simplified - could be more complex
      timeToFirstMove: 0, // Would require more detailed tracking
      teamUtilization: 80, // Placeholder - would require capacity tracking
      collaborationScore: 0, // Based on comments, would need calculation
      defectRate: 0, // Would require bug tracking
      reworkRate: 0, // Would require status change analysis
      blockerImpact: 0, // Would require blocker time tracking
      throughput,
      wipEfficiency: 85, // Placeholder - would need WIP limit analysis
      flowPredictability: 0, // Would require historical comparison
      scopeChange: 0, // Would require scope change tracking
      sprintGoalAchievement: completedPoints >= sprint.committedStoryPoints * 0.8 ? 100 : 80
    }
    
    return metrics
  } catch (error) {
    console.error('Error calculating sprint metrics:', error)
    throw new Error('Failed to calculate sprint metrics')
  }
}

// === PARTICIPANT MANAGEMENT ===

// Add participant to sprint
export async function addSprintParticipant(sprintId: string, participant: Omit<SprintParticipant, 'joinedAt' | 'lastSeen'>): Promise<void> {
  try {
    const sprint = await getSprint(sprintId)
    if (!sprint) throw new Error('Sprint not found')
    
    const newParticipant: SprintParticipant = {
      ...participant,
      joinedAt: new Date(),
      lastSeen: new Date()
    }
    
    const updatedParticipants = [...sprint.participants, newParticipant]
    
    await updateDoc(doc(db, 'sprints', sprintId), {
      participants: updatedParticipants.map(p => ({
        ...p,
        joinedAt: Timestamp.fromDate(p.joinedAt),
        lastSeen: Timestamp.fromDate(p.lastSeen)
      })),
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error adding sprint participant:', error)
    throw new Error('Failed to add participant')
  }
}

// Remove participant from sprint
export async function removeSprintParticipant(sprintId: string, participantId: string): Promise<void> {
  try {
    const sprint = await getSprint(sprintId)
    if (!sprint) throw new Error('Sprint not found')
    
    const updatedParticipants = sprint.participants.filter(p => p.id !== participantId)
    
    await updateDoc(doc(db, 'sprints', sprintId), {
      participants: updatedParticipants.map(p => ({
        ...p,
        joinedAt: Timestamp.fromDate(p.joinedAt),
        lastSeen: Timestamp.fromDate(p.lastSeen)
      })),
      lastActivity: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error removing sprint participant:', error)
    throw new Error('Failed to remove participant')
  }
}

// === SPRINT COMPLETION ===

// Helper to convert SprintAttempt for Firestore (convert dates to Timestamps)
function convertSprintAttemptForFirestore(attempt: SprintAttempt): any {
  const converted: any = {
    ...attempt,
    sprintStartDate: Timestamp.fromDate(new Date(attempt.sprintStartDate)),
    sprintEndDate: Timestamp.fromDate(new Date(attempt.sprintEndDate)),
    attemptedAt: Timestamp.fromDate(new Date(attempt.attemptedAt)),
    lastUpdatedAt: Timestamp.fromDate(new Date(attempt.lastUpdatedAt))
  }
  
  // Convert dates in nested arrays
  if (attempt.stagesCompleted) {
    converted.stagesCompleted = attempt.stagesCompleted.map((stage: any) => ({
      ...stage,
      enteredAt: Timestamp.fromDate(new Date(stage.enteredAt)),
      exitedAt: stage.exitedAt ? Timestamp.fromDate(new Date(stage.exitedAt)) : null
    }))
  }
  
  if (attempt.assignments) {
    converted.assignments = attempt.assignments.map((assignment: any) => ({
      ...assignment,
      assignedAt: Timestamp.fromDate(new Date(assignment.assignedAt)),
      unassignedAt: assignment.unassignedAt ? Timestamp.fromDate(new Date(assignment.unassignedAt)) : null
    }))
  }
  
  if (attempt.blockersEncountered) {
    converted.blockersEncountered = attempt.blockersEncountered.map((blocker: any) => ({
      ...blocker,
      reportedAt: Timestamp.fromDate(new Date(blocker.reportedAt)),
      resolvedAt: blocker.resolvedAt ? Timestamp.fromDate(new Date(blocker.resolvedAt)) : null
    }))
  }
  
  if (attempt.scopeChanges) {
    converted.scopeChanges = attempt.scopeChanges.map((change: any) => ({
      ...change,
      changedAt: Timestamp.fromDate(new Date(change.changedAt))
    }))
  }
  
  if (attempt.completedAt) {
    converted.completedAt = Timestamp.fromDate(new Date(attempt.completedAt))
  }
  
  // Remove undefined values
  Object.keys(converted).forEach(key => {
    if (converted[key] === undefined) {
      delete converted[key]
    }
  })
  
  return converted
}

// Complete a sprint and handle story reversion
export async function completeSprint(request: CompleteSprintRequest): Promise<SprintCompletionResult> {
  try {
    const sprint = await getSprint(request.sprintId)
    if (!sprint) throw new Error('Sprint not found')
    
    if (sprint.status === 'completed' || sprint.status === 'cancelled') {
      throw new Error('Sprint is already completed or cancelled')
    }
    
    // Calculate sprint metrics before completion
    const metrics = await calculateSprintMetrics(request.sprintId)
    
    // Categorize stories
    const completedStories: SprintStory[] = []
    const incompleteStories: SprintStory[] = []
    
    sprint.stories.forEach(story => {
      if (story.sprintStatus === 'done') {
        completedStories.push(story)
      } else {
        incompleteStories.push(story)
      }
    })
    
    // Track epic impacts
    const epicImpacts = new Map<string, { storiesReturned: number, progressImpact: number }>()
    const revertedStoryIds: string[] = []
    
    // Start a batch operation for atomic updates
    const batch = writeBatch(db)
    
    // Process incomplete stories - revert to backlog with history
    for (const sprintStory of incompleteStories) {
      const projectStory = await getStory(sprintStory.originalStoryId)
      if (!projectStory) continue
      
      // Create sprint attempt record
      const sprintAttempt: SprintAttempt = {
        // Sprint Context
        sprintId: sprint.id,
        sprintName: sprint.name,
        sprintGoal: sprint.goal,
        sprintStartDate: sprint.startDate,
        sprintEndDate: sprint.endDate,
        sprintDuration: sprint.duration,
        
        // Estimation Context
        originalStoryPoints: sprintStory.storyPoints,
        estimationConfidence: 'Medium',
        
        // Progress Tracking
        statusReached: sprintStory.sprintStatus,
        progressPercentage: sprintStory.progress,
        stagesCompleted: sprintStory.statusHistory.map(sh => ({
          stage: sh.toStatus as 'todo' | 'in_progress' | 'review' | 'testing' | 'done',
          enteredAt: sh.timestamp,
          exitedAt: sh.timestamp,
          timeSpent: 0 // Would need more tracking for accurate time
        })),
        
        // Assignment History
        assignments: sprintStory.assignedTo ? [{
          assignedTo: sprintStory.assignedTo,
          assignedToName: sprintStory.assignedToName || '',
          assignedAt: sprintStory.startedAt || sprintStory.addedToSprintAt,
          unassignedAt: undefined,
          reason: 'Sprint ended'
        }] : [],
        
        // Completion Details
        completionStatus: 'incomplete',
        completionReason: request.completionReason === 'manual' ? 'sprint_ended' : 'sprint_ended',
        incompleteReason: `Sprint ${request.completionReason === 'expired' ? 'expired' : 'ended manually'}`,
        
        // Blockers
        blockersEncountered: sprintStory.blockers.map(b => ({
          description: b.description,
          type: b.type,
          severity: b.severity,
          reportedAt: b.createdAt,
          resolvedAt: b.resolvedAt,
          impactHours: undefined,
          resolution: b.resolvedAt ? 'Resolved' : undefined
        })),
        
        // Scope Changes
        scopeChanges: [],
        
        // Learning & Insights - Use story-specific notes if available, fall back to global notes
        retrospectiveNotes: request.storyNotes?.[sprintStory.originalStoryId] || request.retrospectiveNotes,
        lessonsLearned: request.lessonsLearned,
        
        // Metrics
        cycleTime: sprintStory.completedAt && sprintStory.startedAt 
          ? (sprintStory.completedAt.getTime() - sprintStory.startedAt.getTime()) / (1000 * 60 * 60)
          : undefined,
        leadTime: sprintStory.completedAt 
          ? (sprintStory.completedAt.getTime() - sprintStory.addedToSprintAt.getTime()) / (1000 * 60 * 60)
          : undefined,
        reworkCount: 0,
        
        // Metadata
        attemptNumber: (projectStory.sprintAttempts?.length || 0) + 1,
        attemptedAt: sprintStory.addedToSprintAt,
        lastUpdatedAt: new Date()
      }
      
      // Convert sprint attempt for Firestore
      const firestoreSprintAttempt = convertSprintAttemptForFirestore(sprintAttempt)
      
      // Update story in batch: revert status to backlog and add sprint attempt
      const storyRef = doc(db, 'stories', sprintStory.originalStoryId)
      batch.update(storyRef, {
        status: 'backlog',
        sprintAttempts: [...(projectStory.sprintAttempts || []), firestoreSprintAttempt],
        updatedAt: serverTimestamp()
      })
      
      revertedStoryIds.push(sprintStory.originalStoryId)
      
      // Track epic impact
      if (projectStory.epicId) {
        const current = epicImpacts.get(projectStory.epicId) || { storiesReturned: 0, progressImpact: 0 }
        current.storiesReturned++
        epicImpacts.set(projectStory.epicId, current)
      }
    }
    
    // Process completed stories - add successful sprint attempt
    for (const sprintStory of completedStories) {
      const projectStory = await getStory(sprintStory.originalStoryId)
      if (!projectStory) continue
      
      // Create successful sprint attempt record
      const sprintAttempt: SprintAttempt = {
        // Sprint Context
        sprintId: sprint.id,
        sprintName: sprint.name,
        sprintGoal: sprint.goal,
        sprintStartDate: sprint.startDate,
        sprintEndDate: sprint.endDate,
        sprintDuration: sprint.duration,
        
        // Estimation Context
        originalStoryPoints: sprintStory.storyPoints,
        estimationConfidence: 'High',
        
        // Progress Tracking
        statusReached: 'done',
        progressPercentage: 100,
        stagesCompleted: sprintStory.statusHistory.map(sh => ({
          stage: sh.toStatus as 'todo' | 'in_progress' | 'review' | 'testing' | 'done',
          enteredAt: sh.timestamp,
          exitedAt: sh.timestamp,
          timeSpent: 0
        })),
        
        // Assignment History
        assignments: sprintStory.assignedTo ? [{
          assignedTo: sprintStory.assignedTo,
          assignedToName: sprintStory.assignedToName || '',
          assignedAt: sprintStory.startedAt || sprintStory.addedToSprintAt,
          unassignedAt: sprintStory.completedAt,
          reason: 'Completed'
        }] : [],
        
        // Completion Details
        completionStatus: 'completed',
        completionReason: 'done',
        completedAt: sprintStory.completedAt,
        
        // Blockers
        blockersEncountered: sprintStory.blockers.map(b => ({
          description: b.description,
          type: b.type,
          severity: b.severity,
          reportedAt: b.createdAt,
          resolvedAt: b.resolvedAt,
          impactHours: undefined,
          resolution: b.resolvedAt ? 'Resolved' : undefined
        })),
        
        // Scope Changes
        scopeChanges: [],
        
        // Learning & Insights - Use story-specific notes if available, fall back to global notes
        retrospectiveNotes: request.storyNotes?.[sprintStory.originalStoryId] || request.retrospectiveNotes,
        lessonsLearned: request.lessonsLearned,
        
        // Metrics
        cycleTime: sprintStory.completedAt && sprintStory.startedAt 
          ? (sprintStory.completedAt.getTime() - sprintStory.startedAt.getTime()) / (1000 * 60 * 60)
          : undefined,
        leadTime: sprintStory.completedAt 
          ? (sprintStory.completedAt.getTime() - sprintStory.addedToSprintAt.getTime()) / (1000 * 60 * 60)
          : undefined,
        reworkCount: 0,
        
        // Metadata
        attemptNumber: (projectStory.sprintAttempts?.length || 0) + 1,
        attemptedAt: sprintStory.addedToSprintAt,
        lastUpdatedAt: new Date()
      }
      
      // Convert sprint attempt for Firestore
      const firestoreSprintAttempt = convertSprintAttemptForFirestore(sprintAttempt)
      
      // Update story in batch: move to completed status and add sprint attempt
      const storyRef = doc(db, 'stories', sprintStory.originalStoryId)
      batch.update(storyRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        sprintAttempts: [...(projectStory.sprintAttempts || []), firestoreSprintAttempt],
        updatedAt: serverTimestamp()
      })
    }
    
    // Update sprint status to completed
    const sprintRef = doc(db, 'sprints', request.sprintId)
    batch.update(sprintRef, {
      status: 'completed',
      metrics: metrics,
      updatedAt: serverTimestamp()
    })
    
    // Commit all changes atomically
    await batch.commit()
    
    // Update epic counts for affected epics
    for (const epicId of epicImpacts.keys()) {
      await updateEpicStoryCounts(epicId)
    }
    
    // Prepare result
    const result: SprintCompletionResult = {
      completedStoryIds: completedStories.map(s => s.originalStoryId),
      incompleteStoryIds: incompleteStories.map(s => s.originalStoryId),
      revertedToBacklogIds: revertedStoryIds,
      metrics: metrics,
      epicImpacts: Array.from(epicImpacts.entries()).map(([epicId, impact]) => ({
        epicId,
        storiesReturned: impact.storiesReturned,
        progressImpact: impact.progressImpact
      })),
      nextActions: [
        ...(incompleteStories.length > 0 ? [`${incompleteStories.length} stories returned to backlog for re-grooming`] : []),
        ...(request.nextSprintRecommendations || [])
      ]
    }
    
    return result
  } catch (error) {
    console.error('Error completing sprint:', error)
    throw new Error('Failed to complete sprint')
  }
}