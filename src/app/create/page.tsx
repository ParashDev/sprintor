"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Settings, Loader2, Target, Building2, AlertCircle } from "lucide-react"
import { createSession } from "@/lib/session-service"
import { getProjectsByOwner, type Project } from "@/lib/project-service"
import { getEpicsByProject } from "@/lib/epic-service"
import type { Epic } from "@/types/epic"
import { getStoriesByProject } from "@/lib/story-service"
import { useAuth } from "@/contexts/AuthContext"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

const DECK_OPTIONS = [
  { value: 'fibonacci', label: 'Fibonacci (1, 2, 3, 5, 8, 13, 21)', description: 'Classic Fibonacci sequence for story points' },
  { value: 'tshirt', label: 'T-Shirt Sizes (XS, S, M, L, XL)', description: 'Size-based estimation' },
  { value: 'powers', label: 'Powers of 2 (1, 2, 4, 8, 16)', description: 'Exponential scale' },
  { value: 'custom', label: 'Custom Cards', description: 'Define your own estimation values' }
]

function CreateSessionContent() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlProjectId = searchParams.get('project')
  const urlEpicId = searchParams.get('epic')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    sessionName: '',
    description: '',
    deckType: 'fibonacci' as 'fibonacci' | 'tshirt' | 'powers' | 'custom',
    customDeck: ''
  })
  
  // Project and Epic state
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [epics, setEpics] = useState<Epic[]>([])
  const [selectedEpicId, setSelectedEpicId] = useState<string>('')
  const [selectedEpic, setSelectedEpic] = useState<Epic | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingEpics, setLoadingEpics] = useState(false)
  const [planningStoriesCount, setPlanningStoriesCount] = useState(0)
  const [checkingStories, setCheckingStories] = useState(false)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      toast.error("Please sign in to host a session")
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Fetch projects when user is available
  useEffect(() => {
    if (user && !loading) {
      fetchProjects()
    }
  }, [user, loading])

  // Initial project selection when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      // Check URL parameter first
      if (urlProjectId) {
        const project = projects.find(p => p.id === urlProjectId)
        if (project) {
          setSelectedProjectId(urlProjectId)
          return
        }
      }
      // Otherwise select first project
      setSelectedProjectId(projects[0].id)
    }
  }, [projects, urlProjectId])

  // Fetch epics when project is selected
  useEffect(() => {
    if (selectedProjectId) {
      fetchEpics(selectedProjectId)
    }
  }, [selectedProjectId])

  // Handle URL epic parameter
  useEffect(() => {
    if (epics.length > 0 && urlEpicId && !selectedEpicId) {
      const epic = epics.find(e => e.id === urlEpicId)
      if (epic) {
        setSelectedEpicId(urlEpicId)
        setSelectedEpic(epic)
      }
    }
  }, [epics, urlEpicId])

  // Check for planning stories when epic is selected
  useEffect(() => {
    if (selectedEpicId && selectedProjectId) {
      checkPlanningStories()
    }
  }, [selectedEpicId, selectedProjectId])

  const fetchProjects = async () => {
    if (!user) return
    
    setLoadingProjects(true)
    try {
      const userProjects = await getProjectsByOwner(user.uid)
      setProjects(userProjects)
    } catch (error) {
      console.error('Error fetching projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }

  const fetchEpics = async (projectId: string) => {
    setLoadingEpics(true)
    setEpics([])
    setSelectedEpicId('')
    setSelectedEpic(null)
    
    try {
      const projectEpics = await getEpicsByProject(projectId)
      // Filter only active or planning epics
      const availableEpics = projectEpics.filter(e => e.status !== 'completed')
      setEpics(availableEpics)
    } catch (error) {
      console.error('Error fetching epics:', error)
      toast.error('Failed to load epics')
    } finally {
      setLoadingEpics(false)
    }
  }

  const checkPlanningStories = async () => {
    if (!selectedProjectId || !selectedEpicId) return
    
    setCheckingStories(true)
    try {
      const stories = await getStoriesByProject(selectedProjectId, {
        epicId: selectedEpicId,
        status: ['planning']
      })
      setPlanningStoriesCount(stories.length)
    } catch (error) {
      console.error('Error checking planning stories:', error)
      setPlanningStoriesCount(0)
    } finally {
      setCheckingStories(false)
    }
  }

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId)
    // Reset epic selection when project changes
    setSelectedEpicId('')
    setSelectedEpic(null)
    setReadyStoriesCount(0)
  }

  const handleEpicChange = (epicId: string) => {
    const epic = epics.find(e => e.id === epicId)
    setSelectedEpicId(epicId)
    setSelectedEpic(epic || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast.error("Please sign in to host a session")
      router.push('/auth/login')
      return
    }

    // Validate epic selection and planning stories
    if (!selectedEpicId) {
      toast.error("Please select an epic")
      return
    }

    if (planningStoriesCount === 0) {
      toast.error("No stories are ready for estimation. Please move stories to 'Planning' status first.")
      return
    }

    setIsLoading(true)

    try {
      // Clear any existing session data first
      localStorage.removeItem('sprintor_current_session')
      
      // Use authenticated user's ID and name
      localStorage.setItem('sprintor_user_id', user.uid)
      localStorage.setItem('sprintor_user_name', user.displayName || user.email || 'Host')

      const hostName = user.displayName || user.email || 'Host'
      
      const sessionData: {
        name: string
        description: string
        hostId: string
        projectId?: string
        projectName?: string
        epicId?: string
        epicName?: string
        epicColor?: string
        deckType: 'fibonacci' | 'tshirt' | 'powers' | 'custom'
        customDeck?: string[]
        participants: Array<{
          id: string
          name: string
          isHost: boolean
          isOnline: boolean
          lastSeen: Date
        }>
        stories: never[]
        votingInProgress: boolean
        votesRevealed: boolean
        isActive: boolean
      } = {
        name: formData.sessionName,
        description: formData.description,
        hostId: user.uid,
        projectId: selectedProjectId || undefined,
        projectName: projects.find(p => p.id === selectedProjectId)?.name || undefined,
        epicId: selectedEpicId || undefined,
        epicName: selectedEpic?.name || undefined,
        epicColor: selectedEpic?.color || undefined,
        deckType: formData.deckType,
        participants: [{
          id: user.uid,
          name: hostName,
          isHost: true,
          isOnline: true,
          lastSeen: new Date()
        }],
        stories: [],
        votingInProgress: false,
        votesRevealed: false,
        isActive: true
      }

      // Only add customDeck if it's actually needed and has values
      if (formData.deckType === 'custom' && formData.customDeck.trim()) {
        sessionData.customDeck = formData.customDeck.split(',').map(s => s.trim()).filter(Boolean)
      }

      const sessionId = await createSession(sessionData)
      
      // Store current session info for reconnection
      localStorage.setItem('sprintor_current_session', JSON.stringify({
        sessionId: sessionId,
        sessionName: formData.sessionName,
        userRole: 'host',
        joinedAt: new Date().toISOString()
      }))
      
      router.push(`/session/${sessionId}?fresh=true`)
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error('Failed to create session. Please try again.')
    } finally {
      setIsLoading(false)
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
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardHeader />
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Session</h1>
              <p className="text-muted-foreground mt-1">Set up your planning poker session</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Step 1 of 2: Session Setup
            </div>
          </div>

          {/* Main content */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left column - Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="space-y-6 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                      <Users className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold tracking-tight">Create New Session</CardTitle>
                      <CardDescription className="text-base mt-1">
                        Set up your planning poker session configuration
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid gap-6">
                      {/* Project and Epic Selection Section */}
                      <div className="space-y-6 p-6 bg-background rounded-lg border-2 border-primary/20">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">Planning Scope</h3>
                            <p className="text-sm text-muted-foreground">Select the epic for this planning session</p>
                          </div>
                        </div>
                        
                        {/* Selected Project Display */}
                        {selectedProjectId && (
                          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20 mb-4">
                            <div className="flex items-center gap-3">
                              <Building2 className="h-5 w-5 text-primary" />
                              <div>
                                <div className="font-medium">Project: {projects.find(p => p.id === selectedProjectId)?.name}</div>
                                <div className="text-sm text-muted-foreground">{projects.find(p => p.id === selectedProjectId)?.companyName}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Epic Selector */}
                        <div className="space-y-2">
                          <Label htmlFor="epic" className="text-sm font-semibold flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Epic
                          </Label>
                          <Select 
                            value={selectedEpicId} 
                            onValueChange={handleEpicChange}
                            disabled={!selectedProjectId || loadingEpics || epics.length === 0}
                          >
                            <SelectTrigger className="h-12 border-2">
                              <SelectValue placeholder={
                                !selectedProjectId ? "Loading project..." :
                                loadingEpics ? "Loading epics..." :
                                epics.length === 0 ? "No epics available" :
                                "Select epic"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {epics.map((epic) => (
                                <SelectItem key={epic.id} value={epic.id}>
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="w-4 h-4 rounded"
                                      style={{ backgroundColor: epic.color }}
                                    />
                                    <span>{epic.name}</span>
                                    <span className="text-xs text-muted-foreground capitalize">• {epic.status}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Planning Stories Alert */}
                        {selectedEpicId && (
                          <Alert className={planningStoriesCount === 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-green-500 bg-green-50 dark:bg-green-950/20'}>
                            <AlertCircle className={`h-4 w-4 ${planningStoriesCount === 0 ? 'text-orange-600' : 'text-green-600'}`} />
                            <AlertDescription className={planningStoriesCount === 0 ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}>
                              {checkingStories ? (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Checking for planning stories...
                                </span>
                              ) : planningStoriesCount === 0 ? (
                                <span>
                                  <strong>No stories ready for estimation.</strong> Move stories to &quot;Planning&quot; status in the Stories page before creating a session.
                                </span>
                              ) : (
                                <span>
                                  <strong>{planningStoriesCount} {planningStoriesCount === 1 ? 'story' : 'stories'} ready</strong> for estimation in this epic.
                                </span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                        
                        {/* Epic Preview */}
                        {selectedEpic && (
                          <div className="p-4 bg-background rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                style={{ backgroundColor: selectedEpic.color + '20', color: selectedEpic.color }}
                              >
                                <Target className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{selectedEpic.name}</div>
                                <div className="text-sm text-muted-foreground line-clamp-1">{selectedEpic.description}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Session Details */}
                      <div className="space-y-3">
                        <Label htmlFor="session-name" className="text-sm font-semibold">Session Name</Label>
                        <Input
                          id="session-name"
                          value={formData.sessionName}
                          onChange={(e) => setFormData({ ...formData, sessionName: e.target.value })}
                          placeholder="Sprint 24.1 Planning"
                          required
                          className="h-12 text-base border-2 focus:border-primary"
                        />
                        <p className="text-sm text-muted-foreground">
                          Descriptive session name
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="session-description" className="text-sm font-semibold">Description (Optional)</Label>
                        <Textarea
                          id="session-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Planning session for user stories in Sprint 24.1. We'll be estimating 12 stories for the upcoming sprint."
                          className="min-h-24 text-base border-2 focus:border-primary resize-none"
                        />
                        <p className="text-sm text-muted-foreground">
                          Add context about what you&rsquo;ll be estimating (optional)
                        </p>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">Estimation Cards</Label>
                        <div className="grid gap-3">
                          {DECK_OPTIONS.map((option) => (
                            <div
                              key={option.value}
                              className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
                                formData.deckType === option.value
                                  ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20'
                                  : 'border-slate-200 hover:border-primary/50 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-primary/50 dark:hover:bg-slate-800/50'
                              }`}
                              onClick={() => setFormData({ ...formData, deckType: option.value as 'fibonacci' | 'tshirt' | 'powers' | 'custom' })}
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 transition-all ${
                                  formData.deckType === option.value
                                    ? 'border-primary bg-primary shadow-sm'
                                    : 'border-slate-400 dark:border-slate-500'
                                }`}>
                                  {formData.deckType === option.value && (
                                    <div className="w-full h-full rounded-full bg-white scale-50" />
                                  )}
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="font-semibold text-sm">{option.label}</div>
                                  <div className="text-sm text-muted-foreground leading-relaxed">{option.description}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {formData.deckType === 'custom' && (
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                          <Label htmlFor="custom-deck" className="text-sm font-semibold">Custom Card Values</Label>
                          <Input
                            id="custom-deck"
                            value={formData.customDeck}
                            onChange={(e) => setFormData({ ...formData, customDeck: e.target.value })}
                            placeholder="1, 2, 4, 8, 16, ?, ☕"
                            required={formData.deckType === 'custom'}
                            className="h-11 text-base border-2 focus:border-primary"
                          />
                          <p className="text-sm text-muted-foreground">
                            Enter comma-separated values for your estimation cards
                          </p>
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      size="lg"
                      className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200" 
                      disabled={isLoading || !selectedEpicId || planningStoriesCount === 0}
                    >
                      {isLoading ? (
                        <>
                          <Settings className="h-5 w-5 mr-3 animate-spin" />
                          Creating Session...
                        </>
                      ) : !selectedEpicId ? (
                        <>
                          <Target className="h-5 w-5 mr-3" />
                          Select Epic to Continue
                        </>
                      ) : planningStoriesCount === 0 ? (
                        <>
                          <AlertCircle className="h-5 w-5 mr-3" />
                          No Stories Ready for Estimation
                        </>
                      ) : (
                        <>
                          <Users className="h-5 w-5 mr-3" />
                          Create Session & Get Room Code
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right column - Info sidebar */}
            <div className="space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">What happens next?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Planning stories imported</div>
                        <div className="text-muted-foreground">All &quot;Planning&quot; stories from your epic will be loaded</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Get your room code</div>
                        <div className="text-muted-foreground">Share the 6-character code with your team</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Invite your team</div>
                        <div className="text-muted-foreground">Share the room code with participants</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium">Start estimating</div>
                        <div className="text-muted-foreground">Begin voting on imported stories</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Tips for better sessions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-2">
                    <p>• Move stories to &quot;Planning&quot; status before estimation</p>
                    <p>• Fibonacci sequence works for most teams</p>
                    <p>• One epic per session works best</p>
                    <p>• Encourage discussion before revealing votes</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CreateSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CreateSessionContent />
    </Suspense>
  )
}