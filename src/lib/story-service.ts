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
  increment,
  type FieldValue
} from 'firebase/firestore'
import { db } from './firebase'
import type { Story, Epic, StoryTemplate,  Comment, Attachment } from '@/types/story'
import { updateEpicStoryCounts } from './epic-service'

// Firestore document types for proper timestamp handling
interface FirestoreStory extends Omit<Story, 'createdAt' | 'updatedAt' | 'startedAt' | 'completedAt' | 'lastDiscussion' | 'comments'> {
  createdAt: { toDate(): Date } | Date
  updatedAt: { toDate(): Date } | Date
  startedAt?: { toDate(): Date } | Date | null
  completedAt?: { toDate(): Date } | Date | null
  lastDiscussion?: { toDate(): Date } | Date | null
  comments: Array<{
    id: string
    text: string
    authorId: string
    authorName: string
    createdAt: { toDate(): Date } | Date
    type: 'comment' | 'status_change' | 'assignment' | 'estimate_change'
    mentions?: string[]
  }>
}

interface FirestoreTemplate extends Omit<StoryTemplate, 'createdAt' | 'lastUsed'> {
  createdAt: { toDate(): Date } | Date
  lastUsed?: { toDate(): Date } | Date | null
}

// Helper function to convert Firestore story to our Story type
function convertFirestoreStory(doc: FirestoreStory): Story {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt?.toDate() || new Date(),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : doc.updatedAt?.toDate() || new Date(),
    startedAt: doc.startedAt instanceof Date ? doc.startedAt : doc.startedAt?.toDate() || undefined,
    completedAt: doc.completedAt instanceof Date ? doc.completedAt : doc.completedAt?.toDate() || undefined,
    lastDiscussion: doc.lastDiscussion instanceof Date ? doc.lastDiscussion : doc.lastDiscussion?.toDate() || undefined,
    // Convert comment timestamps
    comments: doc.comments?.map(comment => ({
      ...comment,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt : comment.createdAt.toDate()
    })) || []
  } as Story
}

// Helper function to convert Firestore template to our Template type
function convertFirestoreTemplate(doc: FirestoreTemplate): StoryTemplate {
  return {
    ...doc,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt : doc.createdAt.toDate(),
    lastUsed: doc.lastUsed instanceof Date ? doc.lastUsed : doc.lastUsed?.toDate() || undefined,
  } as StoryTemplate
}

// === STORY TEMPLATES ===

// Create a new story template
export async function createStoryTemplate(templateData: Omit<StoryTemplate, 'id' | 'createdAt' | 'usageCount'>): Promise<string> {
  try {
    const templateId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await setDoc(doc(db, 'storyTemplates', templateId), {
      id: templateId,
      ...templateData,
      createdAt: serverTimestamp(),
      usageCount: 0
    })

    return templateId
  } catch (error) {
    console.error('Error creating story template:', error)
    throw new Error('Failed to create story template')
  }
}

// Get all templates for a project (or global templates)
export async function getStoryTemplates(projectId?: string): Promise<StoryTemplate[]> {
  try {
    // For now, let's get all templates and filter client-side to avoid Firestore query issues
    const q = query(
      collection(db, 'storyTemplates'),
      orderBy('name', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    const templates: StoryTemplate[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreTemplate
      const template = convertFirestoreTemplate(data)
      
      // Include global templates (projectId is null/undefined) and project-specific templates
      if (!template.projectId || template.projectId === projectId) {
        templates.push(template)
      }
    })
    
    return templates
  } catch (error) {
    console.error('Error fetching story templates:', error)
    return []
  }
}

// Get a specific template by ID
export async function getStoryTemplate(templateId: string): Promise<StoryTemplate | null> {
  try {
    const docRef = doc(db, 'storyTemplates', templateId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreTemplate
      return convertFirestoreTemplate(data)
    }
    return null
  } catch (error) {
    console.error('Error fetching story template:', error)
    return null
  }
}

// Update template usage count when used
export async function incrementTemplateUsage(templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, 'storyTemplates', templateId)
    await updateDoc(templateRef, {
      usageCount: increment(1),
      lastUsed: serverTimestamp()
    })
  } catch (error) {
    console.error('Error updating template usage:', error)
  }
}

// === STORIES ===

// Create a new story
// Helper function to clean undefined values from objects before Firestore write
function cleanStoryDataForFirestore(data: Record<string, unknown>): Record<string, FieldValue | Partial<unknown> | undefined> {
  const cleanData: Record<string, FieldValue | Partial<unknown> | undefined> = {}
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanData[key] = value as FieldValue | Partial<unknown>
    }
  })
  return cleanData
}

