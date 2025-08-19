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
  getDocs
} from 'firebase/firestore'
import { db } from './firebase'
import type { Epic, EpicStats } from '@/types/epic'

// Firestore document types for proper timestamp handling
interface FirestoreEpic extends Omit<Epic, 'createdAt' | 'updatedAt' | 'targetDate' | 'acceptanceCriteria'> {
  createdAt: Timestamp | { toDate(): Date }
  updatedAt: Timestamp | { toDate(): Date }
  targetDate?: Timestamp | { toDate(): Date } | null
  acceptanceCriteria?: string[] // Optional for backwards compatibility
}

// Helper function to convert Firestore epic to our Epic type
function convertFirestoreEpic(doc: FirestoreEpic): Epic {
  return {
    ...doc,
    // Ensure acceptanceCriteria exists with default if missing
    acceptanceCriteria: doc.acceptanceCriteria || [],
    createdAt: doc.createdAt instanceof Timestamp 
      ? doc.createdAt.toDate() 
      : (doc.createdAt && typeof doc.createdAt.toDate === 'function' ? doc.createdAt.toDate() : new Date()),
    updatedAt: doc.updatedAt instanceof Timestamp 
      ? doc.updatedAt.toDate() 
      : (doc.updatedAt && typeof doc.updatedAt.toDate === 'function' ? doc.updatedAt.toDate() : new Date()),
    targetDate: doc.targetDate 
      ? (doc.targetDate instanceof Timestamp 
        ? doc.targetDate.toDate() 
        : (typeof doc.targetDate.toDate === 'function' ? doc.targetDate.toDate() : undefined))
      : undefined,
  } as Epic
}

