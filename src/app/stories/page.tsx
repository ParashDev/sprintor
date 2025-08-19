"use client"

import React, { useEffect, useState, Suspense, useCallback, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getStoriesByProject, getProjectStoryStats, updateStory, deleteStory, subscribeToProjectStories } from "@/lib/story-service"
import { getProjectsByOwner } from "@/lib/project-service"
import { subscribeToProjectEpics } from "@/lib/epic-service"
import type { Story } from "@/types/story"
import type { Epic } from "@/types/epic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
  FlaskConical,
  Edit,
  Trash2,
  MoreHorizontal,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Rocket,
  Zap,
  Wrench,
  Lightbulb,
  Shield,
  BarChart3,
  Palette,
  Settings,
  Smartphone,
  Star,
  Building2,
  Lock
} from "lucide-react"

// Icon component map for rendering epic icons
const IconMap = {
  Rocket,
  Zap,
  Target,
  Wrench,
  Lightbulb,
  Shield,
  BarChart3,
  Palette,
  Search,
  Settings,
  Smartphone,
  Star,
  Building2,
  Lock,
  FileText
}

// Helper function to render icon
const renderEpicIcon = (iconName: string, className: string = "h-4 w-4") => {
  const IconComponent = IconMap[iconName as keyof typeof IconMap]
  return IconComponent ? <IconComponent className={className} /> : <FileText className={className} />
}
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
  onDelete: (story: Story) => void
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
            <DropdownMenuItem 
              onClick={() => onDelete(story)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
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
  onDelete: (story: Story) => void
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
  onDelete: (story: Story) => void
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
  const urlEpicId = searchParams.get('epic')
  
  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Epic state
  const [epics, setEpics] = useState<Epic[]>([])
  const [selectedEpicId, setSelectedEpicId] = useState<string>('')
  const [loadingEpics, setLoadingEpics] = useState(false)
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null)

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
    // Subscribe to epics when project is selected
    if (selectedProjectId && selectedProject && user) {
      setLoadingEpics(true)
      const unsubscribe = subscribeToProjectEpics(selectedProjectId, (updatedEpics) => {
        setEpics(updatedEpics)
        setLoadingEpics(false)
        
        // Handle epic selection from URL or auto-select first epic
        if (urlEpicId && !selectedEpicId) {
          const epic = updatedEpics.find(e => e.id === urlEpicId)
          if (epic) {
            setSelectedEpicId(urlEpicId)
          }
        } else if (!selectedEpicId && updatedEpics.length > 0) {
          // Auto-select first epic if none selected
          setSelectedEpicId(updatedEpics[0].id)
        }
      })
      
      return () => unsubscribe()
    } else {
      setEpics([])
      setSelectedEpicId('')
    }
  }, [selectedProjectId, selectedProject, user, urlEpicId])

  useEffect(() => {
    // Subscribe to stories when project is selected for real-time updates
    if (selectedProjectId && selectedProject && user) {
      setLoadingStories(true)
      const unsubscribe = subscribeToProjectStories(selectedProjectId, async (updatedStories) => {
        setStories(updatedStories)
        setLoadingStories(false)
        
        // Also update stats when stories change
        try {
          const stats = await getProjectStoryStats(selectedProjectId)
          setStats(stats)
        } catch (error) {
          console.error('Error fetching stats:', error)
        }
      })
      
      return unsubscribe
    } else {
      setStories([])
      setLoadingStories(false)
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
      // Clear stories and epics immediately to prevent showing wrong data
      setStories([])
      setEpics([])
      setSelectedEpicId('')
      
      // Update state - this will trigger the useEffect to fetch stories and epics
      setSelectedProjectId(projectId)
      setSelectedProject(project)
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/stories?project=${projectId}`)
    }
  }

  const handleEpicChange = (epicId: string) => {
    setSelectedEpicId(epicId)
    
    // Update URL to include epic filter
    const url = epicId 
      ? `/stories?project=${selectedProjectId}&epic=${epicId}`
      : `/stories?project=${selectedProjectId}`
    window.history.replaceState({}, '', url)
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

  const handleDeleteStoryClick = (story: Story) => {
    setStoryToDelete(story)
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!user || !storyToDelete) return

    setIsDeleting(true)
    setDeletingStoryId(storyToDelete.id)
    try {
      await deleteStory(storyToDelete.id)
      
      // Refresh stories data
      if (selectedProjectId && selectedProject) {
        fetchStoryData()
      }
    } catch (error) {
      console.error('Error deleting story:', error)
    } finally {
      // Always reset state - this ensures proper cleanup
      setDeletingStoryId('')
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setStoryToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    // Explicit cancel handler to ensure clean state reset
    setShowDeleteDialog(false)
    setStoryToDelete(null)
    setIsDeleting(false)
    setDeletingStoryId('')
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
      // Epic filtering - only show stories belonging to selected epic
      if (selectedEpicId && story.epicId !== selectedEpicId) {
        continue
      }
      
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
  }, [stories, searchQuery, selectedEpicId])

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

      {/* Mobile Epic Filter Overlay */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-lg border-r">
            <div className="h-full flex flex-col">
              {/* Mobile Sidebar Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Epic Filter</h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileFilterOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Mobile Sidebar Content - Epic List */}
              <div className="flex-1 overflow-y-auto p-4">

                {/* Epic List */}
                {loadingEpics ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : epics.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No epics yet</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/epics?project=${selectedProjectId}`}>
                        <Plus className="mr-2 h-3 w-3" />
                        Create Epic
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {epics.map((epic) => {
                      const epicStoryCount = stories.filter(s => s.epicId === epic.id).length
                      const completedEpicStories = stories.filter(s => s.epicId === epic.id && s.status === 'done').length
                      
                      return (
                        <button
                          key={epic.id}
                          onClick={() => {
                            handleEpicChange(epic.id)
                            setMobileFilterOpen(false) // Close on mobile
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedEpicId === epic.id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                              style={{ backgroundColor: epic.color + '20', color: epic.color }}
                            >
                              {epic.icon ? renderEpicIcon(epic.icon, "h-4 w-4") : <FileText className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{epic.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-muted-foreground">
                                  {epicStoryCount} stories
                                </div>
                                {epicStoryCount > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-1 py-0 h-4"
                                    style={{ borderColor: epic.color, color: epic.color }}
                                  >
                                    {Math.round((completedEpicStories / epicStoryCount) * 100)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedEpicId === epic.id && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: epic.color }}
                              />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Create Epic Link */}
                {epics.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                      <Link href={`/epics?project=${selectedProjectId}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Manage Epics
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Epic Sidebar - Desktop */}
        <div className={`${desktopSidebarCollapsed ? 'w-14' : 'w-80'} hidden md:flex flex-shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200`}>
          <div className="h-full flex flex-col w-full">
            {/* Sidebar Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                {!desktopSidebarCollapsed && (
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Epics</h2>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDesktopSidebarCollapsed(!desktopSidebarCollapsed)}
                  className="h-8 w-8 p-0"
                >
                  {desktopSidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Sidebar Content */}
            {!desktopSidebarCollapsed && (
              <div className="flex-1 overflow-y-auto p-4">

                {/* Epic List */}
                {loadingEpics ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : epics.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No epics yet</p>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/epics?project=${selectedProjectId}`}>
                        <Plus className="mr-2 h-3 w-3" />
                        Create Epic
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {epics.map((epic) => {
                      const epicStoryCount = stories.filter(s => s.epicId === epic.id).length
                      const completedEpicStories = stories.filter(s => s.epicId === epic.id && s.status === 'done').length
                      
                      return (
                        <button
                          key={epic.id}
                          onClick={() => handleEpicChange(epic.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selectedEpicId === epic.id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                              style={{ backgroundColor: epic.color + '20', color: epic.color }}
                            >
                              {epic.icon ? renderEpicIcon(epic.icon, "h-4 w-4") : <FileText className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{epic.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="text-xs text-muted-foreground">
                                  {epicStoryCount} stories
                                </div>
                                {epicStoryCount > 0 && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs px-1 py-0 h-4"
                                    style={{ borderColor: epic.color, color: epic.color }}
                                  >
                                    {Math.round((completedEpicStories / epicStoryCount) * 100)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {selectedEpicId === epic.id && (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: epic.color }}
                              />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Create Epic Link */}
                {epics.length > 0 && (
                  <div className="mt-6 pt-4 border-t">
                    <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                      <Link href={`/epics?project=${selectedProjectId}`}>
                        <Plus className="mr-2 h-4 w-4" />
                        Manage Epics
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Stories</h1>
              <p className="text-muted-foreground mt-1">Drag and drop stories across workflow stages</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                size="lg"
                className="md:hidden"
                onClick={() => setMobileFilterOpen(true)}
              >
                <Filter className="mr-2 h-5 w-5" />
                Epic Filter
              </Button>
              <Button size="lg" disabled={!selectedProject} onClick={handleOpenCreateModal}>
                <Plus className="mr-2 h-5 w-5" />
                Create Story
              </Button>
            </div>
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

          {/* Search and Epic Filter Status */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
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
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {selectedEpicId && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtered by:</span>
                {(() => {
                  const selectedEpic = epics.find(e => e.id === selectedEpicId)
                  return selectedEpic ? (
                    <Badge 
                      variant="outline" 
                      className="flex items-center gap-2"
                      style={{ borderColor: selectedEpic.color, color: selectedEpic.color }}
                    >
                      {selectedEpic.icon ? renderEpicIcon(selectedEpic.icon, "h-3 w-3") : <FileText className="h-3 w-3" />}
                      <span>{selectedEpic.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEpicChange('')}
                        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ) : null
                })()} 
              </div>
            )}
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
                  onDelete={handleDeleteStoryClick}
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
        </div>
      </div>

      {/* Create Story Modal */}
      {selectedProject && (
        <CreateStoryModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseCreateModal}
          projectId={selectedProject.id}
          onStoryCreated={handleStoryCreated}
          defaultEpicId={selectedEpicId || undefined}
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

      {/* Simple Custom Delete Modal - No portals, no Radix */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={handleCancelDelete}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl w-full max-w-md p-6 border">
            <div className="space-y-4">
              {/* Header */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Story
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Are you sure you want to delete "{storyToDelete?.title}"? This action cannot be undone.
                </p>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
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