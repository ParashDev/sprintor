"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreateProjectModal } from "@/components/CreateProjectModal"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { createProject, subscribeToUserProjects, type Project } from "@/lib/project-service"

export default function ProjectsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const [creatingProject, setCreatingProject] = useState(false)

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
      const unsubscribe = subscribeToUserProjects(user.uid, (projects) => {
        setProjects(projects)
        setLoadingProjects(false)
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
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
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.reduce((sum, p) => sum + p.sessionsCount, 0)}</div>
              <p className="text-xs text-muted-foreground">
                {projects.length === 0 ? "Create your first project" : "Planning sessions"}
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
              <CardTitle className="text-sm font-medium">Latest Activity</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">
                {projects.length === 0 ? "No activity yet" : "Days since update"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="projects" className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="h-12 p-1 text-base">
              <TabsTrigger value="projects" className="px-6 py-2">Projects</TabsTrigger>
              <TabsTrigger value="teams" className="px-6 py-2">Teams</TabsTrigger>
              <TabsTrigger value="integrations" className="px-6 py-2">Integrations</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="projects" className="space-y-4">
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
                              {project.sessionsCount} sessions
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
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Manage team members, roles, and project access across your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Team Members Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Team Members</h4>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Invite Member
                      </Button>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-1">No team members yet</h3>
                        <p className="text-sm text-muted-foreground">
                          Invite team members to collaborate on planning sessions
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Roles & Permissions */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Default Roles & Permissions</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium">Product Owner</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Create projects, manage backlog, facilitate sessions</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-green-500"></div>
                          <span className="text-sm font-medium">Scrum Master</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Facilitate planning sessions, view analytics</p>
                      </div>
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                          <span className="text-sm font-medium">Developer</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Participate in estimation sessions, vote on stories</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Integrations</CardTitle>
                <CardDescription>
                  Connect with your existing tools to streamline your agile workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Popular Integrations */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Popular Integrations</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">J</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Jira Integration</span>
                              <p className="text-xs text-muted-foreground">Import stories, sync estimates</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Connect</Button>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">L</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Linear Integration</span>
                              <p className="text-xs text-muted-foreground">Sync with Linear issues</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Connect</Button>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-gray-600 dark:text-gray-400">A</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Azure DevOps</span>
                              <p className="text-xs text-muted-foreground">Import work items, update estimates</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Connect</Button>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">S</span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Slack Notifications</span>
                              <p className="text-xs text-muted-foreground">Session updates and summaries</p>
                            </div>
                          </div>
                          <Button size="sm" variant="outline">Connect</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Webhook Settings */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Webhook Configuration</h4>
                    <div className="border rounded-lg p-4">
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <Settings className="h-10 w-10 text-muted-foreground mb-3" />
                        <h3 className="text-sm font-medium mb-1">Custom Webhooks</h3>
                        <p className="text-xs text-muted-foreground">
                          Set up custom webhooks to integrate with your existing workflow tools
                        </p>
                        <Button size="sm" variant="outline" className="mt-3">
                          Configure Webhooks
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <CreateProjectModal 
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateProject={handleCreateProject}
      />
    </div>
  )
}