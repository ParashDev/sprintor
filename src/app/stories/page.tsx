"use client"

import React, { useEffect, useState, Suspense, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getStoriesByProject, getProjectStoryStats, updateStory, deleteStory } from "@/lib/story-service"
import { getProjectsByOwner } from "@/lib/project-service"
import type { Story } from "@/types/story"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { 
  Plus, 
  BookOpen, 
  Loader2,
  CheckCircle2,
  Clock,
  Target,
  Search,
  FileText,
  Bug,
  Zap,
  FlaskConical,
  Edit,
  Trash2,
  MoreHorizontal,
  GripVertical
} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import CreateStoryModal from "@/components/stories/CreateStoryModal"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable
} from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import {
  CSS
} from "@dnd-kit/utilities"

interface Project {
  id: string
  name: string
  companyName: string
}

// Kanban columns configuration
const KANBAN_COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'ready', title: 'Ready', color: 'bg-blue-100 dark:bg-blue-900/20' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-100 dark:bg-yellow-900/20' },
  { id: 'review', title: 'Review', color: 'bg-purple-100 dark:bg-purple-900/20' },
  { id: 'testing', title: 'Testing', color: 'bg-orange-100 dark:bg-orange-900/20' },
  { id: 'done', title: 'Done', color: 'bg-green-100 dark:bg-green-900/20' }
]

// Memoized content component (prevents re-renders during drag)
const StoryCardContent = React.memo(function StoryCardContent({ 
  story, 
  onEdit, 
  onDelete, 
  isDeleting 
}: {
  story: Story
  onEdit: (story: Story) => void
  onDelete: (storyId: string) => void
  isDeleting: boolean
}) {
  const getTypeIcon = useCallback((type: string) => {
    switch (type) {
      case 'story': return <FileText className="h-4 w-4" />
      case 'epic': return <Target className="h-4 w-4" />
      case 'task': return <Zap className="h-4 w-4" />
      case 'bug': return <Bug className="h-4 w-4" />
      case 'spike': return <FlaskConical className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }, [])

  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'Must Have': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      case 'Should Have': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
      case 'Could Have': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'Won\'t Have': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
      default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
    }
  }, [])

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
          {getTypeIcon(story.type)}
          <h4 className="font-medium text-sm truncate">{story.title}</h4>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(story)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  onSelect={(e) => e.preventDefault()}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Story</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{story.title}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(story.id)}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {story.description && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{story.description}</p>
      )}
      
      <div className="flex flex-wrap items-center gap-1 mb-2">
        <Badge variant="outline" className={`text-xs ${getPriorityColor(story.priority)}`}>
          {story.priority}
        </Badge>
        {story.storyPoints && (
          <Badge variant="secondary" className="text-xs">
            {story.storyPoints} pts
          </Badge>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-mono">#{story.id.split('_').pop()}</span>
        <span>{story.acceptanceCriteria.length} AC</span>
      </div>
    </>
  )
})

// Sortable wrapper (only handles drag logic)
interface StoryCardProps {
  story: Story
  onEdit: (story: Story) => void
  onDelete: (storyId: string) => void
  isDeleting: boolean
}

const StoryCard = function StoryCard({ story, onEdit, onDelete, isDeleting }: StoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: story.id
  })

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }), [transform, transition, isDragging])

  return (
    <div
      ref={setNodeRef}
      style={{...style, touchAction: 'none'}}
      className="bg-white dark:bg-gray-800 border rounded-lg p-3 mb-3 shadow-sm cursor-grab active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <StoryCardContent 
        story={story} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        isDeleting={isDeleting} 
      />
    </div>
  )
}

// Droppable Column Component
interface DroppableColumnProps {
  column: typeof KANBAN_COLUMNS[0]
  stories: Story[]
  onEdit: (story: Story) => void
  onDelete: (storyId: string) => void
  isDeleting: boolean
  deletingStoryId: string
}

