// Sprint Board Role-Based Permissions System
import type { TeamMemberRole } from '@/types/sprint'

export interface SprintPermissions {
  // Story Management
  canCreateStory: boolean
  canEditStory: boolean
  canDeleteStory: boolean
  canCreateTechnicalStory: boolean
  canCreateDefectStory: boolean
  
  // Story Movement
  canMoveStories: boolean
  canMoveToPlanning: boolean
  canMoveToDevelopment: boolean
  canMoveToReview: boolean
  canMoveToTesting: boolean
  canMoveToDone: boolean
  
  // Sprint Control
  canStartSprint: boolean
  canEndSprint: boolean
  canEditSprintDetails: boolean
  
  // Collaboration
  canAddComments: boolean
  canEditComments: boolean
  canAssignStories: boolean
  canUpdateProgress: boolean
  
  // Board Management
  canViewBoard: boolean
  canExportData: boolean
  canInviteMembers: boolean
}

/**
 * Get permissions for a team member role in sprint board
 * Based on Agile best practices and role responsibilities
 */
export function getSprintPermissions(role: TeamMemberRole, isSprintHost: boolean = false): SprintPermissions {
  // Sprint host (creator) gets elevated permissions regardless of role
  if (isSprintHost) {
    return {
      canCreateStory: true,
      canEditStory: true,
      canDeleteStory: true,
      canCreateTechnicalStory: true,
      canCreateDefectStory: true,
      canMoveStories: true,
      canMoveToPlanning: true,
      canMoveToDevelopment: true,
      canMoveToReview: true,
      canMoveToTesting: true,
      canMoveToDone: true,
      canStartSprint: true,
      canEndSprint: true,
      canEditSprintDetails: true,
      canAddComments: true,
      canEditComments: true,
      canAssignStories: true,
      canUpdateProgress: true,
      canViewBoard: true,
      canExportData: true,
      canInviteMembers: true,
    }
  }

  switch (role) {
    case 'product_owner':
      return {
        // Full backlog management authority
        canCreateStory: true,
        canEditStory: true,
        canDeleteStory: true,
        canCreateTechnicalStory: false, // Tech stories are dev responsibility
        canCreateDefectStory: false,    // Defects are tester responsibility
        
        // Can move stories across all phases (backlog management)
        canMoveStories: true,
        canMoveToPlanning: true,
        canMoveToDevelopment: true,
        canMoveToReview: true,
        canMoveToTesting: true,
        canMoveToDone: true,
        
        // Sprint lifecycle control
        canStartSprint: true,
        canEndSprint: true,
        canEditSprintDetails: true,
        
        // Collaboration
        canAddComments: true,
        canEditComments: true,
        canAssignStories: true,
        canUpdateProgress: true,
        
        // Board management
        canViewBoard: true,
        canExportData: true,
        canInviteMembers: true,
      }

    case 'scrum_master':
      return {
        // Facilitation-focused story management
        canCreateStory: true,  // Can add stories for facilitation
        canEditStory: true,    // Can update for process facilitation
        canDeleteStory: false, // Cannot delete (not backlog owner)
        canCreateTechnicalStory: true,  // Can help with process stories
        canCreateDefectStory: true,     // Can facilitate defect management
        
        // Can move stories (facilitation role)
        canMoveStories: true,
        canMoveToPlanning: true,
        canMoveToDevelopment: true,
        canMoveToReview: true,
        canMoveToTesting: true,
        canMoveToDone: true,
        
        // Process control
        canStartSprint: true,
        canEndSprint: true,
        canEditSprintDetails: true,
        
        // Collaboration facilitation
        canAddComments: true,
        canEditComments: true,
        canAssignStories: true,
        canUpdateProgress: true,
        
        // Board management
        canViewBoard: true,
        canExportData: true,
        canInviteMembers: true,
      }

    case 'business_analyst':
      return {
        // Requirements-focused story management
        canCreateStory: true,     // Can create requirement stories
        canEditStory: true,       // Can refine acceptance criteria
        canDeleteStory: false,    // Cannot delete (not backlog owner)
        canCreateTechnicalStory: false,
        canCreateDefectStory: false,
        
        // Limited movement (planning and analysis phases)
        canMoveStories: true,
        canMoveToPlanning: true,
        canMoveToDevelopment: true,  // Can move to dev after analysis
        canMoveToReview: true,       // Can move for review
        canMoveToTesting: false,     // Testing is not BA responsibility
        canMoveToDone: false,        // Cannot mark as done
        
        // Limited sprint control
        canStartSprint: false,
        canEndSprint: false,
        canEditSprintDetails: false,
        
        // Analysis collaboration
        canAddComments: true,
        canEditComments: true,
        canAssignStories: false,  // Cannot assign to developers
        canUpdateProgress: true,
        
        // Board access
        canViewBoard: true,
        canExportData: true,
        canInviteMembers: false,
      }

    case 'developer':
      return {
        // Development-focused story management
        canCreateStory: false,         // Should not create business stories
        canEditStory: true,            // Can update technical details
        canDeleteStory: false,         // Cannot delete stories
        canCreateTechnicalStory: true, // Can create technical stories
        canCreateDefectStory: false,   // Defects are tester responsibility
        
        // Development workflow movement
        canMoveStories: true,          // Can move stories they work on
        canMoveToPlanning: false,      // Cannot move back to planning
        canMoveToDevelopment: true,    // Can pick up work
        canMoveToReview: true,         // Can submit for review
        canMoveToTesting: true,        // Can move to testing
        canMoveToDone: false,          // Cannot mark as done (needs validation)
        
        // No sprint control
        canStartSprint: false,
        canEndSprint: false,
        canEditSprintDetails: false,
        
        // Development collaboration
        canAddComments: true,
        canEditComments: true,
        canAssignStories: false,       // Cannot assign to others
        canUpdateProgress: true,       // Can update own progress
        
        // Board access
        canViewBoard: true,
        canExportData: false,
        canInviteMembers: false,
      }

    case 'tester':
      return {
        // Testing-focused story management
        canCreateStory: false,          // Should not create business stories
        canEditStory: true,             // Can update testing details
        canDeleteStory: false,          // Cannot delete stories
        canCreateTechnicalStory: false,
        canCreateDefectStory: true,     // Can create defect stories
        
        // Testing workflow movement
        canMoveStories: true,           // Can move stories in testing phases
        canMoveToPlanning: false,       // Cannot move back to planning
        canMoveToDevelopment: true,     // Can move back to dev if issues found
        canMoveToReview: false,         // Cannot move to review
        canMoveToTesting: true,         // Can pick up for testing
        canMoveToDone: true,            // Can mark as done after testing
        
        // No sprint control
        canStartSprint: false,
        canEndSprint: false,
        canEditSprintDetails: false,
        
        // Testing collaboration
        canAddComments: true,
        canEditComments: true,
        canAssignStories: false,        // Cannot assign to others
        canUpdateProgress: true,        // Can update testing progress
        
        // Board access
        canViewBoard: true,
        canExportData: false,
        canInviteMembers: false,
      }

    case 'stakeholder':
      return {
        // View-only stakeholder access
        canCreateStory: false,
        canEditStory: false,
        canDeleteStory: false,
        canCreateTechnicalStory: false,
        canCreateDefectStory: false,
        
        // No story movement
        canMoveStories: false,
        canMoveToPlanning: false,
        canMoveToDevelopment: false,
        canMoveToReview: false,
        canMoveToTesting: false,
        canMoveToDone: false,
        
        // No sprint control
        canStartSprint: false,
        canEndSprint: false,
        canEditSprintDetails: false,
        
        // Limited collaboration
        canAddComments: true,          // Can provide feedback
        canEditComments: false,        // Can only edit own comments
        canAssignStories: false,
        canUpdateProgress: false,
        
        // View-only board access
        canViewBoard: true,
        canExportData: false,
        canInviteMembers: false,
      }

    default:
      // Fallback to most restrictive permissions
      return getSprintPermissions('stakeholder', false)
  }
}

/**
 * Check if a role can perform a specific action
 */
export function canPerformAction(
  role: TeamMemberRole, 
  action: keyof SprintPermissions,
  isSprintHost: boolean = false
): boolean {
  const permissions = getSprintPermissions(role, isSprintHost)
  return permissions[action]
}

/**
 * Get user-friendly role description for UI
 */
export function getRoleDescription(role: TeamMemberRole): string {
  switch (role) {
    case 'product_owner':
      return 'Product Owner - Full backlog authority, can create/edit/delete stories and control sprint lifecycle'
    case 'scrum_master':
      return 'Scrum Master - Process facilitator, can manage stories and facilitate sprint ceremonies'
    case 'business_analyst':
      return 'Business Analyst - Requirements focus, can create/edit stories and manage acceptance criteria'
    case 'developer':
      return 'Developer - Development focus, can create technical stories and move through dev workflow'
    case 'tester':
      return 'Tester - Quality focus, can create defect stories and control testing workflow'
    case 'stakeholder':
      return 'Stakeholder - Observer role, can view board and add comments only'
    default:
      return 'Team Member - Standard permissions based on role'
  }
}