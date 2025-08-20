import type { Session, SessionMetrics } from '@/types/session'

/**
 * Calculate comprehensive metrics for a session
 * This function mirrors the real-time calculations from the session page
 * but stores them permanently when a session ends
 */
export function calculateSessionMetrics(session: Session): SessionMetrics {
  const now = new Date()
  const sessionStart = session.createdAt
  const sessionEnd = session.updatedAt || now
  const diffMs = sessionEnd.getTime() - sessionStart.getTime()
  const sessionDurationMinutes = Math.floor(diffMs / (1000 * 60))

  // Calculate total story points (for numeric decks only)
  let totalStoryPoints = 0
  let averagePoints = 0
  let mostCommonEstimate: string | undefined

  if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
    // For numeric decks, calculate total and average
    const estimatedStories = session.stories.filter(s => 
      s.isEstimated && s.estimate && s.estimate !== '?'
    )
    
    totalStoryPoints = estimatedStories.reduce((sum, s) => {
      const points = parseFloat(s.estimate || '0')
      return isNaN(points) ? sum : sum + points
    }, 0)

    if (estimatedStories.length > 0) {
      const numericEstimates = estimatedStories
        .map(s => parseFloat(s.estimate!))
        .filter(n => !isNaN(n))
      
      if (numericEstimates.length > 0) {
        averagePoints = numericEstimates.reduce((sum, n) => sum + n, 0) / numericEstimates.length
      }
    }
  } else if (session.deckType === 'tshirt') {
    // For T-shirt sizes, find the most common estimate
    const estimates = session.stories
      .filter(s => s.isEstimated && s.estimate && s.estimate !== '?')
      .map(s => s.estimate!)
    
    if (estimates.length > 0) {
      const counts: Record<string, number> = {}
      estimates.forEach(e => counts[e] = (counts[e] || 0) + 1)
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
      mostCommonEstimate = sorted[0]?.[0]
    }
  } else {
    // For custom decks, just count estimated stories
    totalStoryPoints = session.stories.filter(s => s.isEstimated).length
  }

  // Calculate consensus rate (% of stories that reached consensus in first round)
  const storiesWithVoting = session.stories.filter(s => s.votingHistory && s.votingHistory.length > 0)
  const firstRoundConsensus = storiesWithVoting.filter(s => s.votingHistory!.length === 1).length
  const consensusRate = storiesWithVoting.length > 0 
    ? Math.round((firstRoundConsensus / storiesWithVoting.length) * 100)
    : 0

  // Calculate participation rate
  let totalVotes = 0
  let totalPossibleVotes = 0
  let totalVotingRounds = 0
  
  const nonHostParticipants = session.participants.filter(p => !p.isHost)
  const totalParticipants = nonHostParticipants.length

  storiesWithVoting.forEach(story => {
    story.votingHistory!.forEach(round => {
      totalVotingRounds++
      const roundVotes = Object.keys(round.votes).filter(id => 
        session.participants.find(p => p.id === id && !p.isHost)
      ).length
      totalVotes += roundVotes
      totalPossibleVotes += totalParticipants
    })
  })

  const participationRate = totalPossibleVotes > 0
    ? Math.round((totalVotes / totalPossibleVotes) * 100)
    : 0

  const averageVotesPerRound = totalVotingRounds > 0
    ? totalVotes / totalVotingRounds
    : 0

  // Calculate high variance stories
  let highVarianceStories = 0
  
  if (session.deckType === 'fibonacci' || session.deckType === 'powers') {
    // For numeric decks, check for significant numeric variance
    highVarianceStories = session.stories.filter(s => {
      if (!s.votingHistory || s.votingHistory.length === 0) return false
      const lastRound = s.votingHistory[s.votingHistory.length - 1]
      const votes = Object.values(lastRound.votes).filter(v => v !== '?' && !isNaN(parseFloat(v)))
      if (votes.length < 2) return false
      const numVotes = votes.map(v => parseFloat(v))
      const max = Math.max(...numVotes)
      const min = Math.min(...numVotes)
      return (max - min) > 5 // Significant variance threshold
    }).length
  } else {
    // For non-numeric decks, check if votes were split
    highVarianceStories = session.stories.filter(s => {
      if (!s.votingHistory || s.votingHistory.length === 0) return false
      const lastRound = s.votingHistory[s.votingHistory.length - 1]
      const votes = Object.values(lastRound.votes).filter(v => v !== '?')
      if (votes.length < 2) return false
      return new Set(votes).size > 1 // Multiple different votes
    }).length
  }

  // Calculate re-voting rate
  const storiesWithMultipleRounds = storiesWithVoting.filter(s => s.votingHistory!.length > 1).length
  const reVotingRate = storiesWithVoting.length > 0
    ? Math.round((storiesWithMultipleRounds / storiesWithVoting.length) * 100)
    : 0

  // Count estimated vs not estimated
  const storiesEstimated = session.stories.filter(s => s.isEstimated).length
  const storiesNotEstimated = session.stories.filter(s => !s.isEstimated).length

  // Calculate unique participants (excluding host)
  const uniqueParticipantNames = new Set(
    session.participants
      .filter(p => !p.isHost)
      .map(p => p.name.toLowerCase())
  )
  const uniqueParticipants = uniqueParticipantNames.size

  // Epic-specific metrics (if session is linked to an epic)
  let epicSpecificMetrics: SessionMetrics['epicSpecificMetrics']
  
  if (session.epicId && session.epicName) {
    const epicStories = session.stories.filter(s => s.originalStoryId)
    const epicStoriesEstimated = epicStories.filter(s => s.isEstimated).length
    
    epicSpecificMetrics = {
      epicId: session.epicId,
      epicName: session.epicName,
      epicColor: session.epicColor || '#6366f1',
      storiesFromEpic: epicStories.length,
      epicCompletionRate: epicStories.length > 0
        ? Math.round((epicStoriesEstimated / epicStories.length) * 100)
        : 0
    }
  }

  return {
    totalStoryPoints,
    averagePoints: Math.round(averagePoints * 10) / 10, // Round to 1 decimal
    mostCommonEstimate,
    consensusRate,
    participationRate,
    highVarianceStories,
    reVotingRate,
    sessionDurationMinutes,
    totalVotingRounds,
    storiesEstimated,
    storiesNotEstimated,
    deckTypeUsed: session.deckType,
    uniqueParticipants,
    averageVotesPerRound: Math.round(averageVotesPerRound * 10) / 10, // Round to 1 decimal
    epicSpecificMetrics
  }
}

