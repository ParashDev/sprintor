"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getProjectsByOwner } from "@/lib/project-service"
import { getEpicsByProject } from "@/lib/epic-service"
import { getStoriesByProject, getProjectStoryStats } from "@/lib/story-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BarChart3,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  Activity,
  Users,
  Rocket,
  FileText,
  Calendar,
  Loader2,
  Plus,
  Building2,
  BookOpen,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

// Helper function to get status color
function getStatusColor(status: string): string {
  switch (status) {
    case 'backlog': return 'text-gray-600 dark:text-gray-400'
    case 'planning': return 'text-blue-600 dark:text-blue-400'
    case 'sprint_ready': return 'text-green-600 dark:text-green-400'
    default: return 'text-gray-600 dark:text-gray-400'
  }
}

// Helper function to get status label
function getStatusLabel(status: string): string {
  switch (status) {
    case 'backlog': return 'Backlog'
    case 'planning': return 'Planning'
    case 'sprint_ready': return 'Sprint Ready'
    default: return status
  }
}

// Helper function to format days remaining
function formatDaysRemaining(days: number, isOverdue: boolean): { text: string; color: string } {
  if (isOverdue) {
    const overdueDays = Math.abs(days)
    return {
      text: overdueDays === 1 ? '1 day overdue' : `${overdueDays} days overdue`,
      color: 'text-red-600 dark:text-red-400'
    }
  } else if (days === 0) {
    return {
      text: 'Due today',
      color: 'text-orange-600 dark:text-orange-400'
    }
  } else if (days === 1) {
    return {
      text: '1 day left',
      color: 'text-orange-600 dark:text-orange-400'
    }
  } else if (days <= 7) {
    return {
      text: `${days} days left`,
      color: 'text-yellow-600 dark:text-yellow-400'
    }
  } else {
    return {
      text: `${days} days left`,
      color: 'text-green-600 dark:text-green-400'
    }
  }
}

interface DashboardProject {
  id: string
  name: string
  description: string
  companyName: string
  epicsCount: number
  storiesCount: number
  storiesInPlanning: number
  storiesSprintReady: number
  completionRate: number
  lastActivity: Date
}

interface EpicWithDeadline {
  id: string
  name: string
  projectName: string
  targetDate: Date
  status: 'planning' | 'active' | 'completed'
  color: string
  daysRemaining: number
  isOverdue: boolean
}

interface ProjectStats {
  totalProjects: number
  activeProjects: number
  totalEpics: number
  activeEpics: number
  totalStories: number
  storiesInPlanning: number
  storiesSprintReady: number
  overallVelocity: number
  sprintReadiness: number
}