// Create a new epic
export async function createEpic(epicData: Omit<Epic, 'id' | 'createdAt' | 'updatedAt' | 'storyCount' | 'completedStoryCount'>): Promise<string> {
  try {
    const epicId = `epic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await setDoc(doc(db, 'epics', epicId), {
      id: epicId,
      ...epicData,
      storyCount: 0,
      completedStoryCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return epicId
  } catch (error) {
    console.error('Error creating epic:', error)
    throw new Error('Failed to create epic')
  }
}

// Get all epics for a project
export async function getEpicsByProject(projectId: string): Promise<Epic[]> {
  try {
    const q = query(
      collection(db, 'epics'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const epics: Epic[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreEpic
      epics.push(convertFirestoreEpic(data))
    })
    
    return epics
  } catch (error) {
    console.error('Error fetching epics:', error)
    // If the error is due to missing index, try without order field
    try {
      const q = query(
        collection(db, 'epics'),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc')
      )
      
      const querySnapshot = await getDocs(q)
      const epics: Epic[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreEpic
        epics.push(convertFirestoreEpic(data))
      })
      
      return epics
    } catch (fallbackError) {
      console.error('Error fetching epics (fallback):', fallbackError)
      return []
    }
  }
}

// Get a single epic by ID
export async function getEpic(epicId: string): Promise<Epic | null> {
  try {
    const docRef = doc(db, 'epics', epicId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreEpic
      return convertFirestoreEpic(data)
    }
    return null
  } catch (error) {
    console.error('Error fetching epic:', error)
    return null
  }
}

// Update an epic
export async function updateEpic(epicId: string, updates: Partial<Omit<Epic, 'id' | 'createdAt' | 'projectId' | 'ownerId'>>): Promise<void> {
  try {
    const epicRef = doc(db, 'epics', epicId)
    
    // Filter out undefined values
    const cleanUpdates: Record<string, unknown> = {}
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanUpdates[key] = value
      }
    })
    
    await updateDoc(epicRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating epic:', error)
    throw new Error('Failed to update epic')
  }
}

// Delete an epic
export async function deleteEpic(epicId: string): Promise<void> {
  try {
    const epicRef = doc(db, 'epics', epicId)
    await deleteDoc(epicRef)
  } catch (error) {
    console.error('Error deleting epic:', error)
    throw new Error('Failed to delete epic')
  }
}

// Subscribe to epic changes for real-time updates
export function subscribeToProjectEpics(projectId: string, callback: (epics: Epic[]) => void): () => void {
  try {
    const q = query(
      collection(db, 'epics'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    )
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const epics: Epic[] = []
        
        snapshot.forEach((doc) => {
          try {
            const data = doc.data() as FirestoreEpic
            const convertedEpic = convertFirestoreEpic(data)
            epics.push(convertedEpic)
          } catch (docError) {
            console.warn('Error converting epic document:', doc.id, docError)
            // Skip this document but continue processing others
          }
        })
        
        // Sort by order if available, then by creation date
        epics.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return a.order - b.order
          }
          return b.createdAt.getTime() - a.createdAt.getTime()
        })
        
        callback(epics)
      } catch (error) {
        console.error('Error processing epics snapshot:', error)
        callback([])
      }
    }, (error) => {
      console.error('Error in epics subscription:', error)
      callback([])
    })
    
    return unsubscribe
  } catch (error) {
    console.error('Error setting up epics subscription:', error)
    return () => {}
  }
}

// Get epic statistics (public wrapper for the internal function)
export async function getEpicStats(epicId: string): Promise<EpicStats> {
  try {
    const epic = await getEpic(epicId)
    if (!epic) {
      throw new Error('Epic not found')
    }
    
    return await getEpicStatsFromStories(epicId, epic.projectId)
  } catch (error) {
    console.error('Error fetching epic stats:', error)
    return {
      totalStories: 0,
      completedStories: 0,
      inProgressStories: 0,
      backlogStories: 0,
      completionPercentage: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      averageStoryPoints: 0
    }
  }
}

// Determine epic status based on story statuses
function determineEpicStatus(
  totalStories: number,
  backlogStories: number,
  inProgressStories: number,
  completedStories: number
): 'planning' | 'active' | 'completed' {
  // If no stories, it's in planning
  if (totalStories === 0) {
    return 'planning'
  }
  
  // If epic has only backlog stories, it's in planning
  if (backlogStories === totalStories) {
    return 'planning'
  }
  
  // Any epic with stories in planning or sprint_ready is active
  // (We don't have sprint cycles yet, so sprint_ready stories are still "active work")
  if (inProgressStories > 0 || completedStories > 0) {
    return 'active'
  }
  
  // Default fallback to planning
  return 'planning'
}

// Get epic statistics using story service to avoid permission issues
async function getEpicStatsFromStories(epicId: string, projectId: string): Promise<EpicStats> {
  try {
    // Import story service dynamically to avoid circular imports
    const { getStoriesByProject } = await import('./story-service')
    
    // Get all stories for this epic
    const stories = await getStoriesByProject(projectId, {
      epicId: epicId
    })
    
    let totalStories = 0
    let completedStories = 0
    let inProgressStories = 0
    let backlogStories = 0
    let totalStoryPoints = 0
    let completedStoryPoints = 0
    
    stories.forEach((story) => {
      totalStories++
      
      switch (story.status) {
        case 'sprint_ready':
          completedStories++
          if (story.storyPoints) {
            completedStoryPoints += story.storyPoints
          }
          break
        case 'planning':
          inProgressStories++
          break
        case 'backlog':
          backlogStories++
          break
      }
      
      if (story.storyPoints) {
        totalStoryPoints += story.storyPoints
      }
    })
    
    return {
      totalStories,
      completedStories,
      inProgressStories,
      backlogStories,
      completionPercentage: totalStories > 0 ? (completedStories / totalStories) * 100 : 0,
      totalStoryPoints,
      completedStoryPoints,
      averageStoryPoints: totalStories > 0 ? totalStoryPoints / totalStories : 0
    }
  } catch (error) {
    console.error('Error fetching epic stats from stories:', error)
    return {
      totalStories: 0,
      completedStories: 0,
      inProgressStories: 0,
      backlogStories: 0,
      completionPercentage: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      averageStoryPoints: 0
    }
  }
}

export async function updateEpicStoryCounts(epicId: string): Promise<void> {
  try {
    // Get the epic to find its project
    const epic = await getEpic(epicId)
    if (!epic) {
      console.error('Epic not found:', epicId)
      return
    }
    
    const stats = await getEpicStatsFromStories(epicId, epic.projectId)
    
    // Determine automatic status based on story statuses
    const autoStatus = determineEpicStatus(
      stats.totalStories,
      stats.backlogStories,
      stats.inProgressStories,
      stats.completedStories
    )
    
    await updateEpic(epicId, {
      storyCount: stats.totalStories,
      completedStoryCount: stats.completedStories,
      status: autoStatus
    })
  } catch (error) {
    console.error('Error updating epic story counts:', error)
  }
}

// Sync all epics in a project to have correct automatic statuses
export async function syncAllEpicStatuses(projectId: string): Promise<void> {
  try {
    const epics = await getEpicsByProject(projectId)
    
    // Update each epic's status based on its stories
    for (const epic of epics) {
      await updateEpicStoryCounts(epic.id)
    }
  } catch (error) {
    console.error('Error syncing epic statuses:', error)
  }
}