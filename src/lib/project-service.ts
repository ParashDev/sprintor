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
  getDocs
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
  sessionsCount: number
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
  sessionsCount: number
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
      sessionsCount: 0
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

// Increment session count for a project
export async function incrementProjectSessionCount(projectId: string): Promise<void> {
  try {
    const docRef = doc(db, 'projects', projectId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const currentCount = docSnap.data().sessionsCount || 0
      await updateDoc(docRef, {
        sessionsCount: currentCount + 1,
        updatedAt: serverTimestamp()
      })
    }
  } catch (error) {
    console.error('Error incrementing session count:', error)
    throw new Error('Failed to update session count')
  }
}