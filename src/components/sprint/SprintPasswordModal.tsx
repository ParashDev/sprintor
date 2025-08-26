'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Lock, Eye, EyeOff, Users, Calendar, Target, Mail, User } from 'lucide-react'
import type { Sprint, TeamMemberRole } from '@/types/sprint'
import { validateSprintAccess } from '@/lib/sprint-access-service'

interface SprintPasswordModalProps {
  sprint: Sprint | null
  isOpen: boolean
  onSuccess: (accessData: { 
    accessToken: string
    participantId: string
    teamRole?: TeamMemberRole
    memberName?: string
    accessLevel?: 'view' | 'contribute' | 'admin'
  }) => void
  onClose: () => void
}

export function SprintPasswordModal({ 
  sprint, 
  isOpen, 
  onSuccess, 
  onClose 
}: SprintPasswordModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Clear form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setName('')
      setEmail('')
      setPassword('')
      setError('')
      // Focus on first input after animation
      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Get stored participant info from localStorage
  useEffect(() => {
    if (isOpen) {
      const storedName = localStorage.getItem('sprintor_participant_name')
      const storedEmail = localStorage.getItem('sprintor_participant_email')
      if (storedName) setName(storedName)
      if (storedEmail) setEmail(storedEmail)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!sprint) return

    // Validate all fields are required
    if (!name.trim()) {
      setError('Your name is required')
      return
    }

    if (!email.trim()) {
      setError('Email is required to verify team membership')
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    if (!password.trim()) {
      setError('Sprint password is required')
      return
    }

    setIsLoading(true)

    try {
      console.log('Validating sprint access with team verification:', {
        sprintId: sprint.id,
        email: email.trim(),
        name: name.trim(),
        hasPassword: !!password.trim()
      })
      
      const result = await validateSprintAccess(
        sprint.id,
        password.trim(),
        name.trim(),
        undefined,  // hostId
        email.trim()  // NEW: Pass email for team verification
      )

      console.log('Sprint access validation result:', result)

      if (result.success && result.accessToken && result.participantId) {
        // Store participant info for next time
        localStorage.setItem('sprintor_participant_name', name.trim())
        localStorage.setItem('sprintor_participant_email', email.trim())
        
        
        onSuccess({
          accessToken: result.accessToken,
          participantId: result.participantId,
          // NEW: Pass role-based access data
          teamRole: result.teamRole,
          memberName: result.memberName,
          // DEPRECATED: Keep for backward compatibility
          accessLevel: result.accessLevel
        })
      } else {
        console.log('Sprint access validation failed:', result.error)
        // Provide specific error messages
        if (result.error === 'Not a team member') {
          setError('Access denied. Only team members can join this sprint. Please contact your team lead.')
        } else if (result.error === 'Incorrect password') {
          setError('Incorrect sprint password')
        } else {
          setError(result.error || 'Failed to join sprint')
        }
      }
    } catch (error) {
      console.error('Error joining sprint:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const formatSprintDates = (startDate: Date, endDate: Date) => {
    const start = new Date(startDate).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric' 
    })
    const end = new Date(endDate).toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
    return `${start} - ${end}`
  }

  if (!isOpen || !sprint) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200"
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto mb-4">
            <Lock className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Join Sprint Board
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Team members only - Verify your identity to access
            </p>
          </div>
        </div>

        {/* Sprint Info */}
        <div className="px-6 pb-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {sprint.name}
              </h3>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${sprint.status === 'active' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                  sprint.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                  sprint.status === 'completed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }
              `}>
                {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
              </span>
            </div>

            {sprint.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                {sprint.description}
              </p>
            )}

            <div className="grid grid-cols-1 gap-2 text-sm text-slate-600 dark:text-slate-400">
              {sprint.goal && (
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-slate-500" />
                  <span className="truncate">{sprint.goal}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>{formatSprintDates(sprint.startDate, sprint.endDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>
                  {sprint.stories.length} stories, {sprint.totalStoryPoints} points
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label 
                htmlFor="participantName" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                <User className="w-4 h-4 inline mr-1" />
                Your Name
              </label>
              <input
                ref={nameInputRef}
                id="participantName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                disabled={isLoading}
                maxLength={50}
                required
              />
            </div>

            {/* Email */}
            <div>
              <label 
                htmlFor="participantEmail" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                <Mail className="w-4 h-4 inline mr-1" />
                Team Member Email
              </label>
              <input
                id="participantEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                disabled={isLoading}
                required
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Must match your registered team email
              </p>
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                <Lock className="w-4 h-4 inline mr-1" />
                Sprint Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter sprint password"
                  className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
            </div>
          )}

          {/* Access Level Info */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <Users className="w-4 h-4 inline mr-1" />
              Only registered team members can access this sprint board
            </p>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !email.trim() || !password.trim()}
              className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-700 dark:bg-gray-100 dark:hover:bg-gray-300 disabled:bg-slate-400 disabled:cursor-not-allowed text-white dark:text-gray-900 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Verifying...
                </>
              ) : (
                'Join Sprint'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Access restricted to project team members only. Contact your team lead if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SprintPasswordModal