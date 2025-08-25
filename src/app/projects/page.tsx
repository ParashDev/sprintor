"use client"

import React, { useEffect, useState, } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateProjectModal } from "@/components/CreateProjectModal"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Users, 
  Loader2,
  Building,
  Calendar,
  Settings,
  Briefcase
} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"
import { toast } from "sonner"
import { createProject, subscribeToUserProjects, syncProjectSprintCounts, getActiveSprintsCount, type Project } from "@/lib/project-service"

export default function ProjectsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeSprintsCount, setActiveSprintsCount] = useState(0)  

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Subscribe to projects when user is available
    if (user && !loading) {
      setLoadingProjects(true)
      
      // Sync project sprint counts first
      syncProjectSprintCounts(user.uid).catch(error => 
        console.error('Failed to sync sprint counts:', error)
      )
      
      const unsubscribe = subscribeToUserProjects(user.uid, async (projects) => {
        setProjects(projects)
        setLoadingProjects(false)
        
        // Load active sprints count
        try {
          const activeCount = await getActiveSprintsCount(user.uid)
          setActiveSprintsCount(activeCount)
        } catch (error) {
          console.error('Failed to get active sprints count:', error)
        }
      })

      return unsubscribe
    }
  }, [user, loading])

  const handleCreateProject = async (data: {
    name: string
    description: string
    companyName: string
    projectType: string
    estimationMethod: string
    sprintDuration: string
  }) => {
    if (!user) {
      toast.error("User not authenticated")
      return
    }

    try {
      await createProject({
        ...data,
        ownerId: user.uid
      })
      toast.success("Project created successfully!")
    } catch (error) {
      console.error('Error creating project:', error)
      toast.error('Failed to create project')
      throw error
    }
  }

  if (loading) {
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
              <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-1">Manage your planning projects and settings</p>
            </div>
            <Button size="lg" onClick={() => setShowCreateModal(true)}>
              <Plus className="mr-2 h-5 w-5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground">
                {projects.length === 0 ? "No projects yet" : "Active projects"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sprints</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.reduce((sum, p) => sum + p.sprintsCount, 0)}</div>
              <p className="text-xs text-muted-foreground">
                {projects.length === 0 ? "Create your first project" : "Total sprints created"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(projects.map(p => p.companyName)).size}</div>
              <p className="text-xs text-muted-foreground">
                {projects.length === 0 ? "Start organizing" : "Unique companies"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeSprintsCount}</div>
              <p className="text-xs text-muted-foreground">
                {activeSprintsCount === 0 ? "No active sprints" : "Currently running"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>
                  Manage your planning poker projects and settings
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingProjects ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No projects yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first project to start organizing planning sessions
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Project
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span>{project.companyName}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {project.sprintsCount} {project.sprintsCount === 1 ? 'sprint' : 'sprints'}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description || "No description provided"}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created {project.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" asChild>
                          <Link href={`/planning?project=${project.id}`}>
                            <Calendar className="h-4 w-4 mr-1" />
                            Planning
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateProjectModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateProject={handleCreateProject}
      />
    </div>
  )
}