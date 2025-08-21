'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Calendar, 
  Target, 
  Shield, 
  CheckCircle2, 
  ArrowLeft,
  Eye,
  EyeOff,
  
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { createSprint } from '@/lib/sprint-service'
import { getStoriesByProject } from '@/lib/story-service'
import { getEpicsByProject } from '@/lib/epic-service'
import type { Story } from '@/types/story'
import type { Epic } from '@/types/epic'
import type { CreateSprintRequest } from '@/types/sprint'

// Component that uses useSearchParams - needs to be wrapped in Suspense
function CreateSprintForm() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Form refs for uncontrolled inputs (performance optimization)
  const formRefs = useRef({
    name: null as HTMLInputElement | null,
    description: null as HTMLTextAreaElement | null,
    goal: null as HTMLTextAreaElement | null
  })

  // State
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedEpic, setSelectedEpic] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allowGuestAccess, setAllowGuestAccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [availableStories, setAvailableStories] = useState<Story[]>([])
  const [selectedStories, setSelectedStories] = useState<string[]>([])
  const [availableEpics, setAvailableEpics] = useState<Epic[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Get project ID from URL params
  const projectId = searchParams.get('project')

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  // Set default dates (2-week sprint starting next Monday)
  useEffect(() => {
    const today = new Date()
    const nextMonday = new Date(today)
    
    // Calculate next Monday
    const daysUntilMonday = (7 - today.getDay() + 1) % 7 || 7
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    
    // End date is 2 weeks later (Friday)
    const endOfSprint = new Date(nextMonday)
    endOfSprint.setDate(nextMonday.getDate() + 11) // 2 weeks - 3 days = Friday

    setStartDate(nextMonday.toISOString().split('T')[0])
    setEndDate(endOfSprint.toISOString().split('T')[0])
  }, [])

  // Load project data when project is selected
  useEffect(() => {
    if (projectId) {
      setSelectedProject(projectId)
      loadProjectData(projectId)
    }
  }, [projectId])

  const loadProjectData = async (projectId: string) => {
    try {
      setIsLoading(true)
      
      // Load epics and stories in parallel
      const [epics, stories] = await Promise.all([
        getEpicsByProject(projectId),
        getStoriesByProject(projectId, { status: ['sprint_ready'] })
      ])

      setAvailableEpics(epics)
      setAvailableStories(stories)
      
      // Auto-select stories if epic is specified
      if (selectedEpic) {
        const epicStories = stories.filter(story => story.epicId === selectedEpic)
        setSelectedStories(epicStories.map(s => s.id))
      }
      
    } catch (error) {
      console.error('Error loading project data:', error)
      setErrors({ project: 'Failed to load project data' })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle epic selection
  const handleEpicChange = (epicId: string) => {
    setSelectedEpic(epicId)
    
    if (epicId) {
      // Auto-select all stories from this epic
      const epicStories = availableStories.filter(story => story.epicId === epicId)
      setSelectedStories(epicStories.map(s => s.id))
    } else {
      setSelectedStories([])
    }
  }

  // Handle story selection
  const handleStoryToggle = (storyId: string) => {
    setSelectedStories(prev =>
      prev.includes(storyId)
        ? prev.filter(id => id !== storyId)
        : [...prev, storyId]
    )
  }

  // Validate form step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      // Basic Info
      if (!formRefs.current.name?.value?.trim()) {
        newErrors.name = 'Sprint name is required'
      }
      if (!formRefs.current.goal?.value?.trim()) {
        newErrors.goal = 'Sprint goal is required'
      }
      if (!selectedProject) {
        newErrors.project = 'Project selection is required'
      }
    } else if (step === 2) {
      // Dates
      if (!startDate) {
        newErrors.startDate = 'Start date is required'
      }
      if (!endDate) {
        newErrors.endDate = 'End date is required'
      }
      if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        newErrors.endDate = 'End date must be after start date'
      }
    } else if (step === 3) {
      // Security - use state values directly
      if (!allowGuestAccess) {
        if (!password.trim()) {
          newErrors.password = 'Password is required for protected sprints'
        } else if (password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters'
        }
        
        if (password !== confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  // Handle previous step
  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep(currentStep) || !user) return

    setIsLoading(true)
    
    try {
      // Use the state value directly - much simpler!
      console.log('Sprint creation debug:', {
        password: password,
        passwordLength: password.length,
        allowGuestAccess
      })
      
      // For guest access, no password needed. For protected sprints, use the actual password.
      const finalPassword = allowGuestAccess ? 'guest_access_no_password' : password.trim()
      
      console.log('Final password being sent:', finalPassword)
      
      const sprintData: CreateSprintRequest = {
        name: formRefs.current.name?.value || '',
        description: formRefs.current.description?.value || '',
        goal: formRefs.current.goal?.value || '',
        projectId: selectedProject,
        epicId: selectedEpic || undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        password: finalPassword,
        storyIds: selectedStories,
        allowGuestAccess,
        hostId: user.uid,
        hostName: user.displayName || user.email || 'Anonymous Host'
      }

      const sprintId = await createSprint(sprintData)
      
      // Keep loading state active and redirect immediately
      // Don't clear loading state to prevent form from showing again
      router.push(`/sprint/${sprintId}`)
      
    } catch (error) {
      console.error('Error creating sprint:', error)
      setErrors({ submit: 'Failed to create sprint. Please try again.' })
      setIsLoading(false) // Clear loading on error
    }
  }

  // Calculate sprint metrics
  const selectedStoriesData = availableStories.filter(s => selectedStories.includes(s.id))
  const totalPoints = selectedStoriesData.reduce((sum, story) => sum + (story.storyPoints || 0), 0)
  const sprintDuration = startDate && endDate 
    ? Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

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
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Create New Sprint
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Set up a collaborative sprint board for your team to estimate and track stories
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: 1, title: 'Basic Info', icon: Target },
              { step: 2, title: 'Timeline', icon: Calendar },
              { step: 3, title: 'Security', icon: Shield },
              { step: 4, title: 'Stories', icon: CheckCircle2 }
            ].map(({ step, title, icon: Icon }) => (
              <div key={step} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${currentStep >= step 
                    ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100 text-white dark:text-slate-900' 
                    : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                  }
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="ml-3 min-w-0">
                  <p className={`text-sm font-medium ${
                    currentStep >= step 
                      ? 'text-slate-900 dark:text-slate-100' 
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {title}
                  </p>
                </div>
                {step < 4 && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    currentStep > step 
                      ? 'bg-slate-900 dark:bg-slate-100' 
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 relative">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 rounded-xl flex items-center justify-center" style={{ zIndex: 9999 }}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100 mx-auto mb-4"></div>
                <div className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Creating Sprint...</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">This may take a few moments</div>
              </div>
            </div>
          )}
          
          <form className={`p-8 ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Sprint Details
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {/* Sprint Name */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Sprint Name *
                      </label>
                      <input
                        ref={el => { if (formRefs.current) formRefs.current.name = el }}
                        type="text"
                        placeholder="e.g., Sprint 1: User Authentication"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                      {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Description
                      </label>
                      <textarea
                        ref={el => { if (formRefs.current) formRefs.current.description = el }}
                        rows={3}
                        placeholder="Brief description of what this sprint will accomplish..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                    </div>

                    {/* Sprint Goal */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Sprint Goal *
                      </label>
                      <textarea
                        ref={el => { if (formRefs.current) formRefs.current.goal = el }}
                        rows={2}
                        placeholder="What is the main objective of this sprint?"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                      {errors.goal && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.goal}</p>}
                    </div>

                    {/* Epic Selection */}
                    {availableEpics.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Epic (Optional)
                        </label>
                        <select
                          value={selectedEpic}
                          onChange={(e) => handleEpicChange(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        >
                          <option value="">Select an epic (optional)</option>
                          {availableEpics.map(epic => (
                            <option key={epic.id} value={epic.id}>
                              {epic.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Timeline */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Sprint Timeline
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                      {errors.startDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.startDate}</p>}
                    </div>

                    {/* End Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      />
                      {errors.endDate && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.endDate}</p>}
                    </div>
                  </div>

                  {/* Sprint Duration Display */}
                  {sprintDuration > 0 && (
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Sprint Duration: {sprintDuration} days
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                        {sprintDuration <= 7 ? 'Short sprint (1 week)' : 
                         sprintDuration <= 14 ? 'Standard sprint (2 weeks)' : 
                         sprintDuration <= 21 ? 'Long sprint (3 weeks)' : 
                         'Extended sprint (4+ weeks)'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Security */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Sprint Access Control
                  </h2>
                  
                  {/* Access Type */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allowGuestAccess}
                          onChange={(e) => setAllowGuestAccess(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-600 text-slate-600 focus:ring-slate-500"
                        />
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Allow Guest Access
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            Anyone with the link can join as a viewer without a password
                          </div>
                        </div>
                      </label>
                    </div>

                    {/* Password Fields */}
                    {!allowGuestAccess && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Sprint Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter password"
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value)
                                console.log('Password changed:', e.target.value)
                              }}
                              className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>}
                        </div>
                      </div>
                    )}

                    {/* Security Info */}
                    <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            Access Levels
                          </h3>
                          <ul className="text-sm text-slate-700 dark:text-slate-300 mt-2 space-y-2">
                            <li>
                              <strong className="text-slate-900 dark:text-slate-100">Guest Viewers:</strong> 
                              <span className="ml-1">Can see stories and progress (read-only)</span>
                            </li>
                            <li>
                              <strong className="text-slate-900 dark:text-slate-100">Contributors:</strong> 
                              <span className="ml-1">Can move stories and add comments (with password)</span>
                            </li>
                            <li>
                              <strong className="text-slate-900 dark:text-slate-100">Admin:</strong> 
                              <span className="ml-1">Full sprint control (sprint creator only)</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Stories */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Select Stories
                  </h2>
                  
                  {/* Sprint Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {selectedStories.length}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Stories Selected</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {totalPoints}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Story Points</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {sprintDuration}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">Days</div>
                    </div>
                  </div>

                  {/* Story Selection */}
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-slate-100 mx-auto"></div>
                      <p className="text-slate-600 dark:text-slate-400 mt-2">Loading stories...</p>
                    </div>
                  ) : availableStories.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-600 dark:text-slate-400">
                        No sprint-ready stories found. Make sure you have stories in &quot;Sprint Ready&quot; status.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availableStories.map(story => (
                        <div
                          key={story.id}
                          className={`
                            p-4 border-2 rounded-lg cursor-pointer transition-all
                            ${selectedStories.includes(story.id)
                              ? 'border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800'
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                            }
                          `}
                          onClick={() => handleStoryToggle(story.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={selectedStories.includes(story.id)}
                                onChange={() => handleStoryToggle(story.id)}
                                className="mt-1 rounded border-slate-300 text-slate-600 focus:ring-slate-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex-1">
                                <h3 className="font-medium text-slate-900 dark:text-slate-100">
                                  {story.title}
                                </h3>
                                {story.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                    {story.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <span className={`
                                    px-2 py-0.5 text-xs rounded-full font-medium
                                    ${story.priority === 'Must Have' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                      story.priority === 'Should Have' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                    }
                                  `}>
                                    {story.priority}
                                  </span>
                                  {story.storyPoints && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                                      {story.storyPoints} pts
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Form Errors */}
            {errors.submit && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">{errors.submit}</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentStep === 1 || isLoading}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={isLoading}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 disabled:bg-slate-400 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-lg transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading || selectedStories.length === 0}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 disabled:bg-slate-400 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-lg transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-slate-900"></div>
                      Creating Sprint...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Create Sprint
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function CreateSprintPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-900 dark:border-slate-100"></div>
      </div>
    }>
      <CreateSprintForm />
    </Suspense>
  )
}