export async function createStory(storyData: Omit<Story, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const storyId = `story_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // If created from template, increment template usage
    if (storyData.createdFromTemplate) {
      await incrementTemplateUsage(storyData.createdFromTemplate)
    }
    
    // Clean undefined values before writing to Firestore
    const cleanData = cleanStoryDataForFirestore({
      id: storyId,
      ...storyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    
    await setDoc(doc(db, 'stories', storyId), cleanData)

    // Update epic status if story belongs to an epic
    if (storyData.epicId) {
      await updateEpicStoryCounts(storyData.epicId)
    }

    return storyId
  } catch (error) {
    console.error('Error creating story:', error)
    throw new Error('Failed to create story')
  }
}

// Get stories by project with filtering options
export async function getStoriesByProject(
  projectId: string, 
  options?: {
    status?: string[]
    type?: string[]
    epicId?: string
    assignedTo?: string
    limitCount?: number
  }
): Promise<Story[]> {
  try {
    let q = query(
      collection(db, 'stories'),
      where('projectId', '==', projectId)
    )
    
    // Apply filters
    if (options?.status && options.status.length > 0) {
      q = query(q, where('status', 'in', options.status))
    }
    
    if (options?.type && options.type.length > 0) {
      q = query(q, where('type', 'in', options.type))
    }
    
    if (options?.epicId) {
      q = query(q, where('epicId', '==', options.epicId))
    }
    
    if (options?.assignedTo) {
      q = query(q, where('assignedTo', '==', options.assignedTo))
    }
    
    // Add ordering and limit
    q = query(q, orderBy('updatedAt', 'desc'))
    
    if (options?.limitCount) {
      q = query(q, limit(options.limitCount))
    }
    
    const querySnapshot = await getDocs(q)
    const stories: Story[] = []
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as FirestoreStory
      stories.push(convertFirestoreStory(data))
    })
    
    return stories
  } catch (error) {
    console.error('Error fetching stories:', error)
    return []
  }
}

// Get a single story by ID
export async function getStory(storyId: string): Promise<Story | null> {
  try {
    const docRef = doc(db, 'stories', storyId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      const data = docSnap.data() as FirestoreStory
      return convertFirestoreStory(data)
    }
    return null
  } catch (error) {
    console.error('Error fetching story:', error)
    return null
  }
}

// Update a story
export async function updateStory(storyId: string, updates: Partial<Omit<Story, 'id' | 'createdAt'>>): Promise<void> {
  try {
    // Get the current story to check for epic changes
    const currentStory = await getStory(storyId)
    
    const storyRef = doc(db, 'stories', storyId)
    
    // Clean undefined values before writing to Firestore
    const cleanUpdates = cleanStoryDataForFirestore({
      ...updates,
      updatedAt: serverTimestamp()
    })
    
    await updateDoc(storyRef, cleanUpdates)
    
    // Update epic status for affected epics
    const epicsToUpdate = new Set<string>()
    
    // Add current epic if it exists
    if (currentStory?.epicId) {
      epicsToUpdate.add(currentStory.epicId)
    }
    
    // Add new epic if it's changing
    if (updates.epicId && updates.epicId !== currentStory?.epicId) {
      epicsToUpdate.add(updates.epicId)
    }
    
    // Update all affected epics
    for (const epicId of epicsToUpdate) {
      await updateEpicStoryCounts(epicId)
    }
  } catch (error) {
    console.error('Error updating story:', error)
    throw new Error('Failed to update story')
  }
}

// Delete a story
export async function deleteStory(storyId: string): Promise<void> {
  try {
    // Get the story before deleting to update epic status
    const story = await getStory(storyId)
    
    const storyRef = doc(db, 'stories', storyId)
    await deleteDoc(storyRef)
    
    // Update epic status if story belonged to an epic
    if (story?.epicId) {
      await updateEpicStoryCounts(story.epicId)
    }
  } catch (error) {
    console.error('Error deleting story:', error)
    throw new Error('Failed to delete story')
  }
}

// Subscribe to stories changes for real-time updates
export function subscribeToProjectStories(projectId: string, callback: (stories: Story[]) => void): () => void {
  const q = query(
    collection(db, 'stories'),
    where('projectId', '==', projectId),
    orderBy('updatedAt', 'desc')
  )
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const stories: Story[] = []
    
    snapshot.forEach((doc) => {
      const data = doc.data() as FirestoreStory
      stories.push(convertFirestoreStory(data))
    })
    
    callback(stories)
  }, (error) => {
    console.error('Error in stories subscription:', error)
  })
  
  return unsubscribe
}

// === EPICS ===

// Create a new epic
export async function createEpic(epicData: Omit<Epic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const epicId = `epic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    await setDoc(doc(db, 'epics', epicId), {
      id: epicId,
      ...epicData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return epicId
  } catch (error) {
    console.error('Error creating epic:', error)
    throw new Error('Failed to create epic')
  }
}

// Get epics by project
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
      const data = doc.data()
      epics.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || undefined,
        endDate: data.endDate?.toDate() || undefined,
      } as Epic)
    })
    
    return epics
  } catch (error) {
    console.error('Error fetching epics:', error)
    return []
  }
}

