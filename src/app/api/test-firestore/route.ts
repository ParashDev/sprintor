import { NextResponse } from 'next/server'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST() {
  try {
    // Test writing a simple template
    const testTemplate = {
      id: 'test_template',
      name: 'Test Template',
      category: 'feature',
      description: 'Test template for permission testing',
      isDefault: false,
      asA: 'user',
      iWant: 'to test',
      soThat: 'permissions work',
      defaultBusinessValue: 5,
      defaultPriority: 'Should Have',
      riskLevel: 'Low',
      complexity: 'Simple',
      defaultAcceptanceCriteria: ['Test criteria'],
      suggestedLabels: ['test'],
      createdAt: serverTimestamp(),
      createdBy: 'system',
      projectId: null,
      usageCount: 0
    }

    await setDoc(doc(db, 'storyTemplates', 'test_template'), testTemplate)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test template created successfully' 
    })
  } catch (error) {
    console.error('Firestore test error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code || 'unknown'
    
    return NextResponse.json({ 
      success: false, 
      error: 'Firestore test failed',
      details: errorMessage,
      code: errorCode
    }, { status: 500 })
  }
}