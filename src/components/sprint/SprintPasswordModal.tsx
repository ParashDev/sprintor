'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Lock, Eye, EyeOff, Users, Calendar, Target } from 'lucide-react'
import type { Sprint } from '@/types/sprint'
import { validateSprintAccess } from '@/lib/sprint-access-service'

interface SprintPasswordModalProps {
  sprint: Sprint | null
  isOpen: boolean
  onSuccess: (accessData: { accessToken: string; participantId: string; accessLevel: 'view' | 'contribute' | 'admin' }) => void
  onClose: () => void
}

export function SprintPasswordModal({ 
  sprint, 
  isOpen, 
  onSuccess, 
  onClose 
}: SprintPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [participantName, setParticipantName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const passwordInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Clear form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('')
      setParticipantName('')
      setError('')
      // Focus on first input after animation
      setTimeout(() => {
        if (sprint?.allowGuestAccess) {
          nameInputRef.current?.focus()
        } else {
          passwordInputRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen, sprint?.allowGuestAccess])

  // Get stored participant name from localStorage
  useEffect(() => {
    if (isOpen) {
      const storedName = localStorage.getItem('sprintor_participant_name')
      if (storedName) {
        setParticipantName(storedName)
      }
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!sprint) return

    // Validate form
    if (!sprint.allowGuestAccess && !password.trim()) {
      setError('Password is required')
      return
    }

    if (!participantName.trim()) {
      setError('Your name is required')
      return
    }

    setIsLoading(true)

    try {
      console.log('Validating sprint access:', {
        sprintId: sprint.id,
        hasPassword: !!password.trim(),
        participantName: participantName.trim(),
        allowGuestAccess: sprint.allowGuestAccess
      })
      
      const result = await validateSprintAccess(
        sprint.id,
        password.trim() || undefined,
        participantName.trim()
      )

      console.log('Sprint access validation result:', result)

      if (result.success && result.accessToken && result.participantId && result.accessLevel) {
        // Store participant name for next time
        localStorage.setItem('sprintor_participant_name', participantName.trim())
        
        console.log('Calling onSuccess with:', {
          accessToken: result.accessToken.substring(0, 10) + '...',
          participantId: result.participantId,
          accessLevel: result.accessLevel
        })
        
        onSuccess({
          accessToken: result.accessToken,
          participantId: result.participantId,
          accessLevel: result.accessLevel
        })
      } else {
        console.log('Sprint access validation failed:', result.error)
        setError(result.error || 'Failed to join sprint')
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
          <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4">
            {sprint.allowGuestAccess ? (
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Join Sprint
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {sprint.allowGuestAccess 
                ? 'Enter your name to join this sprint' 
                : 'This sprint is password protected'
              }
            </p>
          </div>
        </div>

        {/* Sprint Info */}
        <div className="px-6 pb-4">
          <div className="bg-slate-50 dark:bg-slate-750 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-900 dark:text-slate-100">
                {sprint.name}
              </h3>
              <span className={`
                px-2 py-0.5 rounded-full text-xs font-medium
                ${sprint.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                  sprint.status === 'draft' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                  sprint.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
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
            {/* Participant Name */}
            <div>
              <label 
                htmlFor="participantName" 
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Your Name
              </label>
              <input
                ref={nameInputRef}
                id="participantName"
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
                maxLength={50}
              />
            </div>

            {/* Password (only if not guest access) */}
            {!sprint.allowGuestAccess && (
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Sprint Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter sprint password"
                    className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
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
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Access Level Info */}
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {sprint.allowGuestAccess 
                ? '👀 You\'ll join as a viewer and can see all stories and progress'
                : '✏️ You\'ll join as a contributor and can move stories and add comments'
              }
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
              disabled={isLoading || !participantName.trim() || (!sprint.allowGuestAccess && !password.trim())}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Joining...
                </>
              ) : (
                'Join Sprint'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-750 rounded-b-xl border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            By joining this sprint, you agree to collaborate respectfully and follow the team&apos;s working agreements.
          </p>
        </div>
      </div>
    </div>
  )
}

export default SprintPasswordModal