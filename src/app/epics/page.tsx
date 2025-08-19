"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { deleteEpic, updateEpic, subscribeToProjectEpics, syncAllEpicStatuses } from "@/lib/epic-service"
import { getProjectsByOwner, type Project } from "@/lib/project-service"
import { getStoriesByProject } from "@/lib/story-service"
import type { Epic } from "@/types/epic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { 
  Plus, 
  MoreVertical,
  Edit,
  Trash2,
  Target,
  Loader2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Calendar,
  // Epic icons that are used in the IconMap
  Rocket,
  Zap,
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
const renderIcon = (iconName: string, className: string = "h-4 w-4") => {
  const IconComponent = IconMap[iconName as keyof typeof IconMap]
  return IconComponent ? <IconComponent className={className} /> : <FileText className={className} />
}
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { CreateEpicModal } from "@/components/epics/CreateEpicModal"

interface ProjectWithCount extends Project {
  id: string
  name: string
  companyName: string
}

function EpicsPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlProjectId = searchParams.get('project')
  
  // Project state
  const [projects, setProjects] = useState<ProjectWithCount[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<ProjectWithCount | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Epic state
  const [epics, setEpics] = useState<Epic[]>([])
  const [loadingEpics, setLoadingEpics] = useState(false)
  const [epicStoryCounts, setEpicStoryCounts] = useState<Record<string, { 
    total: number, 
    backlog: number, 
    planning: number, 
    sprintReady: number 
  }>>({})
  const [deletingEpicId, setDeletingEpicId] = useState<string>('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [epicToDelete, setEpicToDelete] = useState<Epic | null>(null)
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingEpic, setEditingEpic] = useState<Epic | null>(null)

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
  }, [projects, urlProjectId])

  // Function to calculate story counts for each epic
  const calculateEpicStoryCounts = async (projectId: string) => {
    try {
      const stories = await getStoriesByProject(projectId)
      const counts: Record<string, { 
        total: number, 
        backlog: number, 
        planning: number, 
        sprintReady: number 
      }> = {}
      
      stories.forEach(story => {
        if (story.epicId) {
          if (!counts[story.epicId]) {
            counts[story.epicId] = { 
              total: 0, 
              backlog: 0, 
              planning: 0, 
              sprintReady: 0 
            }
          }
          counts[story.epicId].total++
          
          // Count by status
          switch (story.status) {
            case 'backlog':
              counts[story.epicId].backlog++
              break
            case 'planning':
              counts[story.epicId].planning++
              break
            case 'sprint_ready':
              counts[story.epicId].sprintReady++
              break
          }
        }
      })
      
      setEpicStoryCounts(counts)
    } catch (error) {
      console.error('Error calculating epic story counts:', error)
    }
  }

  useEffect(() => {
    // Subscribe to epics when project is selected
    if (selectedProjectId && selectedProject && user) {
      setLoadingEpics(true)
      
      let unsubscribe: (() => void) | null = null
      
      // First sync all epic statuses to ensure they're up-to-date
      syncAllEpicStatuses(selectedProjectId).then(() => {
        unsubscribe = subscribeToProjectEpics(selectedProjectId, (updatedEpics) => {
          setEpics(updatedEpics)
          setLoadingEpics(false)
          // Calculate story counts after epics are loaded
          calculateEpicStoryCounts(selectedProjectId)
        })
      }).catch(error => {
        console.error('Error syncing epic statuses:', error)
        setLoadingEpics(false)
      })
      
      return () => {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    } else {
      setEpics([])
      setEpicStoryCounts({})
    }
  }, [selectedProjectId, selectedProject, user])

  const fetchProjects = async () => {
    if (!user) return
    
    setLoadingProjects(true)
    try {
      const userProjects = await getProjectsByOwner(user.uid)
      setProjects(userProjects as ProjectWithCount[])
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoadingProjects(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProjectId(projectId)
      setSelectedProject(project)
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/epics?project=${projectId}`)
    }
  }

  const handleCreateEpic = () => {
    setEditingEpic(null)
    setIsCreateModalOpen(true)
  }

  const handleEditEpic = (epic: Epic) => {
    setEditingEpic(epic)
    setIsCreateModalOpen(true)
  }

  const handleDeleteEpic = (epic: Epic) => {
    setEpicToDelete(epic)
    setShowDeleteDialog(true)
  }

  const confirmDeleteEpic = async () => {
    if (!epicToDelete) return
    
    setDeletingEpicId(epicToDelete.id)
    try {
      await deleteEpic(epicToDelete.id)
      // Ensure UI state is reset properly
      setShowDeleteDialog(false)
      setEpicToDelete(null)
      setDeletingEpicId('')
    } catch (error) {
      console.error('Error deleting epic:', error)
      // Reset UI state even on error
      setShowDeleteDialog(false)
      setEpicToDelete(null)
      setDeletingEpicId('')
    }
    
    // Safety timeout to ensure state is always reset
    setTimeout(() => {
      setDeletingEpicId('')
      setShowDeleteDialog(false)
      setEpicToDelete(null)
    }, 100)
  }

  const getStatusIcon = (status: Epic['status']) => {
    switch (status) {
      case 'planning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'active':
        return <Target className="h-4 w-4 text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusBadge = (status: Epic['status']) => {
    const variants = {
      planning: 'secondary',
      active: 'default',
      completed: 'outline'
    } as const
    
    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

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
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Epics</h1>
              <p className="text-muted-foreground mt-1">Organize your project into manageable epics</p>
            </div>
            <Button size="lg" disabled={!selectedProject} onClick={handleCreateEpic}>
              <Plus className="mr-2 h-5 w-5" />
              Create Epic
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
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Epics</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{epics.length}</div>
              <p className="text-xs text-muted-foreground">
                {epics.length === 0 ? "No epics yet" : "Project epics"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Epics</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{epics.filter(e => e.status === 'active').length}</div>
              <p className="text-xs text-muted-foreground">
                {epics.length === 0 ? "No epics yet" : "Currently active"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(epicStoryCounts).reduce((total, counts) => total + counts.total, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all epics
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Planning</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(epicStoryCounts).reduce((total, counts) => total + counts.planning, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Stories ready for estimation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Epics Grid */}
        {loadingEpics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : epics.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-1">No epics yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first epic to organize user stories
              </p>
              <Button onClick={handleCreateEpic}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Epic
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {epics.map((epic) => (
              <Card key={epic.id} className="group hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: epic.color + '20', color: epic.color }}
                      >
                        {epic.icon ? renderIcon(epic.icon, "text-lg") : <FileText className="text-lg" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">{epic.name}</CardTitle>
                        {epic.targetDate && (
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(epic.targetDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditEpic(epic)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/stories?project=${selectedProjectId}&epic=${epic.id}`}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            View Stories
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteEpic(epic)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {epic.description && (
                    <CardDescription className="mb-3 line-clamp-2">
                      {epic.description}
                    </CardDescription>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Stories</span>
                      <span className="text-sm font-medium">
                        {epicStoryCounts[epic.id]?.total || 0} total
                      </span>
                    </div>
                    
                    {/* Story Status Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {epicStoryCounts[epic.id]?.backlog > 0 && (
                        <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          <span className="text-gray-600 dark:text-gray-400">Backlog</span>
                          <span className="font-medium">{epicStoryCounts[epic.id].backlog}</span>
                        </div>
                      )}
                      {epicStoryCounts[epic.id]?.planning > 0 && (
                        <div className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                          <span className="text-blue-600 dark:text-blue-400">Planning</span>
                          <span className="font-medium">{epicStoryCounts[epic.id].planning}</span>
                        </div>
                      )}
                      {epicStoryCounts[epic.id]?.sprintReady > 0 && (
                        <div className="flex items-center justify-between bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                          <span className="text-green-600 dark:text-green-400">Sprint Ready</span>
                          <span className="font-medium">{epicStoryCounts[epic.id].sprintReady}</span>
                        </div>
                      )}
                      
                      {/* Show placeholder when no stories */}
                      {!epicStoryCounts[epic.id] && (
                        <div className="col-span-2 text-center py-2 text-gray-400 text-xs">
                          No stories yet
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-end pt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/stories?project=${selectedProjectId}&epic=${epic.id}`}>
                          View Stories
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => {
                setShowDeleteDialog(false)
                setEpicToDelete(null)
              }}
            />
            
            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 border">
              <h2 className="text-lg font-semibold mb-2">Delete Epic</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete &quot;{epicToDelete?.name}&quot;? 
                This action cannot be undone. All stories in this epic will remain but will no longer be associated with an epic.
              </p>
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteDialog(false)
                    setEpicToDelete(null)
                  }}
                  disabled={!!deletingEpicId}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmDeleteEpic}
                  disabled={!!deletingEpicId}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deletingEpicId ? (
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
        )}

        {/* Create/Edit Epic Modal */}
        {selectedProject && (
          <CreateEpicModal
            open={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}
            projectId={selectedProject.id}
            editingEpic={editingEpic}
          />
        )}
      </main>
    </div>
  )
}

export default function EpicsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>}>
      <EpicsPageContent />
    </Suspense>
  )
}