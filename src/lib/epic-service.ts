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
  getDocs,
  writeBatch
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
    const cleanUpdates: Record<string, any> = {}
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

// Get epic statistics
export async function getEpicStats(epicId: string): Promise<EpicStats> {
  try {
    // This will be implemented when we integrate with stories
    // For now, return default stats
    const q = query(
      collection(db, 'stories'),
      where('epicId', '==', epicId)
    )
    
    const querySnapshot = await getDocs(q)
    let totalStories = 0
    let completedStories = 0
    let inProgressStories = 0
    let backlogStories = 0
    let totalStoryPoints = 0
    let completedStoryPoints = 0
    
    querySnapshot.forEach((doc) => {
      const story = doc.data()
      totalStories++
      
      switch (story.status) {
        case 'done':
          completedStories++
          if (story.storyPoints) {
            completedStoryPoints += story.storyPoints
          }
          break
        case 'in_progress':
        case 'review':
        case 'testing':
          inProgressStories++
          break
        case 'backlog':
        case 'ready':
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

// Update epic story counts (called when stories are added/removed/updated)
export async function updateEpicStoryCounts(epicId: string): Promise<void> {
  try {
    const stats = await getEpicStats(epicId)
    await updateEpic(epicId, {
      storyCount: stats.totalStories,
      completedStoryCount: stats.completedStories
    })
  } catch (error) {
    console.error('Error updating epic story counts:', error)
  }
}