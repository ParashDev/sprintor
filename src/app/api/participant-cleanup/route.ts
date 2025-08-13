import { NextRequest, NextResponse } from 'next/server'
import { markParticipantOffline } from '@/lib/session-service'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, participantId, action } = await request.json()
    
    if (!sessionId || !participantId || action !== 'leave') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }
    
    // Mark participant as offline instead of removing to preserve voting history
    await markParticipantOffline(sessionId, participantId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Participant cleanup error:', error)
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    )
  }
}