interface RecentStory {
  id: string
  title: string
  status: 'backlog' | 'planning' | 'sprint_ready'
  updatedAt: Date
  projectName: string
  epicId?: string
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  // State
  const [projects, setProjects] = useState<DashboardProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    totalEpics: 0,
    activeEpics: 0,
    totalStories: 0,
    storiesInPlanning: 0,
    storiesSprintReady: 0,
    overallVelocity: 0,
    sprintReadiness: 0
  })
  const [recentStories, setRecentStories] = useState<RecentStory[]>([])
  const [epicsWithDeadlines, setEpicsWithDeadlines] = useState<EpicWithDeadline[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user && !loading) {
      fetchDashboardData()
    }
  }, [user, loading])

  const fetchDashboardData = async () => {
    if (!user) return
    
    setLoadingData(true)
    try {
      const userProjects = await getProjectsByOwner(user.uid)
      const dashboardProjects: DashboardProject[] = []
      const allRecentStories: RecentStory[] = []
      const allEpicsWithDeadlines: EpicWithDeadline[] = []
      
      let totalEpics = 0
      let activeEpics = 0
      let totalStories = 0
      let totalStoriesInPlanning = 0
      let totalStoriesSprintReady = 0

      for (const project of userProjects) {
        // Get epics for this project
        const epics = await getEpicsByProject(project.id)
        const activeEpicsCount = epics.filter(e => e.status === 'active').length
        
        // Collect epics with target dates
        epics.forEach(epic => {
          if (epic.targetDate) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const targetDate = new Date(epic.targetDate)
            targetDate.setHours(0, 0, 0, 0)
            const diffTime = targetDate.getTime() - today.getTime()
            const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            allEpicsWithDeadlines.push({
              id: epic.id,
              name: epic.name,
              projectName: project.name,
              targetDate: epic.targetDate,
              status: epic.status,
              color: epic.color,
              daysRemaining,
              isOverdue: daysRemaining < 0
            })
          }
        })
        
        // Get story stats for this project
        const storyStats = await getProjectStoryStats(project.id)
        const storiesInPlanning = storyStats.storiesByStatus?.planning || 0
        const storiesSprintReady = storyStats.storiesByStatus?.sprint_ready || 0
        
        // Get recent stories for this project (last 10, we'll trim later)
        const projectStories = await getStoriesByProject(project.id, { limitCount: 10 })
        const recentProjectStories = projectStories.map(story => ({
          id: story.id,
          title: story.title,
          status: story.status,
          updatedAt: story.updatedAt,
          projectName: project.name,
          epicId: story.epicId
        }))
        allRecentStories.push(...recentProjectStories)
        
        totalEpics += epics.length
        activeEpics += activeEpicsCount
        totalStories += storyStats.totalStories
        totalStoriesInPlanning += storiesInPlanning
        totalStoriesSprintReady += storiesSprintReady

        dashboardProjects.push({
          id: project.id,
          name: project.name,
          description: project.description,
          companyName: project.companyName,
          epicsCount: epics.length,
          storiesCount: storyStats.totalStories,
          storiesInPlanning,
          storiesSprintReady,
          completionRate: storyStats.completionRate,
          lastActivity: project.updatedAt
        })
      }

      // Sort all stories by updatedAt and take the most recent 7
      const sortedRecentStories = allRecentStories
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 7)

      // Sort epics by urgency (overdue first, then by days remaining)
      const sortedEpicsWithDeadlines = allEpicsWithDeadlines
        .sort((a, b) => {
          // Overdue epics first
          if (a.isOverdue && !b.isOverdue) return -1
          if (!a.isOverdue && b.isOverdue) return 1
          // Then by days remaining (most urgent first)
          return a.daysRemaining - b.daysRemaining
        })
        .slice(0, 6) // Show top 6 most urgent

      // Calculate overall stats
      const overallVelocity = Math.round((totalStoriesSprintReady / Math.max(totalStories, 1)) * 100)
      const sprintReadiness = Math.round((totalStoriesInPlanning / Math.max(totalStories, 1)) * 100)

      setProjects(dashboardProjects)
      setRecentStories(sortedRecentStories)
      setEpicsWithDeadlines(sortedEpicsWithDeadlines)
      setStats({
        totalProjects: userProjects.length,
        activeProjects: dashboardProjects.filter(p => p.storiesInPlanning > 0 || p.storiesSprintReady > 0).length,
        totalEpics,
        activeEpics,
        totalStories,
        storiesInPlanning: totalStoriesInPlanning,
        storiesSprintReady: totalStoriesSprintReady,
        overallVelocity,
        sprintReadiness
      })
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingData(false)
    }
  }

  // Filter projects based on selection
  const filteredProjects = selectedProjectId === 'all' 
    ? projects 
    : projects.filter(p => p.id === selectedProjectId)

  // Filter recent stories based on project selection
  const filteredRecentStories = selectedProjectId === 'all'
    ? recentStories
    : recentStories.filter(story => {
        const project = projects.find(p => p.name === story.projectName)
        return project?.id === selectedProjectId
      })

  // Filter epics with deadlines based on project selection
  const filteredEpicsWithDeadlines = selectedProjectId === 'all'
    ? epicsWithDeadlines
    : epicsWithDeadlines.filter(epic => {
        const project = projects.find(p => p.name === epic.projectName)
        return project?.id === selectedProjectId
      })

  // Calculate filtered stats
  const filteredStats = React.useMemo(() => {
    if (selectedProjectId === 'all') return stats
    
    const project = projects.find(p => p.id === selectedProjectId)
    if (!project) return stats
    
    return {
      totalProjects: 1,
      activeProjects: (project.storiesInPlanning > 0 || project.storiesSprintReady > 0) ? 1 : 0,
      totalEpics: project.epicsCount,
      activeEpics: project.epicsCount, // Simplified
      totalStories: project.storiesCount,
      storiesInPlanning: project.storiesInPlanning,
      storiesSprintReady: project.storiesSprintReady,
      overallVelocity: Math.round((project.storiesSprintReady / Math.max(project.storiesCount, 1)) * 100),
      sprintReadiness: Math.round((project.storiesInPlanning / Math.max(project.storiesCount, 1)) * 100)
    }
  }, [selectedProjectId, projects, stats])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Project Management Dashboard</h1>
            <p className="text-muted-foreground mt-1">Project overview and team productivity insights</p>
          </div>
        </div>

        {/* Project Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">View:</label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select view..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingData ? '--' : filteredStats.activeProjects}</div>
              <p className="text-xs text-muted-foreground">
                of {filteredStats.totalProjects} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sprint Ready</CardTitle>
              <Rocket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingData ? '--' : filteredStats.storiesSprintReady}</div>
              <p className="text-xs text-muted-foreground">
                {filteredStats.overallVelocity}% of stories
              </p>
              <Progress value={filteredStats.overallVelocity} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Planning</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingData ? '--' : filteredStats.storiesInPlanning}</div>
              <p className="text-xs text-muted-foreground">
                Ready for estimation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stories</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingData ? '--' : filteredStats.totalStories}</div>
              <p className="text-xs text-muted-foreground">
                Across {filteredStats.totalEpics} epics
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Story Flow Visualization */}
        <div className="grid gap-6 lg:grid-cols-3 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Story Flow Pipeline
              </CardTitle>
              <CardDescription>
                Story progression through your workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Visual Pipeline */}
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      {/* Backlog */}
                      <div className="text-center relative z-10">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                          <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="text-sm font-medium">Backlog</div>
                        <div className="text-2xl font-bold text-gray-600">
                          {filteredStats.totalStories - filteredStats.storiesInPlanning - filteredStats.storiesSprintReady}
                        </div>
                      </div>
                      
                      {/* Planning */}
                      <div className="text-center relative z-10">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                          <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-sm font-medium">Planning</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {filteredStats.storiesInPlanning}
                        </div>
                      </div>
                      
                      {/* Sprint Ready */}
                      <div className="text-center relative z-10">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                          <Rocket className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-sm font-medium">Sprint Ready</div>
                        <div className="text-2xl font-bold text-green-600">
                          {filteredStats.storiesSprintReady}
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Lines */}
                    <div className="absolute top-8 left-0 right-0 flex items-center justify-between px-8">
                      {/* First progress line */}
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative mx-4">
                        <div 
                          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (filteredStats.storiesInPlanning / Math.max(filteredStats.totalStories, 1)) * 100 * 3)}%` }}
                        ></div>
                      </div>
                      
                      {/* Second progress line */}
                      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full relative mx-4">
                        <div 
                          className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (filteredStats.storiesSprintReady / Math.max(filteredStats.totalStories, 1)) * 100 * 2)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Flow Metrics */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Flow Efficiency</div>
                      <div className="text-lg font-semibold">
                        {Math.round((filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) * 100)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Sprint Readiness</div>
                      <div className="text-lg font-semibold">
                        {filteredStats.overallVelocity}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground">Planning Queue</div>
                      <div className="text-lg font-semibold">
                        {filteredStats.sprintReadiness}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Flow Health Indicators */}
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Flow Health</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${filteredStats.storiesInPlanning > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                          <span>Planning Active</span>
                        </div>
                        <span className={filteredStats.storiesInPlanning > 0 ? 'text-blue-600 font-medium' : 'text-muted-foreground'}>
                          {filteredStats.storiesInPlanning > 0 ? 'Yes' : 'No'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${filteredStats.storiesSprintReady > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span>Sprint Queue</span>
                        </div>
                        <span className={filteredStats.storiesSprintReady > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {filteredStats.storiesSprintReady > 0 ? 'Ready' : 'Empty'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            filteredStats.overallVelocity >= 30 ? 'bg-green-500' : 
                            filteredStats.overallVelocity >= 15 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span>Velocity</span>
                        </div>
                        <span className={`font-medium ${
                          filteredStats.overallVelocity >= 30 ? 'text-green-600' : 
                          filteredStats.overallVelocity >= 15 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {filteredStats.overallVelocity >= 30 ? 'Good' : 
                           filteredStats.overallVelocity >= 15 ? 'Fair' : 'Low'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            (filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) >= 0.5 ? 'bg-green-500' : 
                            (filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) >= 0.25 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span>Backlog Health</span>
                        </div>
                        <span className={`font-medium ${
                          (filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) >= 0.5 ? 'text-green-600' : 
                          (filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) >= 0.25 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) >= 0.5 ? 'Healthy' : 
                           (filteredStats.storiesInPlanning + filteredStats.storiesSprintReady) / Math.max(filteredStats.totalStories, 1) >= 0.25 ? 'Fair' : 'Needs Work'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Stories */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Stories
              </CardTitle>
              <CardDescription>
                Recently updated stories
                {selectedProjectId !== 'all' && (
                  <span> in {projects.find(p => p.id === selectedProjectId)?.name}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredRecentStories.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <div className="text-sm text-muted-foreground">
                    No recent stories
                    {selectedProjectId !== 'all' && ' in this project'}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRecentStories.map((story) => (
                    <div key={story.id} className="flex items-start justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{story.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-medium ${getStatusColor(story.status)}`}>
                            {getStatusLabel(story.status)}
                          </span>
                          {selectedProjectId === 'all' && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {story.projectName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {getRelativeTime(story.updatedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Remaining Section */}
        {filteredEpicsWithDeadlines.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Time Remaining
              </CardTitle>
              <CardDescription>
                Epic deadlines and time remaining
                {selectedProjectId !== 'all' && (
                  <span> in {projects.find(p => p.id === selectedProjectId)?.name}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEpicsWithDeadlines.map((epic) => {
                    const { text, color } = formatDaysRemaining(epic.daysRemaining, epic.isOverdue)
                    return (
                      <div key={epic.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div 
                            className="w-8 h-8 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                            style={{ backgroundColor: epic.color + '20', color: epic.color }}
                          >
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm truncate">{epic.name}</div>
                            {selectedProjectId === 'all' && (
                              <div className="text-xs text-muted-foreground truncate">{epic.projectName}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-sm font-medium ${color}`}>
                            {text}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {epic.targetDate.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Project Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Project Portfolio
            </CardTitle>
            <CardDescription>
              Overview of all projects and their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first project to get started with story management
                </p>
                <Button asChild>
                  <Link href="/projects">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{project.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{project.completionRate.toFixed(0)}% Ready</div>
                        <div className="text-xs text-muted-foreground">
                          Updated {new Date(project.lastActivity).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{project.epicsCount}</div>
                        <div className="text-xs text-muted-foreground">Epics</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold">{project.storiesCount}</div>
                        <div className="text-xs text-muted-foreground">Stories</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{project.storiesInPlanning}</div>
                        <div className="text-xs text-muted-foreground">Planning</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{project.storiesSprintReady}</div>
                        <div className="text-xs text-muted-foreground">Sprint Ready</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={(project.storiesSprintReady / Math.max(project.storiesCount, 1)) * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sprint Ready Progress</span>
                        <span>{Math.round((project.storiesSprintReady / Math.max(project.storiesCount, 1)) * 100)}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {/* Mobile: Show only 2 most important buttons */}
                      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-initial">
                        <Link href={`/stories?project=${project.id}`}>
                          <span className="sm:hidden">Stories</span>
                          <span className="hidden sm:inline">Manage Stories</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="flex-1 sm:flex-initial">
                        <Link href={`/planning?project=${project.id}`}>
                          <span className="sm:hidden">Estimate</span>
                          <span className="hidden sm:inline">Estimate Stories</span>
                        </Link>
                      </Button>
                      {/* Desktop: Show third button */}
                      <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                        <Link href={`/epics?project=${project.id}`}>
                          View Epics
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}