/**
 * Format a metric value for display
 */
export function formatMetricValue(value: number | string | undefined, type: 'percentage' | 'number' | 'duration' | 'text' = 'number'): string {
  if (value === undefined || value === null) return '—'
  
  switch (type) {
    case 'percentage':
      return `${value}%`
    case 'duration':
      return `${value}m`
    case 'text':
      return String(value)
    case 'number':
    default:
      return String(value)
  }
}

/**
 * Get a performance summary based on metrics
 */
export function getPerformanceSummary(metrics: SessionMetrics): {
  rating: 'excellent' | 'good' | 'needs-improvement'
  highlights: string[]
  improvements: string[]
} {
  const highlights: string[] = []
  const improvements: string[] = []
  let score = 0

  // Evaluate consensus rate
  if (metrics.consensusRate >= 70) {
    highlights.push('High first-round consensus')
    score += 2
  } else if (metrics.consensusRate >= 50) {
    score += 1
  } else {
    improvements.push('Work on reaching consensus faster')
  }

  // Evaluate participation
  if (metrics.participationRate >= 90) {
    highlights.push('Excellent team participation')
    score += 2
  } else if (metrics.participationRate >= 70) {
    score += 1
  } else {
    improvements.push('Encourage more team participation')
  }

  // Evaluate re-voting rate
  if (metrics.reVotingRate <= 20) {
    highlights.push('Efficient estimation process')
    score += 2
  } else if (metrics.reVotingRate <= 40) {
    score += 1
  } else {
    improvements.push('Too many stories require re-voting')
  }

  // Evaluate completion rate
  const completionRate = metrics.storiesEstimated / (metrics.storiesEstimated + metrics.storiesNotEstimated) * 100
  if (completionRate >= 90) {
    highlights.push('High story completion rate')
    score += 2
  } else if (completionRate >= 70) {
    score += 1
  } else {
    improvements.push('Focus on estimating all stories')
  }

  // Determine overall rating
  let rating: 'excellent' | 'good' | 'needs-improvement'
  if (score >= 6) {
    rating = 'excellent'
  } else if (score >= 3) {
    rating = 'good'
  } else {
    rating = 'needs-improvement'
  }

  return { rating, highlights, improvements }
}