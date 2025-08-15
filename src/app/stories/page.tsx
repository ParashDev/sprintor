"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getStoriesByProject, getProjectStoryStats } from "@/lib/story-service"
import { getProjectsByOwner } from "@/lib/project-service"
import type { Story } from "@/types/story"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  BookOpen, 
  Users, 
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Bug,
  Zap,
  FlaskConical
} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import CreateStoryModal from "@/components/stories/CreateStoryModal"

interface Project {
  id: string
  name: string
  companyName: string
}

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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'priority' | 'points'>('updated')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const storiesPerPage = 10
  
  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

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

  // Filter and sort stories
  const filteredAndSortedStories = React.useMemo(() => {
    let filtered = stories

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(story =>
        story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.asA?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        story.labels.some(label => label.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(story => story.status === statusFilter)
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(story => story.type === typeFilter)
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(story => story.priority === priorityFilter)
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'priority':
          const priorityOrder = { 'Must Have': 4, 'Should Have': 3, 'Could Have': 2, 'Won\'t Have': 1 }
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0)
          break
        case 'points':
          comparison = (a.storyPoints || 0) - (b.storyPoints || 0)
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [stories, searchQuery, statusFilter, typeFilter, priorityFilter, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStories.length / storiesPerPage)
  const startIndex = (currentPage - 1) * storiesPerPage
  const endIndex = startIndex + storiesPerPage
  const paginatedStories = filteredAndSortedStories.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, typeFilter, priorityFilter, sortBy, sortOrder])

  const getStatusColor = (status: string) => {
    const colors = {
      'backlog': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      'ready': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
      'in_progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      'review': 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
      'testing': 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
      'done': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300',
      'rejected': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
    }
    return colors[status as keyof typeof colors] || colors.backlog
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      'story': FileText,
      'epic': Target,
      'task': Zap,
      'bug': Bug,
      'spike': FlaskConical
    }
    const Icon = icons[type as keyof typeof icons] || FileText
    return <Icon className="h-4 w-4" />
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      'Must Have': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300',
      'Should Have': 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
      'Could Have': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300',
      'Won\'t Have': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
    return colors[priority as keyof typeof colors] || colors['Could Have']
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">User Stories & Epics</h1>
              <p className="text-muted-foreground mt-1">Manage your project backlog and requirements</p>
            </div>
            <Button size="lg" disabled={!selectedProject} onClick={handleOpenCreateModal}>
              <Plus className="mr-2 h-5 w-5" />
              Create Story
            </Button>
          </div>
          
          {/* Project Selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Project:</label>
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
              <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStories}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalStories === 0 ? "No stories yet" : "Stories in backlog"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.storiesByStatus?.done || 0} of {stats.totalStories} complete
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Story Points</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageStoryPoints.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Average estimation size
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.storiesByStatus?.in_progress || 0}</div>
              <p className="text-xs text-muted-foreground">
                Currently being worked on
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="stories" className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="h-12 p-1 text-base">
              <TabsTrigger value="stories" className="px-6 py-2">All Stories</TabsTrigger>
              <TabsTrigger value="epics" className="px-6 py-2">Epics</TabsTrigger>
              <TabsTrigger value="backlog" className="px-6 py-2">Backlog</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stories" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>User Stories</CardTitle>
                    <CardDescription>
                      All stories and requirements for the selected project
                    </CardDescription>
                  </div>
                  
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search stories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full sm:w-[200px]"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[120px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="backlog">Backlog</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="testing">Testing</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="task">Task</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                        <SelectItem value="spike">Spike</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                      const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder]
                      setSortBy(field)
                      setSortOrder(order)
                    }}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated-desc">Recently Updated</SelectItem>
                        <SelectItem value="created-desc">Recently Created</SelectItem>
                        <SelectItem value="priority-desc">High Priority</SelectItem>
                        <SelectItem value="points-desc">Most Points</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingStories ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAndSortedStories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No stories yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first user story to get started with project planning
                    </p>
                    <Button onClick={handleOpenCreateModal}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create First Story
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Stories List */}
                    <div className="space-y-4">
                      {paginatedStories.map((story) => (
                        <div
                          key={story.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {getTypeIcon(story.type)}
                                <h4 className="font-medium text-base truncate">{story.title}</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`text-xs ${getStatusColor(story.status)}`}>
                                  {story.status.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className={`text-xs ${getPriorityColor(story.priority)}`}>
                                  {story.priority}
                                </Badge>
                                {story.storyPoints && (
                                  <Badge variant="secondary" className="text-xs">
                                    {story.storyPoints} pts
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {story.description && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{story.description}</p>
                            )}
                            {story.asA && (
                              <p className="text-xs text-muted-foreground mb-2">
                                As a <strong>{story.asA}</strong>, I want {story.iWant} so that {story.soThat}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="font-mono">#{story.id.slice(-8)}</span>
                              {story.assignedTo && <span>Assigned to {story.assignedTo}</span>}
                              <span>{story.acceptanceCriteria.length} AC</span>
                              <span>{story.labels.length} labels</span>
                              <span>{new Date(story.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:flex-shrink-0">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedStories.length)} of {filteredAndSortedStories.length} stories
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                              const page = i + 1
                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  className="w-9 h-9 p-0"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </Button>
                              )
                            })}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="epics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Epics</CardTitle>
                <CardDescription>
                  Large features and initiatives spanning multiple stories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No epics yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create epics to organize large features and track progress
                  </p>
                  <Button onClick={handleOpenCreateModal}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Epic
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backlog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Backlog</CardTitle>
                <CardDescription>
                  Prioritized list of stories ready for planning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Backlog view coming soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop prioritization and backlog management
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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