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
  getDocs,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

export interface Project {
  id: string
  name: string
  description: string
  companyName: string
  projectType: string
  estimationMethod: string
  sprintDuration: string
  createdAt: Date
  updatedAt: Date
  ownerId: string
  sprintsCount: number
}

// Firestore document types for proper timestamp handling
interface FirestoreProject {
  id: string
  name: string
  description: string
  companyName: string
  projectType: string
  estimationMethod: string
  sprintDuration: string
  createdAt: { toDate(): Date } | Date
  updatedAt: { toDate(): Date } | Date
  ownerId: string
  sprintsCount: number
}

// Helper function to convert Firestore project to our Project type
function convertFirestoreProject(doc: FirestoreProject): Project {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Date 
      ? doc.createdAt 
      : doc.createdAt && typeof doc.createdAt.toDate === 'function' 
        ? doc.createdAt.toDate() 
        : new Date(),
    updatedAt: doc.updatedAt instanceof Date 
      ? doc.updatedAt 
      : doc.updatedAt && typeof doc.updatedAt.toDate === 'function' 
        ? doc.updatedAt.toDate() 
        : new Date(),
  }
}

// Create a new project
export async function createProject(projectData: {
  name: string
  description: string
  companyName: string
  projectType: string
  estimationMethod: string
  sprintDuration: string
  ownerId: string
}): Promise<string> {
  try {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const project: Omit<Project, 'id'> = {
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date(),
      sprintsCount: 0
    }

    await setDoc(doc(db, 'projects', projectId), {
      id: projectId,
      ...project,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return projectId
  } catch (error) {
    console.error('Error creating project:', error)
    throw new Error('Failed to create project')
  }
}

// Get all projects for a user
export async function getProjectsByOwner(ownerId: string): Promise<Project[]> {
  try {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    const projects: Project[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreProject
      projects.push(convertFirestoreProject(data))
    })
    
    return projects
  } catch (error) {
    console.error('Error fetching projects:', error)
    throw new Error('Failed to fetch projects')
  }
}

// Get a single project by ID
export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const docRef = doc(db, 'projects', projectId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreProject
      return convertFirestoreProject(data)
    } else {
      return null
    }
  } catch (error) {
    console.error('Error fetching project:', error)
    throw new Error('Failed to fetch project')
  }
}

// Update project
export async function updateProject(projectId: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'ownerId'>>): Promise<void> {
  try {
    const docRef = doc(db, 'projects', projectId)
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating project:', error)
    throw new Error('Failed to update project')
  }
}

// Delete project
export async function deleteProject(projectId: string): Promise<void> {
  try {
    const docRef = doc(db, 'projects', projectId)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting project:', error)
    throw new Error('Failed to delete project')
  }
}

// Subscribe to projects changes for real-time updates
export function subscribeToUserProjects(ownerId: string, callback: (projects: Project[]) => void): () => void {
  const q = query(
    collection(db, 'projects'),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  )
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const projects: Project[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreProject
      projects.push(convertFirestoreProject(data))
    })
    
    callback(projects)
  }, (error) => {
    console.error('Error in projects subscription:', error)
  })
  
  return unsubscribe
}

// Increment sprint count for a project
export async function incrementProjectSprintCount(projectId: string): Promise<void> {
  try {
    const docRef = doc(db, 'projects', projectId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const currentCount = docSnap.data().sprintsCount || 0
      await updateDoc(docRef, {
        sprintsCount: currentCount + 1,
        updatedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error incrementing sprint count:', error)
    throw new Error('Failed to update sprint count')
  }
}

// Get actual sprint count for a project from the sprints collection
export async function getActualProjectSprintCount(projectId: string): Promise<number> {
  try {
    const sprintsQuery = query(
      collection(db, 'sprints'),
      where('projectId', '==', projectId)
    )
    const snapshot = await getDocs(sprintsQuery)
    return snapshot.size
  } catch (error) {
    console.error('Error getting actual sprint count:', error)
    return 0
  }
}

// Get active sprint count across all user projects
export async function getActiveSprintsCount(ownerId: string): Promise<number> {
  try {
    // First get all projects for this user
    const projects = await getProjectsByOwner(ownerId)
    const projectIds = projects.map(p => p.id)
    
    if (projectIds.length === 0) return 0
    
    // Query sprints that belong to user's projects and are active
    const sprintsQuery = query(
      collection(db, 'sprints'),
      where('projectId', 'in', projectIds),
      where('status', '==', 'active')
    )
    const snapshot = await getDocs(sprintsQuery)
    return snapshot.size
  } catch (error) {
    console.error('Error getting active sprints count:', error)
    return 0
  }
}

// Sync project sprint counts with actual data from sprints collection
export async function syncProjectSprintCounts(ownerId: string): Promise<void> {
  try {
    const projects = await getProjectsByOwner(ownerId)
    const batch = writeBatch(db)
    
    for (const project of projects) {
      const actualCount = await getActualProjectSprintCount(project.id)
      if (project.sprintsCount !== actualCount) {
        const projectRef = doc(db, 'projects', project.id)
        batch.update(projectRef, {
          sprintsCount: actualCount,
          updatedAt: serverTimestamp()
        })
      }
    }
    
    await batch.commit()
  } catch (error) {
    console.error('Error syncing project sprint counts:', error)
    throw new Error('Failed to sync sprint counts')
  }
}