const DroppableColumn = React.memo(function DroppableColumn({ column, stories, onEdit, onDelete, isDeleting, deletingStoryId }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex-shrink-0 w-full md:w-80">
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${column.color}`} />
              {column.title}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {stories.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <SortableContext
            items={stories.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div
              ref={setNodeRef}
              className={`min-h-[200px] space-y-3 ${
                isOver ? 'bg-accent/50 rounded-lg' : ''
              }`}
            >
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isDeleting={isDeleting && deletingStoryId === story.id}
                />
              ))}
              {stories.length === 0 && (
                <div className={`flex items-center justify-center h-32 text-muted-foreground text-sm border-2 border-dashed rounded-lg transition-colors ${
                  isOver ? 'border-primary bg-primary/10' : 'border-muted'
                }`}>
                  Drop stories here
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  )
})

function StoriesContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlProjectId = searchParams.get('project')
  
  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Story state
  const [stories, setStories] = useState<Story[]>([])
  const [stats, setStats] = useState({
    totalStories: 0,
    storiesByStatus: {} as Record<string, number>,
    storiesByType: {} as Record<string, number>,
    storiesByPriority: {} as Record<string, number>,
    completionRate: 0,
    averageStoryPoints: 0
  })
  const [loadingStories, setLoadingStories] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Drag and drop state
  const [activeStory, setActiveStory] = useState<Story | null>(null)
  const [isDraggedOver, setIsDraggedOver] = useState<string | null>(null)
  
  // Drag sensors - mobile & desktop optimized
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  )
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [deletingStoryId, setDeletingStoryId] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Fetch projects when user is available
    if (user && !loading) {
      fetchProjects()
    }
  }, [user, loading])

  useEffect(() => {
    // Initial project selection when projects load
    if (projects.length > 0 && !selectedProjectId) {
      // Check URL parameter first
      if (urlProjectId) {
        const project = projects.find(p => p.id === urlProjectId)
        if (project) {
          setSelectedProjectId(urlProjectId)
          setSelectedProject(project)
          return
        }
      }
      // Otherwise select first project
      setSelectedProjectId(projects[0].id)
      setSelectedProject(projects[0])
    }
  }, [projects]) // Only run when projects list changes

  useEffect(() => {
    // Fetch stories when project is selected
    if (selectedProjectId && selectedProject && user) {
      fetchStoryData()
    } else {
      setStories([])
    }
  }, [selectedProjectId, selectedProject, user])

  const fetchProjects = async () => {
    if (!user) return
    
    setLoadingProjects(true)
    try {
      const userProjects = await getProjectsByOwner(user.uid)
      setProjects(userProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchStoryData = async () => {
    if (!user || !selectedProject) return
    
    setLoadingStories(true)
    try {
      const [projectStories, projectStats] = await Promise.all([
        getStoriesByProject(selectedProject.id),
        getProjectStoryStats(selectedProject.id)
      ])
      
      setStories(projectStories)
      setStats(projectStats)
    } catch (error) {
      console.error('Error fetching story data:', error)
    } finally {
      setLoadingStories(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      // Clear stories immediately to prevent showing wrong data
      setStories([])
      
      // Update state - this will trigger the useEffect to fetch stories
      setSelectedProjectId(projectId)
      setSelectedProject(project)
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/stories?project=${projectId}`)
    }
  }

  // Modal handlers
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false)
  }

  const handleStoryCreated = () => {
    // Refresh stories data
    if (selectedProjectId && selectedProject) {
      fetchStoryData()
    }
  }

  // Edit/Delete handlers
  const handleEditStory = (story: Story) => {
    setEditingStory(story)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingStory(null)
  }

  const handleStoryUpdated = () => {
    // Refresh stories data
    if (selectedProjectId && selectedProject) {
      fetchStoryData()
    }
    handleCloseEditModal()
  }

  const handleDeleteStory = async (storyId: string) => {
    if (!user) return

    setIsDeleting(true)
    try {
      await deleteStory(storyId)
      
      // Refresh stories data
      if (selectedProjectId && selectedProject) {
        fetchStoryData()
      }
      
      setDeletingStoryId('')
    } catch (error) {
      console.error('Error deleting story:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Separate async function to avoid blocking drag handler
  const updateStoryAsync = useCallback(async (storyId: string, newStatus: Story['status'], originalStatus: Story['status']) => {
    try {
      await updateStory(storyId, { status: newStatus })
      
      // Update stats in background
      if (selectedProject) {
        const newStats = await getProjectStoryStats(selectedProject.id)
        setStats(newStats)
      }
    } catch (error) {
      console.error('Error updating story status:', error)
      // Revert UI on error
      setStories(prev => 
        prev.map(s => 
          s.id === storyId 
            ? { ...s, status: originalStatus }
            : s
        )
      )
    }
  }, [selectedProject])

  // Drag and drop handlers - research-based optimization
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const story = stories.find(s => s.id === active.id)
    setActiveStory(story || null)
  }, [stories])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    // Immediate cleanup
    setActiveStory(null)
    setIsDraggedOver(null)

    if (!over || !user) return

    const storyId = active.id as string
    const newStatus = over.id as string

    // Ultra-fast validation
    if (!newStatus || newStatus.startsWith('story_') || 
        !['backlog', 'ready', 'in_progress', 'review', 'testing', 'done'].includes(newStatus)) {
      return
    }

    // Find story with early exit
    let targetStory: Story | undefined
    for (const story of stories) {
      if (story.id === storyId) {
        targetStory = story
        break
      }
    }
    
    if (!targetStory || targetStory.status === newStatus) return

    // Immediate UI update with minimal computation
    setStories(prev => {
      const newStories = new Array(prev.length)
      for (let i = 0; i < prev.length; i++) {
        newStories[i] = prev[i].id === storyId 
          ? { ...prev[i], status: newStatus as Story['status'] }
          : prev[i]
      }
      return newStories
    })

    // Defer Firebase update
    setTimeout(() => {
      updateStoryAsync(storyId, newStatus as Story['status'], targetStory!.status)
    }, 0)
  }, [stories, user, updateStoryAsync])

  // Group stories by status for Kanban columns - optimized
  const storiesByStatus = React.useMemo(() => {
    const grouped: Record<string, Story[]> = {
      backlog: [],
      ready: [],
      in_progress: [],
      review: [],
      testing: [],
      done: []
    }

    const searchLower = searchQuery.toLowerCase().trim()
    
    for (const story of stories) {
      // Fast search filtering
      if (searchLower && 
          !story.title.toLowerCase().includes(searchLower) &&
          !story.description.toLowerCase().includes(searchLower) &&
          !(story.asA?.toLowerCase().includes(searchLower)) &&
          !story.labels.some(label => label.toLowerCase().includes(searchLower))) {
        continue
      }
      
      // Direct assignment instead of filter
      if (grouped[story.status]) {
        grouped[story.status].push(story)
      }
    }

    return grouped
  }, [stories, searchQuery])

  if (loading || loadingProjects) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader />

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Stories</h1>
              <p className="text-muted-foreground mt-1">Drag and drop stories across workflow stages</p>
            </div>
            <Button size="lg" disabled={!selectedProject} onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-5 w-5" />
              Create Story
            </Button>
          </div>

          {/* Project Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">Project:</label>
              <div className="min-w-[200px]">
                <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        <div className="flex items-center gap-2">
                          <span>{project.name}</span>
                          <span className="text-xs text-muted-foreground">• {project.companyName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {!selectedProject && projects.length === 0 && (
              <Button asChild>
                <Link href="/projects">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            )}
          </div>

          {/* Stats Cards - Mobile Responsive */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalStories}</div>
                <p className="text-xs text-muted-foreground">Stories</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Done</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
                <p className="text-xs text-muted-foreground">Complete</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Points</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageStoryPoints.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Story size</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.storiesByStatus?.in_progress || 0}</div>
                <p className="text-xs text-muted-foreground">Working</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex justify-center mb-6">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                >
                  ×
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        {loadingStories ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No stories yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first user story to get started with project planning
              </p>
              <Button onClick={handleOpenCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Story
              </Button>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            autoScroll={false}
          >
            {/* Mobile: Vertical Stack / Desktop: Horizontal Scroll */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 md:flex md:gap-6 md:overflow-x-auto md:pb-4">
              {KANBAN_COLUMNS.map((column) => (
                <DroppableColumn
                  key={column.id}
                  column={column}
                  stories={storiesByStatus[column.id] || []}
                  onEdit={handleEditStory}
                  onDelete={handleDeleteStory}
                  isDeleting={isDeleting}
                  deletingStoryId={deletingStoryId}
                />
              ))}
            </div>

            {/* Optimized Drag Overlay - prevents re-renders */}
            <DragOverlay dropAnimation={null}>
              {activeStory ? (
                <div className="bg-white dark:bg-gray-800 border rounded-lg p-3 shadow-lg opacity-90 rotate-2 pointer-events-none">
                  <StoryCardContent 
                    story={activeStory} 
                    onEdit={() => {}} 
                    onDelete={() => {}} 
                    isDeleting={false} 
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

      </main>

      {/* Create Story Modal */}
      {selectedProject && (
        <CreateStoryModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          projectId={selectedProject.id}
          onStoryCreated={handleStoryCreated}
        />
      )}

      {/* Edit Story Modal */}
      {selectedProject && editingStory && (
        <CreateStoryModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          projectId={selectedProject.id}
          onStoryCreated={handleStoryUpdated}
          editingStory={editingStory}
        />
      )}
    </div>
  )
}

export default function StoriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <StoriesContent />
    </Suspense>
  )
}