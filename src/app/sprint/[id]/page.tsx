'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { SprintBoard } from '@/components/sprint/SprintBoard'
import { SprintPasswordModal } from '@/components/sprint/SprintPasswordModal'
import { useSprintCollaboration } from '@/hooks/useSprintCollaboration'
import { getSprint } from '@/lib/sprint-service'
import { parseSprintLink, validateSprintAccess } from '@/lib/sprint-access-service'
import type { Sprint } from '@/types/sprint'

export default function SprintPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const sprintId = params.id as string

  // State
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Access credentials (will be set after successful authentication)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [participantName, setParticipantName] = useState<string | null>(null)

  // Real-time collaboration hook (only initialized after authentication)
  const collaboration = useSprintCollaboration(
    accessToken && participantId && participantName ? {
      sprintId,
      accessToken,
      participantId,
      participantName
    } : null as any
  )

  // Load sprint data on page load
  useEffect(() => {
    const loadSprint = async () => {
      try {
        setIsLoading(true)
        const sprintData = await getSprint(sprintId)
        
        if (!sprintData) {
          setError('Sprint not found')
          return
        }

        setSprint(sprintData)
        
        // Check if current user is the host (auto-authenticate as admin)
        if (user && sprintData.hostId === user.uid) {
          try {
            const hostAccess = await validateSprintAccess(
              sprintId,
              undefined, // No password needed for host
              user.displayName || user.email || 'Host',
              user.uid // Pass hostId for verification
            )
            
            if (hostAccess.success && hostAccess.accessToken && hostAccess.participantId && hostAccess.accessLevel) {
              setAccessToken(hostAccess.accessToken)
              setParticipantId(hostAccess.participantId)
              setParticipantName(user.displayName || user.email || 'Host')
              // No need to show password modal for host
              return
            }
          } catch (error) {
            console.error('Error auto-authenticating host:', error)
          }
        }
        
        // Check if we need password authentication
        if (!sprintData.allowGuestAccess) {
          setShowPasswordModal(true)
        } else {
          // For guest access, we still need to show the modal to get participant name
          setShowPasswordModal(true)
        }
        
      } catch (err) {
        console.error('Error loading sprint:', err)
        setError('Failed to load sprint')
      } finally {
        setIsLoading(false)
      }
    }

    if (sprintId) {
      loadSprint()
    }
  }, [sprintId, user])

  // Parse URL parameters for automatic authentication (if password is in URL)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const linkInfo = parseSprintLink(window.location.href)
      
      if (linkInfo.isValid && linkInfo.password) {
        // Auto-populate password if provided in URL
        console.log('Password found in URL - this should only be used for testing')
      }
    }
  }, [])

  // Handle successful authentication
  const handleAuthSuccess = (authData: {
    accessToken: string
    participantId: string
    accessLevel: 'view' | 'contribute' | 'admin'
  }) => {
    setAccessToken(authData.accessToken)
    setParticipantId(authData.participantId)
    
    // Get participant name from localStorage or use a default
    const storedName = localStorage.getItem('sprintor_participant_name') || 'Anonymous'
    setParticipantName(storedName)
    
    setShowPasswordModal(false)
  }

  // Handle leaving the sprint
  const handleLeaveSprint = () => {
    // Clear session data
    setAccessToken(null)
    setParticipantId(null)
    setParticipantName(null)
    
    // Redirect to home or show modal again
    router.push('/')
  }

  // Handle sprint updates from real-time collaboration
  const handleSprintUpdate = (updatedSprint: Sprint) => {
    setSprint(updatedSprint)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Loading Sprint...
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Please wait while we fetch the sprint details
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !sprint) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Sprint Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || 'The sprint you\'re looking for doesn\'t exist or may have been deleted.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  // Show password modal if not authenticated
  if (showPasswordModal || !accessToken || !participantId || !participantName) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="bg-slate-200 dark:bg-slate-700 h-8 w-48 rounded mx-auto mb-4"></div>
              <div className="bg-slate-200 dark:bg-slate-700 h-4 w-64 rounded mx-auto"></div>
            </div>
          </div>
        </div>
        
        <SprintPasswordModal
          sprint={sprint}
          isOpen={showPasswordModal}
          onSuccess={handleAuthSuccess}
          onClose={() => router.push('/')}
        />
      </>
    )
  }

  // Show connection error
  if (collaboration.connectionStatus === 'error' || !collaboration.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Connection Error
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {collaboration.error || 'Failed to connect to the sprint. Please check your connection and try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show connecting state
  if (collaboration.connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Connecting to Sprint...
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Setting up real-time collaboration
          </p>
        </div>
      </div>
    )
  }

  // Render the main sprint board
  return (
    <SprintBoard
      sprint={collaboration.sprint || sprint}
      accessLevel={collaboration.accessLevel}
      participantId={participantId}
      participants={collaboration.participants}
      onSprintUpdate={handleSprintUpdate}
      onLeave={handleLeaveSprint}
    />
  )
}