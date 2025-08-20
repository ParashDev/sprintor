"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getSessionsByProject } from "@/lib/session-service"
import { getProjectsByOwner } from "@/lib/project-service"
import { subscribeToProjectEpics } from "@/lib/epic-service"
import { getStoriesByProject } from "@/lib/story-service"
import type { Session } from "@/types/session"
import type { Epic } from "@/types/epic"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
 
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  History, 
  Users, 
  Loader2,
  Target,
  CheckCircle2,
  FileText,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Activity,
  Award,
  AlertCircle,
  Clock
} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

interface Project {
  id: string
  name: string
  companyName: string
}

function PlanningContent() {
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
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null)
  const [loadingEpics, setLoadingEpics] = useState(false)
  
  // Session state
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    storiesInPlanning: 0,
    storiesSprintReady: 0,
    totalStories: 0,
    teamMembers: 0,
    avgEstimationTime: '--'
  })
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [expandedStory, setExpandedStory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'participants' | 'stories'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'ended'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const sessionsPerPage = 5

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
    // Set selected project from URL parameter if provided
    if (urlProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === urlProjectId)
      if (project) {
        setSelectedProjectId(urlProjectId)
        setSelectedProject(project)
      }
    } else if (projects.length > 0 && !selectedProjectId) {
      // Auto-select first project if none selected and update URL
      handleProjectChange(projects[0].id)
    }
  }, [urlProjectId, projects, selectedProjectId])

  useEffect(() => {
    // Subscribe to epics when project is selected (same pattern as Stories page)
    if (selectedProjectId && selectedProject && user) {
      setLoadingEpics(true)
      const unsubscribe = subscribeToProjectEpics(selectedProjectId, (updatedEpics) => {
        setEpics(updatedEpics)
        setLoadingEpics(false)
        
        // Handle epic selection from URL or auto-select first epic
        if (updatedEpics.length > 0) {
          if (urlEpicId) {
            const epic = updatedEpics.find(e => e.id === urlEpicId)
            if (epic) {
              setSelectedEpicId(urlEpicId)
              setSelectedEpic(epic)
            } else {
              // URL epic not found, select first epic
              setSelectedEpicId(updatedEpics[0].id)
              setSelectedEpic(updatedEpics[0])
            }
          } else if (!selectedEpicId) {
            // No URL epic and no current selection, select first epic
            setSelectedEpicId(updatedEpics[0].id)
            setSelectedEpic(updatedEpics[0])
          }
        }
      })
      
      return () => unsubscribe()
    } else {
      setEpics([])
      setSelectedEpicId('')
      setSelectedEpic(null)
    }
  }, [selectedProjectId, selectedProject, user, urlEpicId])

  useEffect(() => {
    // Fetch sessions when project OR epic changes (but only after epics are loaded)
    if (selectedProjectId && selectedProject && user && !loadingEpics && !loadingProjects) {
      fetchSessionData()
    } else if (!selectedProjectId || !selectedProject) {
      setSessions([])
      setStats({
        totalSessions: 0,
        storiesInPlanning: 0,
        storiesSprintReady: 0,
        totalStories: 0,
        teamMembers: 0,
        avgEstimationTime: '--'
      })
    }
  }, [selectedProjectId, selectedProject, selectedEpicId, user, loadingEpics, loadingProjects])

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


  const fetchSessionData = async () => {
    if (!user || !selectedProject) return
    
    setLoadingSessions(true)
    try {
      // Get all sessions for the project
      const projectSessions = await getSessionsByProject(user.uid, selectedProject.id)
      
      // Filter sessions by epic if one is selected
      let filteredSessions = projectSessions
      if (selectedEpicId && selectedEpicId !== 'all') {
        // Sessions that are directly associated with the selected epic
        filteredSessions = projectSessions.filter(session => 
          session.epicId === selectedEpicId
        )
      }
      
      // Calculate epic-specific stats
      const epicStats = await calculateEpicStats(selectedProject.id, selectedEpicId)
      
      setSessions(filteredSessions)
      setStats(epicStats)
    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const calculateEpicStats = async (projectId: string, epicId: string) => {
    try {
      // Get stories for the epic (or all stories if no specific epic selected)
      const stories = await getStoriesByProject(projectId, 
        epicId && epicId !== 'all' ? { epicId } : {}
      )
      
      // Get all sessions for the project
      const allSessions = await getSessionsByProject(user!.uid, projectId)
      
      // Filter sessions that are associated with this epic
      let relevantSessions = allSessions
      if (epicId && epicId !== 'all') {
        relevantSessions = allSessions.filter(session => 
          session.epicId === epicId
        )
      }
      
      // Calculate stats
      const totalSessions = relevantSessions.length
      const storiesInPlanning = stories.filter(s => s.status === 'planning').length
      const storiesSprintReady = stories.filter(s => s.status === 'sprint_ready').length
      
      // Calculate unique participants across relevant sessions
      const allParticipants = new Set()
      relevantSessions.forEach(session => {
        session.participants.forEach(p => allParticipants.add(p.name))
      })
      
      return {
        totalSessions,
        storiesInPlanning,
        storiesSprintReady,
        totalStories: stories.length,
        teamMembers: allParticipants.size,
        avgEstimationTime: '--' // Keep as placeholder for now
      }
    } catch (error) {
      console.error('Error calculating epic stats:', error)
      return {
        totalSessions: 0,
        storiesInPlanning: 0,
        storiesSprintReady: 0,
        totalStories: 0,
        teamMembers: 0,
        avgEstimationTime: '--'
      }
    }
  }

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      // Clear sessions and epics immediately to prevent showing wrong data
      setSessions([])
      setEpics([])
      setSelectedEpicId('')
      setSelectedEpic(null)
      
      // Update state - this will trigger the useEffect to fetch epics and sessions
      setSelectedProjectId(projectId)
      setSelectedProject(project)
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/planning?project=${projectId}`)
    }
  }

  const handleEpicChange = (epicId: string) => {
    const epic = epics.find(e => e.id === epicId)
    setSelectedEpicId(epicId)
    setSelectedEpic(epic || null)
    
    // Update URL with epic parameter
    if (selectedProject) {
      const url = epicId === 'all' || !epicId
        ? `/planning?project=${selectedProject.id}`
        : `/planning?project=${selectedProject.id}&epic=${epicId}`
      window.history.replaceState({}, '', url)
    }
    
    // Refetch sessions with new epic filter
    if (user && selectedProject) {
      fetchSessionData()
    }
  }

  const showSessionDetails = (session: Session) => {
    setSelectedSession(session)
    setShowDetailsModal(true)
  }

  // Filter and sort sessions
  const filteredAndSortedSessions = React.useMemo(() => {
    let filtered = sessions

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(session =>
        session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(session => 
        filterBy === 'active' ? session.isActive : !session.isActive
      )
    }

    // Apply sorting
    filtered = filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'participants':
          comparison = a.participants.length - b.participants.length
          break
        case 'stories':
          comparison = a.stories.length - b.stories.length
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [sessions, searchQuery, filterBy, sortBy, sortOrder])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedSessions.length / sessionsPerPage)
  const startIndex = (currentPage - 1) * sessionsPerPage
  const endIndex = startIndex + sessionsPerPage
  const paginatedSessions = filteredAndSortedSessions.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterBy, sortBy, sortOrder])

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
              <h1 className="text-2xl sm:text-3xl font-bold">Planning Sessions</h1>
              <p className="text-muted-foreground mt-1">Manage estimation sessions for your projects</p>
            </div>
            <Button size="lg" disabled={!selectedProject} asChild>
              <Link href={
                selectedProject && selectedEpicId && selectedEpicId !== 'all' 
                  ? `/create?project=${selectedProject.id}&epic=${selectedEpicId}`
                  : selectedProject 
                    ? `/create?project=${selectedProject.id}` 
                    : "/create"
              }>
                <Plus className="mr-2 h-5 w-5" />
                New Session
              </Link>
            </Button>
          </div>
          
          {/* Project and Epic Selectors */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Project Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium whitespace-nowrap">Project:</label>
              <div className="w-full sm:min-w-[200px]">
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

            {/* Epic Selector */}
            {selectedProject && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <label className="text-sm font-medium whitespace-nowrap">Epic:</label>
                <div className="w-full sm:min-w-[200px]">
                  <Select value={selectedEpicId} onValueChange={handleEpicChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select epic..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <span>All Epics</span>
                      </SelectItem>
                      {epics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: epic.color }}
                            />
                            <span className="truncate">{epic.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({epic.storyCount} stories)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
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

        {/* Epic-Specific Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Epic Stories</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalStories}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalStories === 0 ? "No stories yet" : selectedEpicId ? "In this epic" : "Across all epics"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stories in Planning</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.storiesInPlanning}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.storiesInPlanning === 0 ? "No stories in planning" : "Ready for estimation"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ready for Sprint</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.storiesSprintReady}</div>
              <p className="text-xs text-muted-foreground">
                {stats.storiesSprintReady === 0 ? "No stories ready" : "Sprint-ready stories"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planning Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSessions === 0 ? "No sessions yet" : 
                 selectedEpicId === 'all' ? "All project sessions" : "Epic sessions"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recent" className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="h-12 p-1 text-base">
              <TabsTrigger value="recent" className="px-6 py-2">Recent Sessions</TabsTrigger>
              <TabsTrigger value="templates" className="px-6 py-2">Templates</TabsTrigger>
              <TabsTrigger value="teams" className="px-6 py-2">Teams</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Recent Sessions</CardTitle>
                    <CardDescription>
                      Your recently hosted planning poker sessions
                    </CardDescription>
                  </div>
                  
                  {/* Search, Sort, Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full sm:w-[200px]"
                      />
                    </div>
                    
                    {/* Filter by status */}
                    <Select value={filterBy} onValueChange={(value: 'all' | 'active' | 'ended') => setFilterBy(value)}>
                      <SelectTrigger className="w-full sm:w-[130px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sessions</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Sort */}
                    <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                      const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder]
                      setSortBy(field)
                      setSortOrder(order)
                    }}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="date-desc">Newest First</SelectItem>
                        <SelectItem value="date-asc">Oldest First</SelectItem>
                        <SelectItem value="name-asc">Name A-Z</SelectItem>
                        <SelectItem value="name-desc">Name Z-A</SelectItem>
                        <SelectItem value="participants-desc">Most Participants</SelectItem>
                        <SelectItem value="participants-asc">Least Participants</SelectItem>
                        <SelectItem value="stories-desc">Most Stories</SelectItem>
                        <SelectItem value="stories-asc">Least Stories</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAndSortedSessions.length === 0 ? (
                  searchQuery || filterBy !== 'all' ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-1">No sessions found</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Try adjusting your search or filter criteria
                      </p>
                      <Button variant="outline" onClick={() => {
                        setSearchQuery('')
                        setFilterBy('all')
                        setSortBy('date')
                        setSortOrder('desc')
                      }}>
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <History className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No sessions yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first session to get started with sprint planning
                    </p>
                    <Button asChild>
                      <Link href={
                        selectedProject && selectedEpicId && selectedEpicId !== 'all' 
                          ? `/create?project=${selectedProject.id}&epic=${selectedEpicId}`
                          : selectedProject 
                            ? `/create?project=${selectedProject.id}` 
                            : "/create"
                      }>
                        <Plus className="mr-2 h-4 w-4" />
                        Create First Session
                      </Link>
                    </Button>
                  </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {/* Sessions List */}
                    <div className="space-y-4">
                      {paginatedSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h4 className="font-medium text-base truncate">{session.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full w-fit ${
                              session.isActive 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {session.isActive ? 'Active' : 'Ended'}
                            </span>
                          </div>
                          {session.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{session.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-mono">#{session.id}</span>
                            <span>{session.participants.length} participants</span>
                            <span>{session.stories.length} stories</span>
                            <span>{session.stories.filter(s => s.isEstimated).length} estimated</span>
                            <span>{new Date(session.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:flex-shrink-0">
                          {session.isActive ? (
                            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                              <Link href={`/session/${session.id}`}>
                                Rejoin
                              </Link>
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full sm:w-auto" 
                              onClick={() => showSessionDetails(session)}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedSessions.length)} of {filteredAndSortedSessions.length} sessions
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
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter(page => {
                                // Show first page, last page, current page, and pages around current
                                return page === 1 || 
                                       page === totalPages || 
                                       Math.abs(page - currentPage) <= 1
                              })
                              .map((page, index, array) => {
                                // Add ellipsis between non-consecutive pages
                                const prevPage = array[index - 1]
                                return (
                                  <React.Fragment key={page}>
                                    {prevPage && page - prevPage > 1 && (
                                      <span className="px-2 text-muted-foreground">...</span>
                                    )}
                                    <Button
                                      variant={currentPage === page ? "default" : "outline"}
                                      size="sm"
                                      className="w-9 h-9 p-0"
                                      onClick={() => setCurrentPage(page)}
                                    >
                                      {page}
                                    </Button>
                                  </React.Fragment>
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

          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Session Templates</CardTitle>
                <CardDescription>
                  Save time with pre-configured session templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Session templates will be available in a future update
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Teams</CardTitle>
                <CardDescription>
                  Manage team members and presets for faster session setup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Coming Soon</h3>
                  <p className="text-sm text-muted-foreground">
                    Team management will be available in a future update
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </main>

      {/* Session Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="!max-w-6xl w-full max-h-[90vh] overflow-hidden sm:h-auto">
          <DialogHeader className="pb-4 border-b shrink-0">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-6 mt-3">
                <DialogTitle className="text-lg font-semibold flex-1 min-w-0">{selectedSession?.name}</DialogTitle>
                <Badge 
                  variant={selectedSession?.isActive ? "default" : "secondary"}
                  className="text-xs flex-shrink-0"
                >
                  {selectedSession?.isActive ? "Active" : "Ended"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="px-2 py-1 bg-muted rounded font-mono text-xs">{selectedSession?.id}</span>
                <span>•</span>
                <span className="capitalize">{selectedSession?.deckType} deck</span>
                <span>•</span>
                <span>{selectedSession?.createdAt && new Date(selectedSession.createdAt).toLocaleDateString()}</span>
              </div>
              <DialogDescription className="text-xs mt-2 max-h-32 overflow-y-auto">
                {selectedSession?.description || "View comprehensive metrics, team members, and user stories from this planning session."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {selectedSession && (
            <div className="flex-1 overflow-hidden">
              <div className="h-[70vh] sm:h-[75vh] overflow-y-auto pr-2">
                <div className="space-y-6 pt-6">
              {/* Display comprehensive metrics if available, otherwise show basic stats */}
              {selectedSession.metrics ? (
                <>
                  {/* Rich Metrics Display - Using stored comprehensive metrics */}
                  <div className="space-y-4">
                    {/* Primary Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Total Story Points or Estimated Count */}
                      <div className="text-center p-3 border rounded bg-background">
                        <BarChart3 className="h-4 w-4 text-foreground mx-auto mb-1" />
                        <div className="text-xl font-semibold text-foreground">
                          {selectedSession.metrics.deckTypeUsed === 'fibonacci' || selectedSession.metrics.deckTypeUsed === 'powers' 
                            ? selectedSession.metrics.totalStoryPoints 
                            : selectedSession.metrics.storiesEstimated}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedSession.metrics.deckTypeUsed === 'fibonacci' || selectedSession.metrics.deckTypeUsed === 'powers' 
                            ? 'Total Points' 
                            : 'Stories Estimated'}
                        </div>
                      </div>

                      {/* Average or Most Common */}
                      <div className="text-center p-3 border rounded bg-background">
                        <TrendingUp className="h-4 w-4 text-foreground mx-auto mb-1" />
                        <div className="text-xl font-semibold text-foreground">
                          {selectedSession.metrics.deckTypeUsed === 'fibonacci' || selectedSession.metrics.deckTypeUsed === 'powers'
                            ? selectedSession.metrics.averagePoints.toFixed(1)
                            : selectedSession.metrics.mostCommonEstimate || '—'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedSession.metrics.deckTypeUsed === 'fibonacci' || selectedSession.metrics.deckTypeUsed === 'powers'
                            ? 'Avg Points'
                            : 'Most Common'}
                        </div>
                      </div>

                      {/* Consensus Rate */}
                      <div className="text-center p-3 border rounded bg-background">
                        <Target className="h-4 w-4 text-foreground mx-auto mb-1" />
                        <div className="text-xl font-semibold text-foreground">
                          {selectedSession.metrics.consensusRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">Consensus Rate</div>
                      </div>

                      {/* Duration */}
                      <div className="text-center p-3 border rounded bg-background">
                        <Clock className="h-4 w-4 text-foreground mx-auto mb-1" />
                        <div className="text-xl font-semibold text-foreground">
                          {selectedSession.metrics.sessionDurationMinutes}m
                        </div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                      </div>
                    </div>

                    {/* Secondary Metrics */}
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {/* Participation Rate */}
                      <div className="text-center p-3 border rounded">
                        <Users className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-semibold">{selectedSession.metrics.participationRate}%</div>
                        <div className="text-xs text-muted-foreground">Participation</div>
                      </div>

                      {/* Re-voting Rate */}
                      <div className="text-center p-3 border rounded">
                        <Activity className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-semibold">{selectedSession.metrics.reVotingRate}%</div>
                        <div className="text-xs text-muted-foreground">Re-voting</div>
                      </div>

                      {/* High Variance */}
                      <div className="text-center p-3 border rounded">
                        <AlertCircle className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-semibold">{selectedSession.metrics.highVarianceStories}</div>
                        <div className="text-xs text-muted-foreground">High Variance</div>
                      </div>

                      {/* Voting Rounds */}
                      <div className="text-center p-3 border rounded">
                        <Award className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-semibold">{selectedSession.metrics.totalVotingRounds}</div>
                        <div className="text-xs text-muted-foreground">Total Rounds</div>
                      </div>

                      {/* Unique Participants */}
                      <div className="text-center p-3 border rounded">
                        <Users className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-semibold">{selectedSession.metrics.uniqueParticipants}</div>
                        <div className="text-xs text-muted-foreground">Team Size</div>
                      </div>

                      {/* Avg Votes/Round */}
                      <div className="text-center p-3 border rounded">
                        <BarChart3 className="h-3 w-3 text-muted-foreground mx-auto mb-1" />
                        <div className="text-lg font-semibold">{selectedSession.metrics.averageVotesPerRound.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Votes</div>
                      </div>
                    </div>


                    {/* Story Completion Summary */}
                    <div className="flex items-center justify-between p-4 border rounded bg-muted/30">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-foreground" />
                        <div>
                          <p className="text-sm font-medium">Story Completion</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedSession.metrics.storiesEstimated} of {selectedSession.metrics.storiesEstimated + selectedSession.metrics.storiesNotEstimated} stories estimated
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-foreground">
                          {Math.round((selectedSession.metrics.storiesEstimated / (selectedSession.metrics.storiesEstimated + selectedSession.metrics.storiesNotEstimated)) * 100)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Fallback: Basic stats for sessions without stored metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Total Story Points or Estimated Count */}
                    <div className="text-center p-3 border rounded">
                      <div className="text-xl font-semibold">
                        {(() => {
                          // Only calculate total for numeric decks
                          if (selectedSession.deckType === 'fibonacci' || selectedSession.deckType === 'powers') {
                            const total = selectedSession.stories
                              .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
                              .reduce((sum, s) => {
                                const points = parseFloat(s.estimate || '0')
                                return isNaN(points) ? sum : sum + points
                              }, 0)
                            return total || '0'
                          } else {
                            // For non-numeric decks, show estimated count
                            return selectedSession.stories.filter(s => s.isEstimated).length
                          }
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedSession.deckType === 'fibonacci' || selectedSession.deckType === 'powers' ? 'Total Points' : 'Estimated'}
                      </div>
                    </div>

                    {/* Average Story Size or Most Common */}
                    <div className="text-center p-3 border rounded">
                      <div className="text-xl font-semibold">
                        {(() => {
                          if (selectedSession.deckType === 'fibonacci' || selectedSession.deckType === 'powers') {
                            // For numeric decks, calculate average
                            const estimatedStories = selectedSession.stories.filter(s => 
                              s.isEstimated && s.estimate && s.estimate !== '?' && !isNaN(parseFloat(s.estimate))
                            )
                            if (estimatedStories.length === 0) return '—'
                            const avg = estimatedStories.reduce((sum, s) => sum + parseFloat(s.estimate!), 0) / estimatedStories.length
                            return avg.toFixed(1)
                          } else if (selectedSession.deckType === 'tshirt') {
                            // For T-shirt sizes, show most common size
                            const estimates = selectedSession.stories
                              .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
                              .map(s => s.estimate!)
                            if (estimates.length === 0) return '—'
                            const counts: Record<string, number> = {}
                            estimates.forEach(e => counts[e] = (counts[e] || 0) + 1)
                            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
                            return sorted[0]?.[0] || '—'
                          } else {
                            // For custom decks, show remaining count
                            return selectedSession.stories.filter(s => !s.isEstimated).length
                          }
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {selectedSession.deckType === 'fibonacci' || selectedSession.deckType === 'powers' ? 'Avg Points' : 
                         selectedSession.deckType === 'tshirt' ? 'Most Common' : 'Remaining'}
                      </div>
                    </div>

                    {/* Consensus Rate */}
                    <div className="text-center p-3 border rounded">
                      <div className="text-xl font-semibold">
                        {(() => {
                          const storiesWithVoting = selectedSession.stories.filter(s => s.votingHistory && s.votingHistory.length > 0)
                          if (storiesWithVoting.length === 0) return '—'
                          const firstRoundConsensus = storiesWithVoting.filter(s => s.votingHistory!.length === 1).length
                          return `${Math.round((firstRoundConsensus / storiesWithVoting.length) * 100)}%`
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">First-Round Consensus</div>
                    </div>

                    {/* Session Duration */}
                    <div className="text-center p-3 border rounded">
                      <div className="text-xl font-semibold">
                        {(() => {
                          const sessionStart = selectedSession.createdAt
                          const sessionEnd = selectedSession.updatedAt
                          const diffMs = sessionEnd.getTime() - sessionStart.getTime()
                          const diffMins = Math.floor(diffMs / (1000 * 60))
                          return `${diffMins}m`
                        })()}
                      </div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                  </div>
                </>
              )}

              {/* Participants */}
              <div className="border rounded p-4">
                <h3 className="text-sm font-medium mb-3">Team Members</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedSession.participants.map((participant) => (
                    <div key={participant.id} className="border rounded p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm font-medium truncate">{participant.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {participant.isOnline ? 'Online' : new Date(participant.lastSeen).toLocaleDateString()}
                        </span>
                        {participant.isHost && (
                          <Badge variant="outline" className="text-xs px-1">Host</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stories */}
              <div className="border rounded p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">User Stories</h3>
                  {selectedSession.stories.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedSession.stories.length}
                    </Badge>
                  )}
                </div>
                
                {selectedSession.stories.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {selectedSession.stories.map((story, index) => (
                      <div key={story.id}>
                        <div 
                          className={`border rounded p-3 ${
                            story.votingHistory && story.votingHistory.length > 0 
                              ? 'hover:bg-muted/50 cursor-pointer' 
                              : ''
                          }`}
                          onClick={() => {
                            if (story.votingHistory && story.votingHistory.length > 0) {
                              setExpandedStory(expandedStory === story.id ? null : story.id)
                            }
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 text-xs text-muted-foreground font-mono mt-0.5">
                                  {index + 1}.
                                </span>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium mb-1">
                                    {story.title}
                                  </h4>
                                  {story.description && (
                                    <p className="text-xs text-muted-foreground mb-2">
                                      {story.description}
                                    </p>
                                  )}
                                  {story.votingHistory && story.votingHistory.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                      {story.votingHistory.length} round{story.votingHistory.length !== 1 ? 's' : ''} • Click to view
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <Badge 
                              variant={story.isEstimated ? "default" : "outline"} 
                              className="text-xs shrink-0"
                            >
                              {story.isEstimated ? story.estimate : "—"}
                            </Badge>
                          </div>
                        </div>

                        {/* Expanded voting history */}
                        {expandedStory === story.id && story.votingHistory && story.votingHistory.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <div className="bg-muted/30 rounded-lg p-4">
                              <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <span>Voting History</span>
                                <Badge variant="outline" className="text-xs">
                                  {story.votingHistory.length} round{story.votingHistory.length !== 1 ? 's' : ''}
                                </Badge>
                              </h5>
                              
                              <div className="space-y-3">
                                {story.votingHistory.map((round, roundIndex) => (
                                  <div key={round.id} className="bg-background border rounded-lg p-3">
                                    {/* Round header */}
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono bg-muted rounded px-2 py-1">
                                          #{roundIndex + 1}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {round.timestamp.toLocaleString()}
                                        </span>
                                      </div>
                                      {round.finalEstimate && (
                                        <Badge variant="default" className="text-xs">
                                          {round.finalEstimate}
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Votes grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {Object.entries(round.votes).map(([participantId, vote]) => (
                                        <div key={participantId} className="flex items-center justify-between bg-muted/50 rounded px-3 py-2">
                                          <span className="text-xs font-medium truncate mr-2">
                                            {round.participantNames[participantId] || 'Unknown'}
                                          </span>
                                          <span className="text-xs font-mono bg-background border rounded px-2 py-0.5">
                                            {vote}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    No user stories were added to this session
                  </div>
                )}
              </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PlanningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PlanningContent />
    </Suspense>
  )
}