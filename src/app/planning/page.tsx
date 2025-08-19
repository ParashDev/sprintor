"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getSessionsByProject, getProjectSessionStats } from "@/lib/session-service"
import { getProjectsByOwner } from "@/lib/project-service"
import type { Session } from "@/types/session"
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
 
  FileText,
  Calendar,
  TrendingUp,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
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
  
  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Session state
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    storiesEstimated: 0,
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
    // Fetch sessions when project is selected (only for initial loads and URL changes)
    if (selectedProjectId && selectedProject && user && !loadingSessions) {
      fetchSessionData()
    } else if (!selectedProjectId || !selectedProject) {
      setSessions([])
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

  const fetchSessionData = async () => {
    if (!user || !selectedProject) return
    
    setLoadingSessions(true)
    try {
      // Get sessions and stats for the selected project only
      const [projectSessions, projectStats] = await Promise.all([
        getSessionsByProject(user.uid, selectedProject.id),
        getProjectSessionStats(user.uid, selectedProject.id)
      ])
      
      setSessions(projectSessions)
      setStats(projectStats)
    } catch (error) {
      console.error('Error fetching session data:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  const handleProjectChange = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      // Clear sessions immediately to prevent showing wrong sessions
      setSessions([])
      setLoadingSessions(true)
      
      setSelectedProjectId(projectId)
      setSelectedProject(project)
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/planning?project=${projectId}`)
      
      // Immediately fetch sessions for the new project
      if (user) {
        try {
          const [projectSessions, projectStats] = await Promise.all([
            getSessionsByProject(user.uid, projectId),
            getProjectSessionStats(user.uid, projectId)
          ])
          
          setSessions(projectSessions)
          setStats(projectStats)
        } catch (error) {
          console.error('Error fetching session data:', error)
        } finally {
          setLoadingSessions(false)
        }
      }
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
              <Link href={selectedProject ? `/create?project=${selectedProject.id}` : "/create"}>
                <Plus className="mr-2 h-5 w-5" />
                New Session
              </Link>
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
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalSessions === 0 ? "No sessions yet" : "Sessions hosted"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stories Estimated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.storiesEstimated}</div>
              <p className="text-xs text-muted-foreground">
                {stats.storiesEstimated === 0 ? "Start your first session" : "Stories completed"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.teamMembers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.teamMembers === 0 ? "Invite your team" : "Unique participants"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Estimation Time</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgEstimationTime}</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgEstimationTime === '--' ? "No data yet" : "Minutes per story"}
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
                      <Link href={selectedProject ? `/create?project=${selectedProject.id}` : "/create"}>
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
        <DialogContent className="!max-w-4xl w-full">
          <DialogHeader className="pb-4 border-b">
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
              {selectedSession?.description && (
                <DialogDescription className="text-xs mt-2 max-h-32 overflow-y-auto">
                  {selectedSession.description}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-6 pt-6">
              {/* Sprint Planning Insights Stats */}
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

              {/* Participants */}
              <div className="border rounded p-4">
                <h3 className="text-sm font-medium mb-3">Team Members</h3>
                <div className="space-y-2">
                  {selectedSession.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between py-2 px-3 border rounded hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <span className="text-sm font-medium">{participant.name}</span>
                        {participant.isHost && (
                          <Badge variant="outline" className="text-xs px-1">Host</Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {participant.isOnline ? 'Online' : new Date(participant.lastSeen).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stories */}
              <div className="border rounded p-4">
                <h3 className="text-sm font-medium mb-3">User Stories</h3>
                {selectedSession.stories.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedSession.stories.map((story) => (
                      <div key={story.id}>
                        <div 
                          className={`flex items-start justify-between gap-4 p-3 border rounded cursor-pointer transition-all ${
                            story.votingHistory && story.votingHistory.length > 0 ? 'hover:border-slate-300 dark:hover:border-slate-600' : ''
                          }`}
                          onClick={() => {
                            if (story.votingHistory && story.votingHistory.length > 0) {
                              setExpandedStory(expandedStory === story.id ? null : story.id)
                            }
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium">{story.title}</h4>
                            {story.description && (
                              <p className="text-xs text-muted-foreground mt-1">{story.description}</p>
                            )}
                            {story.votingHistory && story.votingHistory.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {story.votingHistory.length} voting round{story.votingHistory.length !== 1 ? 's' : ''} • Click to view
                              </p>
                            )}
                          </div>
                          <Badge variant={story.isEstimated ? "default" : "outline"} className="shrink-0 text-xs">
                            {story.isEstimated ? story.estimate : "—"}
                          </Badge>
                        </div>

                        {/* Expanded voting history */}
                        {expandedStory === story.id && story.votingHistory && story.votingHistory.length > 0 && (
                          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                            <h5 className="font-medium mb-2 text-xs">Voting History</h5>
                            <div className="space-y-2">
                              {story.votingHistory.map((round, index) => (
                                <div key={round.id} className="bg-white dark:bg-slate-800 rounded p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      Round {index + 1} • {round.timestamp.toLocaleString()}
                                    </span>
                                    {round.finalEstimate && (
                                      <Badge variant="secondary" className="text-xs">
                                        Final: {round.finalEstimate}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(round.votes).map(([participantId, vote]) => (
                                      <div key={participantId} className="flex items-center gap-1 text-xs">
                                        <span className="text-muted-foreground">
                                          {round.participantNames[participantId] || 'Unknown'}:
                                        </span>
                                        <span className="font-mono text-xs">{vote}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No user stories were added to this session
                  </div>
                )}
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