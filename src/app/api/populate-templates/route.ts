import { NextResponse } from 'next/server'
import { populateDefaultTemplates } from '@/lib/story-service'

export async function POST() {
  try {
    await populateDefaultTemplates()
    return NextResponse.json({ 
      success: true, 
      message: 'Templates populated successfully' 
    })
  } catch (error) {
    console.error('Error populating templates:', error)
    
    // Return more detailed error info
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code || 'unknown'
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to populate templates',
      details: errorMessage,
      code: errorCode
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to populate templates',
    usage: 'POST /api/populate-templates'
  })
}