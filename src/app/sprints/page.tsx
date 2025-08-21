'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getProjectsByOwner } from '@/lib/project-service'
import { getSprintsByProject } from '@/lib/sprint-service'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
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
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Sprint Boards
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Create and manage collaborative sprint planning sessions
            </p>
          </div>
          
          <button
            onClick={() => router.push(`/sprints/create?project=${selectedProject}`)}
            disabled={!selectedProject}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 disabled:bg-slate-400 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Sprint
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Project Selection */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Search Sprints
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

        {/* Sprint List */}
        {!selectedProject ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              Select a Project
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Choose a project to view and manage its sprint boards
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading sprints...</p>
          </div>
        ) : filteredSprints.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              {sprints.length === 0 ? 'No Sprints Yet' : 'No Matching Sprints'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {sprints.length === 0 
                ? 'Create your first sprint board to start collaborative planning'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {sprints.length === 0 && (
              <button
                onClick={() => router.push(`/sprints/create?project=${selectedProject}`)}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-lg transition-colors"
              >
                Create Your First Sprint
              </button>
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
                <div
                  key={sprint.id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                          {sprint.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusDisplay.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                          </span>
                          {daysRemaining > 0 && sprint.status === 'active' && (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {daysRemaining} days left
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copySprintLink(sprint.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Copy sprint link"
                        >
                          <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => router.push(`/sprint/${sprint.id}`)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                          title="Open sprint"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    {sprint.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
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
                        <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {completedStories}/{sprint.stories.length} stories
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {sprint.stories.length}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Stories</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {sprint.totalStoryPoints}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Points</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                          {sprint.duration}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Days</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-750 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}