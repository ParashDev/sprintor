"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { getSessionsByHost, getSessionStats } from "@/lib/session-service"
import type { Session } from "@/types/session"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Users, 
  Loader2,
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  Target,
  BarChart3,
  Activity,
  Zap,
  Award,
  Gauge
} from "lucide-react"
import Link from "next/link"
import { DashboardHeader } from "@/components/dashboard/DashboardHeader"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats] = useState({
    totalSessions: 0,
    storiesEstimated: 0,
    teamMembers: 0,
    avgEstimationTime: '--'
  })
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Fetch analytics data when user is available
    if (user && !loading) {
      fetchAnalyticsData()
    }
  }, [user, loading])

  const fetchAnalyticsData = async () => {
    if (!user) return
    
    setLoadingStats(true)
    try {
      const [userSessions, userStats] = await Promise.all([
        getSessionsByHost(user.uid),
        getSessionStats(user.uid)
      ])
      
      setSessions(userSessions)
      setStats(userStats)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Calculate advanced analytics
  const analytics = React.useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        activeSessions: 0,
        totalStories: 0,
        estimatedStories: 0,
        estimationRate: 0,
        avgParticipants: 0,
        totalParticipants: 0,
        consensusRate: 0,
        avgSessionDuration: 0,
        productivity: 0,
        recentActivity: 0
      }
    }

    const totalSessions = sessions.length
    const activeSessions = sessions.filter(s => s.isActive).length
    const totalStories = sessions.reduce((sum, s) => sum + s.stories.length, 0)
    const estimatedStories = sessions.reduce((sum, s) => sum + s.stories.filter(story => story.isEstimated).length, 0)
    const estimationRate = totalStories > 0 ? (estimatedStories / totalStories) * 100 : 0
    
    const allParticipants = sessions.flatMap(s => s.participants.map(p => p.id))
    const uniqueParticipants = [...new Set(allParticipants)]
    const avgParticipants = totalSessions > 0 ? allParticipants.length / totalSessions : 0
    
    // Consensus rate calculation
    const storiesWithVoting = sessions.flatMap(s => s.stories.filter(story => story.votingHistory && story.votingHistory.length > 0))
    const firstRoundConsensus = storiesWithVoting.filter(story => story.votingHistory!.length === 1).length
    const consensusRate = storiesWithVoting.length > 0 ? (firstRoundConsensus / storiesWithVoting.length) * 100 : 0
    
    // Average session duration
    const sessionsWithDuration = sessions.filter(s => !s.isActive)
    const totalDuration = sessionsWithDuration.reduce((sum, s) => {
      const duration = new Date(s.updatedAt).getTime() - new Date(s.createdAt).getTime()
      return sum + duration
    }, 0)
    const avgSessionDuration = sessionsWithDuration.length > 0 ? totalDuration / sessionsWithDuration.length / (1000 * 60) : 0
    
    // Productivity metric (stories estimated per hour)
    const productivity = avgSessionDuration > 0 ? (estimatedStories / (avgSessionDuration / 60)) : 0
    
    // Recent activity (sessions in last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentActivity = sessions.filter(s => new Date(s.createdAt) > thirtyDaysAgo).length

    return {
      totalSessions,
      activeSessions,
      totalStories,
      estimatedStories,
      estimationRate,
      avgParticipants,
      totalParticipants: uniqueParticipants.length,
      consensusRate,
      avgSessionDuration,
      productivity,
      recentActivity
    }
  }, [sessions])

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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your planning performance and team productivity</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button asChild variant="outline" size="sm" className="sm:size-default">
              <Link href="/planning">
                <Calendar className="mr-2 h-4 w-4" />
                View Sessions
              </Link>
            </Button>
            <Button asChild size="sm" className="sm:size-lg">
              <Link href="/create">
                <Plus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                New Session
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingStats ? '--' : analytics.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeSessions} currently active
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Estimation Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingStats ? '--' : Math.round(analytics.estimationRate)}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.estimatedStories} of {analytics.totalStories} stories
              </p>
              <Progress value={analytics.estimationRate} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Collaboration</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingStats ? '--' : analytics.totalParticipants}</div>
              <p className="text-xs text-muted-foreground">
                Avg {analytics.avgParticipants.toFixed(1)} per session
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Consensus Rate</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loadingStats ? '--' : Math.round(analytics.consensusRate)}%</div>
              <p className="text-xs text-muted-foreground">
                First-round agreements
              </p>
              <Progress value={analytics.consensusRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Avg Duration</span>
                  <span className="font-medium">{analytics.avgSessionDuration.toFixed(0)} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Productivity</span>
                  <span className="font-medium">{analytics.productivity.toFixed(1)} stories/hr</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Recent Activity</span>
                  <span className="font-medium">{analytics.recentActivity} sessions (30d)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Story Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Estimated</span>
                    <span>{analytics.estimatedStories}</span>
                  </div>
                  <Progress value={(analytics.estimatedStories / Math.max(analytics.totalStories, 1)) * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span>{analytics.totalStories - analytics.estimatedStories}</span>
                  </div>
                  <Progress value={((analytics.totalStories - analytics.estimatedStories) / Math.max(analytics.totalStories, 1)) * 100} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : analytics.totalSessions === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No data available
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Consensus Rate</span>
                      <Badge variant={analytics.consensusRate > 70 ? "default" : analytics.consensusRate > 50 ? "secondary" : "outline"}>
                        {Math.round(analytics.consensusRate)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Estimation Rate</span>
                      <Badge variant={analytics.estimationRate > 80 ? "default" : analytics.estimationRate > 60 ? "secondary" : "outline"}>
                        {Math.round(analytics.estimationRate)}%
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Productivity</span>
                      <Badge variant={analytics.productivity > 5 ? "default" : analytics.productivity > 3 ? "secondary" : "outline"}>
                        {analytics.productivity.toFixed(1)} s/hr
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts Section */}
        <Tabs defaultValue="trends" className="space-y-4">
          <div className="flex justify-center">
            <TabsList className="h-12 p-1 text-base">
              <TabsTrigger value="trends" className="px-6 py-2">Trends</TabsTrigger>
              <TabsTrigger value="insights" className="px-6 py-2">Insights</TabsTrigger>
              <TabsTrigger value="export" className="px-6 py-2">Export</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Session Activity (Simple Chart)
                  </CardTitle>
                  <CardDescription>Your planning sessions over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      No session data available
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Simple bar chart using divs */}
                      <div className="space-y-2">
                        {sessions.slice(-5).map((session, index) => (
                          <div key={session.id} className="flex items-center gap-3">
                            <div className="text-xs text-muted-foreground w-16 truncate">
                              {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${Math.min(100, (session.stories.length / 10) * 100)}%` }}
                              />
                            </div>
                            <div className="text-xs font-medium w-8">
                              {session.stories.length}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Stories per session (max 10)</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Estimation Progress
                  </CardTitle>
                  <CardDescription>Progress towards completing estimations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{Math.round(analytics.estimationRate)}%</div>
                      <p className="text-sm text-muted-foreground">Stories Estimated</p>
                    </div>
                    <Progress value={analytics.estimationRate} className="h-3" />
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-green-600">{analytics.estimatedStories}</div>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-orange-600">{analytics.totalStories - analytics.estimatedStories}</div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.totalSessions === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Create sessions to see insights
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Team Efficiency</h4>
                        <p className="text-xs text-muted-foreground">
                          Your team reaches consensus on <strong>{Math.round(analytics.consensusRate)}%</strong> of stories in the first round of voting.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Session Duration</h4>
                        <p className="text-xs text-muted-foreground">
                          Average session length is <strong>{analytics.avgSessionDuration.toFixed(0)} minutes</strong> with <strong>{analytics.productivity.toFixed(1)} stories per hour</strong>.
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Activity Level</h4>
                        <p className="text-xs text-muted-foreground">
                          You&apos;ve hosted <strong>{analytics.recentActivity} sessions</strong> in the last 30 days with <strong>{analytics.totalParticipants} unique participants</strong>.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {analytics.consensusRate < 50 && (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <h4 className="font-medium text-sm text-orange-900 dark:text-orange-100">Improve Consensus</h4>
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          Consider discussing story requirements more before voting to improve first-round consensus.
                        </p>
                      </div>
                    )}
                    
                    {analytics.avgSessionDuration > 120 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="font-medium text-sm text-blue-900 dark:text-blue-100">Session Length</h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Your sessions are running long. Try time-boxing discussions and preparing stories beforehand.
                        </p>
                      </div>
                    )}
                    
                    {analytics.totalParticipants < 3 && analytics.totalSessions > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <h4 className="font-medium text-sm text-green-900 dark:text-green-100">Team Collaboration</h4>
                        <p className="text-xs text-green-700 dark:text-green-300">
                          Invite more team members to get diverse perspectives and better estimates.
                        </p>
                      </div>
                    )}
                    
                    {analytics.totalSessions === 0 && (
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                        <h4 className="font-medium text-sm text-purple-900 dark:text-purple-100">Get Started</h4>
                        <p className="text-xs text-purple-700 dark:text-purple-300">
                          Create your first planning session to start tracking your team&apos;s estimation performance.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Export your planning session data and analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button variant="outline" className="h-16 justify-start">
                      <div className="text-left">
                        <div className="font-medium">Session Summary</div>
                        <div className="text-xs text-muted-foreground">Export session details and results</div>
                      </div>
                    </Button>
                    <Button variant="outline" className="h-16 justify-start">
                      <div className="text-left">
                        <div className="font-medium">Analytics Report</div>
                        <div className="text-xs text-muted-foreground">Download performance metrics</div>
                      </div>
                    </Button>
                  </div>
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Export functionality coming soon
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}