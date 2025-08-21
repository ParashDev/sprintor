'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getProjectsByOwner } from '@/lib/project-service'
import { getSprintsByProject } from '@/lib/sprint-service'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  Calendar, 
  Users, 
  Target,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  BarChart3,
  Search,
  ExternalLink,
  Copy,
  TrendingUp,
  Activity,
  Timer
} from 'lucide-react'
import type { Sprint } from '@/types/sprint'
import type { Project } from '@/lib/project-service'

export default function SprintsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Load user's projects
  useEffect(() => {
    const loadProjects = async () => {
      if (!user) return

      try {
        const userProjects = await getProjectsByOwner(user.uid)
        setProjects(userProjects)
        
        if (userProjects.length > 0) {
          setSelectedProject(userProjects[0].id)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      }
    }

    loadProjects()
  }, [user])

  // Load sprints when project changes
  useEffect(() => {
    const loadSprints = async () => {
      if (!selectedProject) return

      setIsLoading(true)
      try {
        const projectSprints = await getSprintsByProject(selectedProject)
        setSprints(projectSprints)
      } catch (error) {
        console.error('Error loading sprints:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSprints()
  }, [selectedProject])

  // Filter sprints based on search and status
  const filteredSprints = sprints.filter(sprint => {
    const matchesSearch = sprint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sprint.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || sprint.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Calculate stats for the current project
  const sprintStats = {
    totalSprints: filteredSprints.length,
    activeSprints: filteredSprints.filter(s => s.status === 'active').length,
    completedSprints: filteredSprints.filter(s => s.status === 'completed').length,
    totalStoryPoints: filteredSprints.reduce((sum, s) => sum + s.totalStoryPoints, 0),
    averageVelocity: filteredSprints.length > 0 
      ? Math.round(filteredSprints.reduce((sum, s) => sum + s.totalStoryPoints, 0) / filteredSprints.length)
      : 0,
    completionRate: filteredSprints.length > 0 
      ? Math.round((filteredSprints.filter(s => s.status === 'completed').length / filteredSprints.length) * 100)
      : 0
  }

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
          icon: Clock
        }
      case 'active':
        return { 
          color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
          icon: Play
        }
      case 'completed':
        return { 
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          icon: CheckCircle2
        }
      case 'cancelled':
        return { 
          color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
          icon: Pause
        }
      default:
        return { 
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
          icon: Clock
        }
    }
  }

  // Copy sprint link to clipboard
  const copySprintLink = async (sprintId: string) => {
    const link = `${window.location.origin}/sprint/${sprintId}`
    await navigator.clipboard.writeText(link)
    // You could add a toast notification here
    console.log('Sprint link copied to clipboard')
  }

  // Format dates
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Calculate days remaining
  const getDaysRemaining = (endDate: Date) => {
    const now = new Date()
    const end = new Date(endDate)
    const diffTime = end.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-900 dark:border-slate-100"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Sprint Boards</h1>
              <p className="text-muted-foreground mt-1">Create and manage collaborative sprint planning sessions</p>
            </div>
            <Button 
              size="lg" 
              onClick={() => router.push(`/sprints/create?project=${selectedProject}`)}
              disabled={!selectedProject}
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Sprint
            </Button>
          </div>
          
          {/* Project Selection */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium whitespace-nowrap">Project:</label>
              <div className="w-full sm:min-w-[200px]">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select a project</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {selectedProject && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sprints</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sprintStats.totalSprints}</div>
                <p className="text-xs text-muted-foreground">
                  {sprintStats.totalSprints === 0 ? "No sprints yet" : "Active project sprints"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sprintStats.activeSprints}</div>
                <p className="text-xs text-muted-foreground">
                  {sprintStats.activeSprints === 0 ? "None in progress" : "Currently running"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Velocity</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sprintStats.averageVelocity}</div>
                <p className="text-xs text-muted-foreground">
                  {sprintStats.totalSprints === 0 ? "No data yet" : "Story points per sprint"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sprintStats.completionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {sprintStats.completedSprints === 0 ? "Complete first sprint" : "Sprint completion rate"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters - After Stats Cards */}
        {selectedProject && (
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Search Sprints
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        )}


        {/* Sprint List */}
        {!selectedProject ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Select a Project
            </h3>
            <p className="text-muted-foreground">
              Choose a project to view and manage its sprint boards
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sprints...</p>
          </div>
        ) : filteredSprints.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {sprints.length === 0 ? 'No Sprints Yet' : 'No Matching Sprints'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {sprints.length === 0 
                ? 'Create your first sprint board to start collaborative planning'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {sprints.length === 0 && (
              <Button 
                onClick={() => router.push(`/sprints/create?project=${selectedProject}`)}
              >
                Create Your First Sprint
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSprints.map(sprint => {
              const statusDisplay = getStatusDisplay(sprint.status)
              const StatusIcon = statusDisplay.icon
              const completedStories = sprint.stories.filter(s => s.sprintStatus === 'done').length
              const progressPercentage = sprint.stories.length > 0 
                ? (completedStories / sprint.stories.length) * 100 
                : 0
              const daysRemaining = getDaysRemaining(sprint.endDate)

              return (
                <Card key={sprint.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{sprint.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusDisplay.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                          </span>
                          {daysRemaining > 0 && sprint.status === 'active' && (
                            <span className="text-xs text-muted-foreground">
                              {daysRemaining} days left
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copySprintLink(sprint.id)}
                          title="Copy sprint link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/sprint/${sprint.id}`)}
                          title="Open sprint"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {/* Description */}
                    {sprint.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {sprint.description}
                      </p>
                    )}

                    {/* Sprint Goal */}
                    {sprint.goal && (
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                          <div>
                            <div className="text-xs font-medium text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-1">
                              Sprint Goal
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              {sprint.goal}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {completedStories}/{sprint.stories.length} stories
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                      <div>
                        <div className="text-lg font-semibold">
                          {sprint.stories.length}
                        </div>
                        <div className="text-xs text-muted-foreground">Stories</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {sprint.totalStoryPoints}
                        </div>
                        <div className="text-xs text-muted-foreground">Points</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold">
                          {sprint.duration}
                        </div>
                        <div className="text-xs text-muted-foreground">Days</div>
                      </div>
                    </div>

                    {/* Date and Participants */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(sprint.startDate)} - {formatDate(sprint.endDate)}</span>
                      </div>
                      {sprint.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{sprint.participants.filter(p => p.isActive).length} active</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}