// === STORY COMMENTS ===

// Add comment to story
export async function addStoryComment(storyId: string, comment: Omit<Comment, 'id' | 'createdAt'>): Promise<void> {
  try {
    const story = await getStory(storyId)
    if (!story) return

    const newComment: Comment = {
      ...comment,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date()
    }

    const updatedComments = [...story.comments, newComment]

    await updateStory(storyId, {
      comments: updatedComments,
      lastDiscussion: new Date()
    })
  } catch (error) {
    console.error('Error adding story comment:', error)
    throw new Error('Failed to add comment')
  }
}

// Delete comment from story
export async function deleteStoryComment(storyId: string, commentId: string): Promise<void> {
  try {
    const story = await getStory(storyId)
    if (!story) return

    const updatedComments = story.comments.filter(comment => comment.id !== commentId)

    await updateStory(storyId, {
      comments: updatedComments,
      lastDiscussion: new Date()
    })
  } catch (error) {
    console.error('Error deleting story comment:', error)
    throw new Error('Failed to delete comment')
  }
}

// === STORY ATTACHMENTS ===

// Add attachment to story
export async function addStoryAttachment(storyId: string, attachment: Omit<Attachment, 'id' | 'uploadedAt'>): Promise<void> {
  try {
    const story = await getStory(storyId)
    if (!story) return

    const newAttachment: Attachment = {
      ...attachment,
      id: Math.random().toString(36).substring(2, 9),
      uploadedAt: new Date()
    }

    const updatedAttachments = [...story.attachments, newAttachment]

    await updateStory(storyId, {
      attachments: updatedAttachments
    })
  } catch (error) {
    console.error('Error adding story attachment:', error)
    throw new Error('Failed to add attachment')
  }
}

// === BULK OPERATIONS ===

// Update multiple stories (for drag and drop, bulk status changes, etc.)
export async function updateMultipleStories(updates: Array<{ id: string; data: Partial<Story> }>): Promise<void> {
  try {
    const batch = writeBatch(db)
    
    updates.forEach(({ id, data }) => {
      const storyRef = doc(db, 'stories', id)
      batch.update(storyRef, {
        ...data,
        updatedAt: serverTimestamp()
      })
    })
    
    await batch.commit()
  } catch (error) {
    console.error('Error updating multiple stories:', error)
    throw new Error('Failed to update stories')
  }
}

// === STORY STATISTICS ===

// Get project story statistics
export async function getProjectStoryStats(projectId: string): Promise<{
  totalStories: number
  storiesByStatus: Record<string, number>
  storiesByType: Record<string, number>
  storiesByPriority: Record<string, number>
  completionRate: number
  averageStoryPoints: number
}> {
  try {
    const stories = await getStoriesByProject(projectId)
    
    const stats = {
      totalStories: stories.length,
      storiesByStatus: {} as Record<string, number>,
      storiesByType: {} as Record<string, number>,
      storiesByPriority: {} as Record<string, number>,
      completionRate: 0,
      averageStoryPoints: 0
    }
    
    let totalStoryPoints = 0
    let storiesWithPoints = 0
    let completedStories = 0
    
    stories.forEach(story => {
      // Count by status
      stats.storiesByStatus[story.status] = (stats.storiesByStatus[story.status] || 0) + 1
      
      // Count by type
      stats.storiesByType[story.type] = (stats.storiesByType[story.type] || 0) + 1
      
      // Count by priority
      stats.storiesByPriority[story.priority] = (stats.storiesByPriority[story.priority] || 0) + 1
      
      // Calculate story points average
      if (story.storyPoints) {
        totalStoryPoints += story.storyPoints
        storiesWithPoints++
      }
      
      // Count completed stories (stories ready for sprint)
      if (story.status === 'sprint_ready') {
        completedStories++
      }
    })
    
    stats.completionRate = stories.length > 0 ? (completedStories / stories.length) * 100 : 0
    stats.averageStoryPoints = storiesWithPoints > 0 ? totalStoryPoints / storiesWithPoints : 0
    
    return stats
  } catch (error) {
    console.error('Error calculating story stats:', error)
    return {
      totalStories: 0,
      storiesByStatus: {},
      storiesByType: {},
      storiesByPriority: {},
      completionRate: 0,
      averageStoryPoints: 0
    }
  }
}


