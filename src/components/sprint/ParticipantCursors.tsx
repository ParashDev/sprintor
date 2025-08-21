'use client'

import React, { useEffect, useState } from 'react'
import { MousePointer2 } from 'lucide-react'
import type { SprintParticipant } from '@/types/sprint'

interface ParticipantCursorsProps {
  participants: SprintParticipant[]
  currentParticipantId: string
}

export function ParticipantCursors({ participants, currentParticipantId }: ParticipantCursorsProps) {
  const [visibleCursors, setVisibleCursors] = useState<SprintParticipant[]>([])

  // Filter out current user and inactive participants
  useEffect(() => {
    const activeCursors = participants.filter(
      participant => 
        participant.id !== currentParticipantId && 
        participant.isActive && 
        participant.cursor
    )
    setVisibleCursors(activeCursors)
  }, [participants, currentParticipantId])

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {visibleCursors.map(participant => (
        <ParticipantCursor
          key={participant.id}
          participant={participant}
        />
      ))}
    </div>
  )
}

interface ParticipantCursorProps {
  participant: SprintParticipant
}

function ParticipantCursor({ participant }: ParticipantCursorProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (participant.cursor) {
      setPosition({ x: participant.cursor.x, y: participant.cursor.y })
      setIsVisible(true)
      
      // Hide cursor after 3 seconds of inactivity
      const hideTimer = setTimeout(() => {
        setIsVisible(false)
      }, 3000)

      return () => clearTimeout(hideTimer)
    } else {
      setIsVisible(false)
    }
  }, [participant.cursor])

  if (!isVisible || !participant.cursor) {
    return null
  }

  return (
    <div
      className="absolute transition-all duration-150 ease-out pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-2px, -2px)',
        zIndex: 1000
      }}
    >
      {/* Cursor Icon */}
      <div className="relative">
        <MousePointer2 
          className="w-5 h-5 drop-shadow-md"
          style={{ color: participant.color }}
          fill={participant.color}
        />
        
        {/* Participant Name Label */}
        <div
          className="absolute top-6 left-0 px-2 py-1 rounded-lg text-xs font-medium text-white whitespace-nowrap shadow-lg"
          style={{ backgroundColor: participant.color }}
        >
          {participant.name}
        </div>

        {/* Card Interaction Indicator */}
        {participant.cursor.cardId && (
          <div className="absolute -top-8 left-0 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 shadow-lg whitespace-nowrap">
            Viewing story
          </div>
        )}
      </div>
    </div>
  )
}

export default ParticipantCursors