# CLAUDE.md - Sprintor Planning Poker Application

This file provides comprehensive guidance to Claude Code when working with the Sprintor codebase - a Next.js-based planning poker application with Firebase/Firestore backend.

## ⚠️ CRITICAL DEVELOPMENT GUIDELINES

**DO NOT REMOVE OR MODIFY CODE THAT IS NOT DIRECTLY RELATED TO YOUR CURRENT TASK**

- Only work on fixing/implementing the specific feature or bug you're addressing
- Do not touch working functionality while implementing new features
- Preserve all existing imports, types, and functions unless they're directly causing issues
- Always ensure production-ready code with no unnecessary imports or unused variables/methods
- Maintain strict TypeScript compliance for Vercel deployment pipelines
- Follow existing code patterns and conventions

## Project Overview

Sprintor is a real-time collaborative planning poker application built with Next.js 15.4.6, Firebase/Firestore, and shadcn/ui components. It enables distributed teams to conduct sprint planning sessions with real-time voting, session management, and participant tracking.

**🎯 Current Architecture: Project-Centric Planning**
```
User → Projects → Planning Sessions (project-scoped) → Stories
```

### Current Architecture Stack
- **Frontend**: Next.js 15.4.6 with App Router, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui component library (optimized for performance)
- **Backend**: Firebase/Firestore for real-time database
- **Authentication**: Firebase Auth (Google, Email/Password) - Host authentication implemented
- **Deployment**: Vercel and Railway compatible

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack (port 3000)

# Production Build
npm run build           # Build for production (required before deployment)
npm run start           # Start production server

# Code Quality
npm run lint            # Run ESLint checks (required to pass before deployment)
```

## Current Feature Set (Completed)

### 🎯 Project-Centric Architecture (NEW)
- ✅ **Project Management**: Create, edit, and manage projects with full Firebase integration
- ✅ **Project-Session Association**: Sessions are automatically linked to projects
- ✅ **Project-Scoped Sessions**: Only show sessions belonging to selected project
- ✅ **Project-Specific Stats**: Dashboard metrics calculated per project, not globally
- ✅ **Seamless Project Switching**: Instant session filtering when changing projects

### Core Session Management
- ✅ **Session Creation**: Hosts can create sessions with custom names, descriptions, and estimation decks
- ✅ **Session Joining**: Participants join via 6-character room codes
- ✅ **Real-time Updates**: Live participant management via Firestore subscriptions
- ✅ **Session Persistence**: LocalStorage-based session data with reconnection modals
- ✅ **Smart Reconnection**: Time-based logic prevents false reconnect prompts on fresh joins

### Authentication & User Management
- ✅ **Host Authentication**: Firebase Auth (Google, Email/Password) for session hosts
- ✅ **Anonymous Participants**: Easy join via room code + name (no account required)
- ✅ **User Dashboard**: Authenticated hosts get project management interface
- ✅ **Protected Routes**: Auth-required pages properly protected

### Estimation & Voting System
- ✅ **Multiple Deck Types**: Fibonacci, T-Shirt sizes, Powers of 2, Custom decks
- ✅ **Story Management**: Add, vote, and estimate user stories
- ✅ **Voting Rounds**: Start voting, cast votes, reveal results
- ✅ **Voting History**: Track multiple rounds per story with participant names and timestamps
- ✅ **Re-voting Capability**: Re-estimate stories with full history tracking

### User Experience Features
- ✅ **Professional UI**: Gradient backgrounds, shadows, consistent spacing
- ✅ **Dark Mode Support**: Theme toggle with system preference detection
- ✅ **Responsive Design**: Mobile-first approach with breakpoints
- ✅ **Optimized Performance**: Fixed input lag issues, native HTML forms where needed
- ✅ **Session End Notifications**: Automatic participant redirect when host ends session

### Participant Management
- ✅ **Real-time Participant Lists**: Live online/offline status tracking
- ✅ **Heartbeat System**: 30-second heartbeat, 2-minute offline detection, 10-minute cleanup
- ✅ **Leave Functionality**: Clean participant removal from host view
- ✅ **Host Controls**: End session, manage participants, session settings

## File Structure & Key Components

### Core Pages
```
src/app/
├── page.tsx                 # Landing page with hero and feature showcase
├── auth/
│   ├── login/page.tsx      # Authentication login page
│   └── signup/page.tsx     # User registration page
├── projects/page.tsx        # Project management dashboard
├── planning/page.tsx        # Planning sessions page (project-scoped)
├── create/page.tsx          # Session creation form with deck selection
├── join/page.tsx           # Session joining with room code input
└── session/[id]/page.tsx   # Main session interface with voting
```

### Components
```
src/components/
├── ui/                     # shadcn/ui base components
├── landing/
│   ├── Hero.tsx           # Landing page hero with animated cards
│   └── Footer.tsx         # Footer with branding
├── dashboard/
│   └── DashboardHeader.tsx # Shared header for authenticated pages
├── session/
│   ├── SessionHeader.tsx          # Session controls, theme toggle, leave/end
│   ├── SessionReconnectModal.tsx  # Reconnection prompt for refreshes
│   └── SessionEndedDialog.tsx     # Dialog when host ends session
└── CreateProjectModal.tsx # High-performance project creation modal
```

### Services & Types
```
src/lib/
├── firebase.ts            # Firebase configuration and initialization
├── session-service.ts     # All Firestore operations and session management
├── project-service.ts     # Project CRUD operations and Firebase integration
└── utils.ts              # Utility functions

