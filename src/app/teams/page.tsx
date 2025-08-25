"use client"

import React, { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { subscribeToTeamsByProject } from "@/lib/team-service"
import { getProjectsByOwner, type Project } from "@/lib/project-service"
import type { Team } from "@/types/team"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, 
  Loader2,
  Users, 
  UserCheck,
  Building2,

} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { TeamsContent } from "@/components/teams/TeamsContent"

interface ProjectWithCount extends Project {
  id: string
  name: string
  companyName: string
}

function TeamsPageContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlProjectId = searchParams.get('project')
  
  // Project state
  const [projects, setProjects] = useState<ProjectWithCount[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [selectedProject, setSelectedProject] = useState<ProjectWithCount | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  
  // Teams state
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)

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

  useEffect(() => {
    // Subscribe to teams when project is selected
    if (selectedProjectId && selectedProject && user) {
      setLoadingTeams(true)
      
      const unsubscribe = subscribeToTeamsByProject(selectedProjectId, user.uid, (updatedTeams) => {
        setTeams(updatedTeams)
        setLoadingTeams(false)
      })
      
      return unsubscribe
    } else {
      setTeams([])
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
      window.history.replaceState({}, '', `/teams?project=${projectId}`)
    }
  }

  // Calculate team stats
  const totalMembers = teams.reduce((total, team) => total + team.members.length, 0)
  const activeTeams = teams.filter(team => team.inviteEnabled !== false).length

  const handleCreateTeam = () => {
    setShowCreateModal(true)
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
              <h1 className="text-2xl sm:text-3xl font-bold">Teams</h1>
              <p className="text-muted-foreground mt-1">Manage your project teams and member roles</p>
            </div>
            <Button size="lg" disabled={!selectedProject} onClick={() => handleCreateTeam()}>
              <Plus className="mr-2 h-5 w-5" />
              Create Team
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
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground">
                {teams.length === 0 ? "No teams yet" : "Project teams"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTeams}</div>
              <p className="text-xs text-muted-foreground">
                {teams.length === 0 ? "No teams yet" : "Accepting invites"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                Across all teams
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Team Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {teams.length > 0 
                  ? Math.round((totalMembers / teams.length) * 10) / 10
                  : "—"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {teams.length > 0 
                  ? "Members per team"
                  : "No teams yet"
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Teams Content */}
        <TeamsContent 
          teams={teams}
          selectedProject={selectedProject}
          loading={loadingTeams}
          onCreateTeam={handleCreateTeam}
          showCreateModal={showCreateModal}
          setShowCreateModal={setShowCreateModal}
        />
      </main>
    </div>
  )
}

export default function TeamsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>}>
      <TeamsPageContent />
    </Suspense>
  )
}