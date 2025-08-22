"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getProjectsByOwner } from "@/lib/project-service"
import { getEpicsByProject } from "@/lib/epic-service"
import { getStoriesByProject, getProjectStoryStats } from "@/lib/story-service"
import { getSprintsByProject } from "@/lib/sprint-service"
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
    case 'completed': return 'text-purple-600 dark:text-purple-400'
    default: return 'text-gray-600 dark:text-gray-400'
  }
}

// Helper function to get status label
function getStatusLabel(status: string): string {
  switch (status) {
    case 'backlog': return 'Backlog'
    case 'planning': return 'Planning'
    case 'sprint_ready': return 'Sprint Ready'
    case 'completed': return 'Completed'
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
  storiesCompleted: number
  activeSprints: number
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
  storiesCompleted: number
  activeSprints: number
  completionRate: number
  overallVelocity: number
  sprintReadiness: number
}

interface RecentStory {
  id: string
  title: string
  status: 'backlog' | 'planning' | 'sprint_ready' | 'completed'
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
    storiesCompleted: 0,
    activeSprints: 0,
    completionRate: 0,
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
      let totalStoriesCompleted = 0
      let totalActiveSprints = 0

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
        const storiesCompleted = storyStats.storiesByStatus?.completed || 0
        
        // Get sprint data for this project
        const projectSprints = await getSprintsByProject(project.id, 10)
        const activeSprints = projectSprints.filter(sprint => sprint.status === 'active').length
        
        // Get recent stories for this project (last 20, we'll trim later)
        const projectStories = await getStoriesByProject(project.id, { limitCount: 20 })
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
        totalStoriesCompleted += storiesCompleted
        totalActiveSprints += activeSprints

        dashboardProjects.push({
          id: project.id,
          name: project.name,
          description: project.description,
          companyName: project.companyName,
          epicsCount: epics.length,
          storiesCount: storyStats.totalStories,
          storiesInPlanning,
          storiesSprintReady,
          storiesCompleted,
          activeSprints,
          completionRate: storyStats.totalStories > 0 ? parseFloat(((storiesCompleted / storyStats.totalStories) * 100).toFixed(2)) : 0,
          lastActivity: project.updatedAt
        })
      }

      // Sort all stories by updatedAt and take the most recent 5
      const sortedRecentStories = allRecentStories
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)

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
        storiesCompleted: totalStoriesCompleted,
        activeSprints: totalActiveSprints,
        completionRate: totalStories > 0 ? parseFloat(((totalStoriesCompleted / totalStories) * 100).toFixed(2)) : 0,
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
    ? recentStories.slice(0, 5)
    : recentStories.filter(story => {
        const project = projects.find(p => p.name === story.projectName)
        return project?.id === selectedProjectId
      }).slice(0, 5)

  // Filter epics with deadlines based on project selection
  const filteredEpicsWithDeadlines = selectedProjectId === 'all'
    ? epicsWithDeadlines
    : epicsWithDeadlines.filter(epic => {
        const project = projects.find(p => p.name === epic.projectName)
        return project?.id === selectedProjectId
      })

  // Create epic breakdown data (only for single project view)
  const [epicBreakdownData, setEpicBreakdownData] = useState<Array<{
    id: string
    name: string
    color: string
    status: string
    storiesCount: number
    backlogCount: number
    planningCount: number
    sprintReadyCount: number
    completedCount: number
    completionRate: number
  }>>([])

  const [sprintInsights, setSprintInsights] = useState<Array<{
    projectId: string
    projectName: string
    totalSprints: number
    completedSprints: number
    activeSprints: number
    totalStoriesCompleted: number
    totalStoriesPushedBack: number
    averageCompletionRate: number
    sprintSuccessRate: number
    recentSprintPerformance: 'improving' | 'declining' | 'stable'
  }>>([])

  // Fetch epic breakdown data when project selection changes
  useEffect(() => {
    const fetchEpicBreakdown = async () => {
      if (selectedProjectId === 'all' || !user) {
        setEpicBreakdownData([])
        return
      }

      try {
        const epics = await getEpicsByProject(selectedProjectId)
        const breakdownData = await Promise.all(
          epics.map(async (epic) => {
            // Get all stories for this epic
            const epicStories = await getStoriesByProject(selectedProjectId, {
              epicId: epic.id
            })

            // Count stories by status
            const backlogCount = epicStories.filter(s => s.status === 'backlog').length
            const planningCount = epicStories.filter(s => s.status === 'planning').length
            const sprintReadyCount = epicStories.filter(s => s.status === 'sprint_ready').length
            const completedCount = epicStories.filter(s => s.status === 'completed').length
            const storiesCount = epicStories.length

            // Calculate completion rate
            const completionRate = storiesCount > 0 ? (completedCount / storiesCount) * 100 : 0

            return {
              id: epic.id,
              name: epic.name,
              color: epic.color,
              status: epic.status,
              storiesCount,
              backlogCount,
              planningCount,
              sprintReadyCount,
              completedCount,
              completionRate
            }
          })
        )

        setEpicBreakdownData(breakdownData)
      } catch (error) {
        console.error('Error fetching epic breakdown:', error)
        setEpicBreakdownData([])
      }
    }

    fetchEpicBreakdown()
  }, [selectedProjectId, user])

  // Fetch sprint insights data
  useEffect(() => {
    const fetchSprintInsights = async () => {
      if (!user) {
        setSprintInsights([])
        return
      }

      try {
        const projectsToAnalyze = selectedProjectId === 'all' ? projects : projects.filter(p => p.id === selectedProjectId)
        
        const insights = await Promise.all(
          projectsToAnalyze.map(async (project) => {
            // Get all sprints for this project
            const allSprints = await getSprintsByProject(project.id, 100) // Get more for analysis
            
            const completedSprints = allSprints.filter(s => s.status === 'completed')
            const activeSprints = allSprints.filter(s => s.status === 'active')
            
            // Calculate story completion stats from completed sprints
            let totalStoriesCompleted = 0
            let totalStoriesPushedBack = 0
            let sprintCompletionRates: number[] = []
            let fullySuccessfulSprints = 0
            
            completedSprints.forEach(sprint => {
              const completedInSprint = sprint.stories.filter(s => s.sprintStatus === 'done').length
              const totalInSprint = sprint.stories.length
              const pushedBack = totalInSprint - completedInSprint
              
              totalStoriesCompleted += completedInSprint
              totalStoriesPushedBack += pushedBack
              
              if (totalInSprint > 0) {
                const completionRate = (completedInSprint / totalInSprint) * 100
                sprintCompletionRates.push(completionRate)
                
                // Count sprints with 100% completion as fully successful
                if (completionRate === 100) {
                  fullySuccessfulSprints++
                }
              }
            })
            
            const averageCompletionRate = sprintCompletionRates.length > 0 
              ? parseFloat((sprintCompletionRates.reduce((a, b) => a + b, 0) / sprintCompletionRates.length).toFixed(1))
              : 0
            
            const sprintSuccessRate = completedSprints.length > 0 
              ? parseFloat(((fullySuccessfulSprints / completedSprints.length) * 100).toFixed(1))
              : 0
            
            // Analyze recent performance trend (last 3 sprints vs previous 3)
            let recentSprintPerformance: 'improving' | 'declining' | 'stable' = 'stable'
            if (sprintCompletionRates.length >= 6) {
              const recent3 = sprintCompletionRates.slice(-3).reduce((a, b) => a + b, 0) / 3
              const previous3 = sprintCompletionRates.slice(-6, -3).reduce((a, b) => a + b, 0) / 3
              const diff = recent3 - previous3
              
              if (diff > 5) recentSprintPerformance = 'improving'
              else if (diff < -5) recentSprintPerformance = 'declining'
            }
            
            return {
              projectId: project.id,
              projectName: project.name,
              totalSprints: allSprints.length,
              completedSprints: completedSprints.length,
              activeSprints: activeSprints.length,
              totalStoriesCompleted,
              totalStoriesPushedBack,
              averageCompletionRate,
              sprintSuccessRate,
              recentSprintPerformance
            }
          })
        )
        
        setSprintInsights(insights)
      } catch (error) {
        console.error('Error fetching sprint insights:', error)
        setSprintInsights([])
      }
    }

    fetchSprintInsights()
  }, [selectedProjectId, user, projects])

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
      storiesCompleted: project.storiesCompleted,
      activeSprints: project.activeSprints,
      completionRate: project.storiesCount > 0 ? parseFloat(((project.storiesCompleted / project.storiesCount) * 100).toFixed(2)) : 0,
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
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedProjectId === 'all' ? 'Active Projects' : 'Active Epics'}
              </CardTitle>
              {selectedProjectId === 'all' ? (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Target className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingData ? '--' : (
                  selectedProjectId === 'all' 
                    ? filteredStats.activeProjects 
                    : epicBreakdownData.filter(epic => epic.status === 'active').length
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedProjectId === 'all' 
                  ? `of ${filteredStats.totalProjects} total`
                  : `of ${epicBreakdownData.length} total`
                }
              </p>
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
                need estimation
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
                ready to sprint
              </p>
              <Progress value={filteredStats.overallVelocity} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Remaining Work</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{loadingData ? '--' : (filteredStats.totalStories - filteredStats.storiesCompleted)}</div>
              <p className="text-xs text-muted-foreground">
                {filteredStats.storiesCompleted} of {filteredStats.totalStories} completed ({filteredStats.completionRate.toFixed(1)}%)
              </p>
              <Progress value={filteredStats.completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{loadingData ? '--' : filteredStats.activeSprints}</div>
              <p className="text-xs text-muted-foreground">
                active sprints running
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
                total across {filteredStats.totalEpics} epics
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
                  <div className="flex items-center justify-center gap-1 sm:gap-4">
                    {/* Backlog */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                        <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="text-sm font-medium">Backlog</div>
                      <div className="text-2xl font-bold text-gray-600">
                        {filteredStats.totalStories - filteredStats.storiesInPlanning - filteredStats.storiesSprintReady - filteredStats.storiesCompleted}
                      </div>
                    </div>

                    {/* Progress Bar 1 */}
                    <div className="flex items-center -mt-12">
                      <div className="w-8 sm:w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (filteredStats.storiesInPlanning / Math.max(filteredStats.totalStories, 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Planning */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                        <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-sm font-medium">Planning</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {filteredStats.storiesInPlanning}
                      </div>
                    </div>

                    {/* Progress Bar 2 */}
                    <div className="flex items-center -mt-12">
                      <div className="w-8 sm:w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div 
                          className="h-2 bg-green-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (filteredStats.storiesSprintReady / Math.max(filteredStats.totalStories, 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Sprint Ready */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                        <Rocket className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-sm font-medium">
                        <span className="sm:hidden">Ready</span>
                        <span className="hidden sm:inline">Sprint Ready</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {filteredStats.storiesSprintReady}
                      </div>
                    </div>

                    {/* Progress Bar 3 */}
                    <div className="flex items-center -mt-12">
                      <div className="w-8 sm:w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div 
                          className="h-2 bg-purple-500 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.min(100, (filteredStats.storiesCompleted / Math.max(filteredStats.totalStories, 1)) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Completed */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mb-2 border-2 border-white dark:border-gray-900 shadow-sm">
                        <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="text-sm font-medium">Completed</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {filteredStats.storiesCompleted}
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

        {/* Sprint Insights */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sprint Insights
            </CardTitle>
            <CardDescription>
              Sprint performance and story completion metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : sprintInsights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sprint data available yet. Complete your first sprint to see insights.
              </div>
            ) : (
              <div className="space-y-6">
                {sprintInsights.map((insight) => (
                  <div key={insight.projectId} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="font-medium text-lg">{insight.projectName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {insight.totalSprints} total sprint{insight.totalSprints !== 1 ? 's' : ''} • 
                          {insight.completedSprints} completed • 
                          {insight.activeSprints} active
                        </p>
                      </div>
                      <Badge variant={
                        insight.recentSprintPerformance === 'improving' ? 'default' :
                        insight.recentSprintPerformance === 'declining' ? 'destructive' : 'secondary'
                      }>
                        {insight.recentSprintPerformance === 'improving' && <TrendingUp className="h-3 w-3 mr-1" />}
                        {insight.recentSprintPerformance === 'declining' && <TrendingUp className="h-3 w-3 mr-1 rotate-180" />}
                        {insight.recentSprintPerformance === 'stable' && <Activity className="h-3 w-3 mr-1" />}
                        {insight.recentSprintPerformance === 'improving' ? 'Improving' :
                         insight.recentSprintPerformance === 'declining' ? 'Declining' : 'Stable'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {insight.totalStoriesCompleted}
                        </div>
                        <div className="text-xs text-muted-foreground">Stories Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {insight.totalStoriesPushedBack}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {insight.totalStoriesPushedBack === 1 ? 'Story' : 'Stories'} Pushed to Backlog
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {insight.averageCompletionRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Story Completion per Sprint</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {insight.completedSprints > 0 ? Math.round(insight.totalStoriesCompleted / insight.completedSprints) : 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Stories Completed per Sprint</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Epic Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Epic Breakdown
            </CardTitle>
            <CardDescription>
              Story progress across epics
              {selectedProjectId !== 'all' && (
                <span> in {projects.find(p => p.id === selectedProjectId)?.name}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : selectedProjectId === 'all' ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Select a Project</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a specific project to see epic-level story breakdown
                </p>
              </div>
            ) : epicBreakdownData.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Epics Found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create epics to organize your stories and track progress
                </p>
                <Button asChild>
                  <Link href={`/epics?project=${selectedProjectId}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Epic
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {epicBreakdownData.map((epic) => (
                  <div key={epic.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-md flex items-center justify-center text-sm flex-shrink-0"
                          style={{ backgroundColor: epic.color + '20', color: epic.color }}
                        >
                          <Target className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{epic.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {epic.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{epic.completionRate.toFixed(0)}% Complete</div>
                        <div className="text-xs text-muted-foreground">
                          {epic.storiesCount} total stories
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <FileText className="h-3 w-3 text-gray-600" />
                          <div className="text-lg font-semibold text-gray-600">{epic.backlogCount}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">Backlog</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Clock className="h-3 w-3 text-blue-600" />
                          <div className="text-lg font-semibold text-blue-600">{epic.planningCount}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">Planning</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Rocket className="h-3 w-3 text-green-600" />
                          <div className="text-lg font-semibold text-green-600">{epic.sprintReadyCount}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">Sprint Ready</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <CheckCircle2 className="h-3 w-3 text-purple-600" />
                          <div className="text-lg font-semibold text-purple-600">{epic.completedCount}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">Completed</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={epic.completionRate} className="h-0.5 sm:h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Epic Completion</span>
                        <span>{epic.completionRate.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/stories?project=${selectedProjectId}&epic=${epic.id}`}>
                          <FileText className="mr-1 h-3 w-3" />
                          <span className="text-xs">Stories</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/epics?project=${selectedProjectId}`}>
                          <Target className="mr-1 h-3 w-3" />
                          <span className="text-xs">Edit</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="flex-1">
                        <Link href={`/planning?project=${selectedProjectId}&epic=${epic.id}`}>
                          <Users className="mr-1 h-3 w-3" />
                          <span className="text-xs">Plan</span>
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