src/types/
└── session.ts            # TypeScript interfaces for Session, Participant, Story

src/contexts/
└── AuthContext.tsx       # Firebase Auth context and user management
```

### API Routes
```
src/app/api/
└── participant-cleanup/route.ts  # Cleanup endpoint for beforeunload events
```

## Data Models & Types

### Session Interface (Updated)
```typescript
interface Session {
  id: string
  name: string
  description: string
  hostId: string
  projectId?: string              // NEW: Links session to project
  deckType: 'fibonacci' | 'tshirt' | 'powers' | 'custom'
  customDeck?: string[]
  participants: Participant[]
  stories: Story[]
  currentStoryId?: string
  votingInProgress: boolean
  votesRevealed: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Project Interface (NEW)
```typescript
interface Project {
  id: string
  name: string
  description: string
  companyName: string
  projectType: string
  estimationMethod: string
  sprintDuration: string
  createdAt: Date
  updatedAt: Date
  ownerId: string
  sessionsCount: number
}
```

### Participant Interface
```typescript
interface Participant {
  id: string
  name: string
  isHost: boolean
  isOnline: boolean
  lastSeen: Date
  vote?: string | null
}
```

### Story Interface
```typescript
interface Story {
  id: string
  title: string
  description?: string
  estimate?: string | null
  isEstimated: boolean
  createdAt: Date
  votingHistory?: VotingRound[]
}
```

## LocalStorage Session Management

### Session Data Storage
```typescript
// Stored on join/create
sprintor_current_session = {
  sessionId: string
  sessionName: string
  userRole: 'host' | 'participant'
  joinedAt: string (ISO)
}

// User credentials
sprintor_user_id: string
sprintor_user_name: string
```

### Reconnection Logic (Enhanced)
- **Fresh Join** (`?fresh=true` URL param): No reconnect modal
- **Time-based Check**: Only shows reconnect modal if >5 seconds since original join
- **Refresh** (no URL param): Shows reconnect modal if session data exists and time check passes
- **Leave/End**: Clears all localStorage data for clean restart

## Firestore Database Structure

### Sessions Collection (Updated)
```
sessions/{sessionId} = {
  id: string
  name: string
  description: string
  hostId: string
  projectId?: string          // NEW: Links to projects collection
  deckType: string
  customDeck?: string[]
  participants: Array<{
    id: string
    name: string
    isHost: boolean
    isOnline: boolean
    lastSeen: Timestamp
    vote?: string | null
  }>
  stories: Array<{
    id: string
    title: string
    description?: string
    estimate?: string | null
    isEstimated: boolean
    createdAt: Timestamp
    votingHistory?: Array<{
      id: string
      votes: Record<string, string>
      participantNames: Record<string, string>
      timestamp: Timestamp
      finalEstimate?: string
    }>
  }>
  currentStoryId?: string
  votingInProgress: boolean
  votesRevealed: boolean
  isActive: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Projects Collection (NEW)
```
projects/{projectId} = {
  id: string
  name: string
  description: string
  companyName: string
  projectType: string
  estimationMethod: string
  sprintDuration: string
  createdAt: Timestamp
  updatedAt: Timestamp
  ownerId: string            // Links to authenticated user
  sessionsCount: number
}
```

### Required Firestore Indexes
```
Collection: sessions
Composite Index: hostId (Ascending), projectId (Ascending), createdAt (Descending)
Purpose: Enable project-scoped session queries
```

## Critical Implementation Details

### Performance Optimizations
- **Input Lag Fix**: Replaced shadcn/ui components with native HTML inputs in CreateProjectModal
- **React State Management**: Optimized re-renders with proper dependency arrays
- **Project Switching**: Immediate session clearing prevents showing wrong data
- **Time-based Reconnection**: Prevents false reconnect modals on fresh joins

### Project-Session Architecture
- **Compound Queries**: `getSessionsByProject(hostId, projectId)` uses Firebase compound index
- **Project-Specific Stats**: `getProjectSessionStats()` calculates metrics per project
- **URL State Management**: Project selection persisted via URL parameters
- **Automatic Association**: Sessions created from planning page auto-link to selected project

### Firestore Undefined Field Handling
- **Problem**: Firestore rejects `undefined` values in updates
- **Solution**: `cleanParticipantsForFirestore()` helper filters undefined fields
- **Applied to**: All participant update operations and project creation
- **Pattern**: Always filter objects before Firestore writes:
```typescript
const cleanData: Record<string, unknown> = {}
Object.entries(data).forEach(([key, value]) => {
  if (value !== undefined) {
    cleanData[key] = value
  }
})
```

### Real-time Subscription Management
- **onSnapshot** listeners for live session updates
- **Proper cleanup** with useEffect return functions
- **Error handling** for connection issues and parsing errors
- **Pattern**: All subscriptions follow this structure:
```typescript
const unsubscribe = subscribeToSession(sessionId, (data) => {
  // Handle data
})
return () => unsubscribe() // Cleanup in useEffect
```

### TypeScript Compliance
- **Strict typing** for all interfaces and function parameters
- **No `any` types** - use proper type definitions
- **Firestore type conversion** from Timestamps to Dates
- **Path aliases**: Use `@/` for imports from src directory

## Key Service Functions

### Project Service (project-service.ts)
```typescript
createProject(projectData) → Promise<string>           // Create new project
getProjectsByOwner(ownerId) → Promise<Project[]>       // Get user's projects  
getProject(projectId) → Promise<Project|null>          // Get single project
updateProject(projectId, updates) → Promise<void>     // Update project
deleteProject(projectId) → Promise<void>              // Delete project
subscribeToUserProjects(ownerId, callback) → Function // Real-time project updates
```

### Session Service Extensions (session-service.ts)
```typescript
getSessionsByProject(hostId, projectId) → Promise<Session[]>     // Project-scoped sessions
getProjectSessionStats(hostId, projectId) → Promise<Stats>      // Project-specific metrics
getSessionStats(hostId) → Promise<Stats>                        // Global user stats (legacy)
```

## Current Architecture Status: COMPLETED ✅

### ✅ Implemented Features
- **Project-Centric Planning**: Full project → sessions → stories hierarchy
- **Firebase Authentication**: Host authentication with Google/Email
- **Project Management**: Complete CRUD operations with real-time updates
- **Project-Scoped Sessions**: Sessions filtered by selected project
- **Project-Specific Stats**: Dashboard metrics calculated per project
- **Performance Optimized**: Input lag resolved, React state optimized
- **Smart Reconnection**: Time-based logic prevents false reconnect prompts

### Next Implementation Phase: Advanced Features

#### Planned Enhancements
- **Session Templates**: Pre-configured session setups with story libraries
- **Team Management**: Invite team members, manage permissions
- **Advanced Analytics**: Sprint velocity, estimation accuracy tracking
- **Export Capabilities**: PDF reports, CSV data export
- **Integrations**: Jira, Azure DevOps, Linear story import

#### New Features for Authenticated Hosts
```
Dashboard Features:
├── Session History & Management
├── Team Member Presets
├── Session Templates & Story Libraries
├── Analytics & Reporting
├── Export Capabilities (CSV, PDF)
└── Integration Hooks (Jira, Azure DevOps)
```

#### Database Schema Extensions
```
users/{userId} = {
  uid: string
  email: string
  displayName: string
  createdAt: Timestamp
  lastActive: Timestamp
}

userSessions/{userId}/sessions/{sessionId} = {
  sessionId: string
  sessionName: string
  createdAt: Timestamp
  participantCount: number
  storiesEstimated: number
  avgEstimationTime: number
}

teams/{teamId} = {
  id: string
  name: string
  ownerId: string
  members: Array<{
    name: string
    email?: string
    role: 'member' | 'stakeholder'
  }>
  createdAt: Timestamp
}
```

#### Implementation Plan
1. **Add Firebase Auth** configuration and providers
2. **Create auth context** and login/logout flows
3. **Build host dashboard** with session management
4. **Implement session ownership** linking in Firestore
5. **Add team management** and member presets
6. **Build analytics views** and export functionality
7. **Create session templates** system

### File Structure Extensions (Planned)
```
src/app/
├── auth/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── dashboard/
│   ├── page.tsx              # Host dashboard overview
│   ├── sessions/page.tsx     # Session history
│   ├── teams/page.tsx        # Team management
│   └── analytics/page.tsx    # Reporting & analytics
└── api/auth/[...nextauth]/   # NextAuth.js routes (if used)

src/components/
├── auth/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── ProtectedRoute.tsx
└── dashboard/
    ├── SessionCard.tsx
    ├── TeamCard.tsx
    └── AnalyticsChart.tsx

src/lib/
├── auth.ts                   # Authentication utilities
└── analytics.ts              # Analytics calculations
```

## Development Best Practices

### Code Quality Requirements
- **No unused imports** - Clean up all unnecessary imports
- **No unused variables/methods** - Remove all unreferenced code
- **TypeScript strict mode** - All code must pass TypeScript checks
- **ESLint compliance** - Follow all linting rules
- **Build compatibility** - Must pass Vercel/Railway builds

### Firestore Best Practices
- **Batch operations** where possible for multiple updates
- **Error handling** for all database operations
- **Type safety** with proper interfaces for all documents
- **Field validation** before writing to prevent undefined issues

### Component Architecture
- **Single responsibility** - Each component has one clear purpose
- **Props typing** - All props properly typed with TypeScript
- **Error boundaries** - Proper error handling in React components
- **Performance** - Use React.memo and useCallback where beneficial

### Testing Strategy (Future)
- **Unit tests** for utility functions and services
- **Integration tests** for Firestore operations
- **E2E tests** for critical user flows
- **Performance testing** for real-time features

## Environment Configuration

### Required Environment Variables
```
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Future: Authentication
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

### Deployment Requirements
- **Node.js 18+** for build environment
- **Firebase project** with Firestore enabled
- **Environment variables** properly configured
- **Build optimization** for production deployment

## Common Development Tasks

### Adding a New Story to Vote On
1. Use the `addStory()` function in `session-service.ts`
2. Story requires: title, optional description
3. Auto-generates: id, createdAt timestamp, isEstimated: false

### Testing Real-time Features
1. Open multiple browser tabs/windows
2. Join the same session with different participant names
3. Verify updates appear within 1-2 seconds across all clients

### Modifying Voting Deck Options
1. Update `DECK_OPTIONS` in `create/page.tsx`
2. Update `PREDEFINED_DECKS` in `session/[id]/page.tsx`
3. Ensure deck type matches TypeScript union in `types/session.ts`

## Current Known Issues & Limitations

### Technical Debt (Minimal)
- Some console.log statements in production code (to be removed)
- Error handling could be enhanced with comprehensive error boundaries

### Future Improvements
- Add comprehensive error boundaries
- Implement proper loading states for all async operations
- Add data persistence for offline scenarios
- Implement session expiration and cleanup
- Add comprehensive testing suite

## Summary

Sprintor is now a **complete, production-ready planning poker application** with full project-centric architecture. The implementation includes:

✅ **Core Functionality**: Real-time planning poker sessions with voting, estimation, and history
✅ **Project Management**: Complete project lifecycle with Firebase integration
✅ **Authentication**: Firebase Auth for hosts, anonymous access for participants
✅ **Performance Optimized**: Resolved input lag, optimized React rendering
✅ **User Experience**: Smart reconnection, project-scoped views, responsive design

The architecture successfully supports the **project → sessions → stories** hierarchy with real-time updates, project-specific metrics, and seamless user experience. All code follows TypeScript best practices and is production-ready for Vercel/Railway deployment.

**Ready for production deployment and user testing!** 🚀