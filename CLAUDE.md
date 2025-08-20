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

**🎯 Current Architecture: Agile Hierarchy**
```
User → Projects → Epics → Stories → Planning Sessions
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

### 🏔️ Epic Management System (COMPLETED)
- ✅ **Epic Creation**: Create epics with name, description, color, icon, and acceptance criteria
- ✅ **Epic Management Page**: Grid layout showing all epics with statistics and progress
- ✅ **Epic-Story Linking**: Stories can be assigned to epics with real-time count updates
- ✅ **Epic Filtering**: Filter stories by epic in the Stories page sidebar
- ✅ **Epic Status Workflow**: Planning → Active → Completed status management
- ✅ **Acceptance Criteria**: Define and track epic-level acceptance criteria
- ✅ **Visual Customization**: Color coding and icon selection for epic identification
- ✅ **Real-time Statistics**: Live story count breakdown by status (backlog, ready, in progress, review, testing, done)
- ✅ **Mobile Responsive**: Collapsible sidebar on desktop, overlay drawer on mobile

### 📖 Story Management System
- ✅ **Story Creation**: Advanced story creation with templates and detailed forms
- ✅ **Story Templates**: Pre-built templates for features, bugs, technical stories, etc.
- ✅ **Template Categories**: Organized by feature, bug, technical, research, epic types
- ✅ **Rich Story Data**: User story format, acceptance criteria, business value, risk levels
- ✅ **Performance Optimized**: CreateStoryModal uses uncontrolled inputs for lag-free typing
- ✅ **Kanban Board**: Full drag-and-drop story management with mobile touch support
- ✅ **Story Workflow**: Backlog → Ready → In Progress → Review → Testing → Done columns
- ✅ **Edit/Delete Stories**: Comprehensive story management with confirmation dialogs
- ✅ **Mobile Responsive**: Touch-optimized drag and drop with proper mobile sensors
- ✅ **Search & Filtering**: Real-time story search with instant results
- ✅ **Story Statistics**: Live stats cards showing project progress and completion rates

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
├── epics/page.tsx           # Epic management dashboard
├── stories/page.tsx         # Story management with epic filtering
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
├── epics/
│   └── CreateEpicModal.tsx        # Epic creation/edit modal with acceptance criteria
├── stories/
│   ├── CreateStoryModal.tsx       # Story creation with epic selection
│   └── FormField.tsx              # Reusable form field component
└── CreateProjectModal.tsx # High-performance project creation modal
```

### Services & Types
```
src/lib/
├── firebase.ts            # Firebase configuration and initialization
├── session-service.ts     # All Firestore operations and session management
├── project-service.ts     # Project CRUD operations and Firebase integration
├── story-service.ts       # Story CRUD operations and template management
├── epic-service.ts        # Epic CRUD operations and real-time subscriptions
└── utils.ts              # Utility functions

src/types/
├── session.ts            # TypeScript interfaces for Session, Participant, Story
├── story.ts              # TypeScript interfaces for Story, StoryTemplate, etc.
└── epic.ts               # TypeScript interfaces for Epic, EpicStats

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

### Project Interface
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

### Epic Interface
```typescript
interface Epic {
  id: string
  name: string
  description: string
  projectId: string
  color: string              // Hex color for visual identification
  icon?: string              // Optional Lucide icon name
  status: 'planning' | 'active' | 'completed'
  acceptanceCriteria: string[]
  storyCount: number
  completedStoryCount: number
  createdAt: Date
  updatedAt: Date
  targetDate?: Date
  ownerId: string
  order?: number
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

### Story Interface (Extended)
```typescript
interface Story {
  id: string
  title: string
  description: string
  projectId: string
  epicId?: string              // Links story to epic
  type: 'story' | 'bug' | 'task' | 'spike' | 'epic'
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'testing' | 'done'
  priority: 'Must Have' | 'Should Have' | 'Could Have' | 'Won\'t Have'
  storyPoints?: number
  businessValue?: 'high' | 'medium' | 'low'
  risk?: 'high' | 'medium' | 'low'
  asA?: string                 // User story format
  iWant?: string
  soThat?: string
  acceptanceCriteria: AcceptanceCriterion[]
  labels: string[]
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  assignedTo?: string
  createdBy: string
  createdFromTemplate?: string
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

### Projects Collection
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

### Epics Collection
```
epics/{epicId} = {
  id: string
  name: string
  description: string
  projectId: string           // Links to projects collection
  color: string               // Hex color code
  icon?: string               // Lucide icon name
  status: 'planning' | 'active' | 'completed'
  acceptanceCriteria: string[]
  storyCount: number
  completedStoryCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
  targetDate?: Timestamp
  ownerId: string
  order?: number
}
```

### Stories Collection
```
stories/{storyId} = {
  id: string
  title: string
  description: string
  projectId: string           // Links to projects collection
  epicId?: string             // Links to epics collection
  type: string
  status: string
  priority: string
  storyPoints?: number
  businessValue?: string
  risk?: string
  asA?: string
  iWant?: string
  soThat?: string
  acceptanceCriteria: Array<{
    id: string
    criterion: string
    completed: boolean
  }>
  labels: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
  assignedTo?: string
  createdBy: string
  createdFromTemplate?: string
}
```

### Story Templates Collection (NEW)
```
storyTemplates/{templateId} = {
  id: string
  name: string
  description: string
  category: 'feature' | 'bug' | 'technical' | 'research' | 'epic'
  asA: string
  iWant: string
  soThat: string
  defaultAcceptanceCriteria: string[]
  defaultBusinessValue: number
  defaultPriority: string
  riskLevel: string
  complexity: string
  suggestedStoryPoints?: number[]
  suggestedLabels: string[]
  defaultTimeEstimate?: string
  isDefault: boolean
  projectId?: string                      // null for global templates
  createdAt: Timestamp
  usageCount: number
  lastUsed?: Timestamp
}
```

### Required Firestore Indexes
```
Collection: sessions
Composite Index: hostId (Ascending), projectId (Ascending), createdAt (Descending)
Purpose: Enable project-scoped session queries

Collection: stories
Composite Index: projectId (Ascending), isEstimated (Ascending), updatedAt (Descending)
Purpose: Enable story filtering by estimation status

Collection: storyTemplates
Composite Index: projectId (Ascending), category (Ascending), name (Ascending)
Purpose: Enable template filtering and searching
```

## Critical Implementation Details

### Performance Optimizations
- **Input Lag Fix**: Replaced shadcn/ui components with native HTML inputs in CreateProjectModal and CreateStoryModal
- **React State Management**: Optimized re-renders with proper dependency arrays
- **Project Switching**: Immediate session clearing prevents showing wrong data
- **Time-based Reconnection**: Prevents false reconnect modals on fresh joins

### ⚠️ CRITICAL: Modal Form Performance Guidelines

**To prevent input lag in modal forms (>50ms violations), ALWAYS follow this pattern:**

#### 1. Use Uncontrolled Inputs for Large Forms
```typescript
// ❌ WRONG - Causes expensive re-renders on every keystroke
const [formData, setFormData] = useState({...})
<Input onChange={(e) => setFormData({...formData, field: e.target.value})} />

// ✅ CORRECT - Use refs for uncontrolled inputs
const formRefs = useRef({
  title: null as HTMLInputElement | null,
  description: null as HTMLTextAreaElement | null,
})

<input
  ref={(el) => { if (formRefs.current) formRefs.current.title = el }}
  id="title"
  className="..."
/>
```

#### 2. Replace shadcn/ui Components with Native HTML
```typescript
// ❌ WRONG - shadcn/ui components cause re-render lag
<Input onChange={...} />
<Textarea onChange={...} />

// ✅ CORRECT - Native HTML with shadcn styles
<input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2..." />
<textarea className="flex min-h-[80px] w-full rounded-md border border-input..." />
```

#### 3. Access Form Data on Submit (Not on Change)
```typescript
// ❌ WRONG - State updates on every keystroke
const handleSubmit = () => {
  await createItem(formState.title, formState.description)
}

// ✅ CORRECT - Read from refs on submit only
const handleSubmit = () => {
  await createItem(
    formRefs.current.title?.value || "",
    formRefs.current.description?.value || ""
  )
}
```

#### 4. Template Population Pattern
```typescript
// ✅ CORRECT - Populate refs after form renders
const handleTemplateSelect = (template) => {
  setCurrentStep("form") // Switch to form first
  
  // Use setTimeout to ensure refs exist after render
  setTimeout(() => {
    if (formRefs.current.title) formRefs.current.title.value = template.name
    if (formRefs.current.description) formRefs.current.description.value = template.description
  }, 0)
}
```

#### 5. Form Reset Pattern
```typescript
// ✅ CORRECT - Clear refs instead of state
const resetForm = () => {
  Object.values(formRefs.current).forEach(ref => {
    if (ref) ref.value = ""
  })
}
```

#### Performance Benchmarks
- **Target**: <10ms input handler execution time
- **Violation Threshold**: >50ms (triggers browser warnings)
- **CreateProjectModal**: Optimized from 287ms → <5ms
- **CreateStoryModal**: Optimized from 287ms → <5ms

**Apply this pattern to ALL future modal forms to prevent input lag issues.**

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
syncSessionWithProjectStories(sessionId, stories[], epicId) → Promise<void> // Bidirectional sync
importReadyStoriesIntoSession(sessionId, stories[]) → Promise<void>         // Legacy wrapper
```

### Story Service Extensions (story-service.ts)
```typescript
createStory(storyData) → Promise<string>                      // Create new story
getStoriesByProject(projectId, options?) → Promise<Story[]>   // Get project stories with filtering
getStory(storyId) → Promise<Story|null>                       // Get single story
updateStory(storyId, updates) → Promise<void>                 // Update story
deleteStory(storyId) → Promise<void>                          // Delete story
subscribeToProjectStories(projectId, callback) → Function     // Real-time story updates
getProjectStoryStats(projectId) → Promise<StoryStats>         // Story statistics
createStoryTemplate(templateData) → Promise<string>           // Create story template
getStoryTemplates(projectId?) → Promise<StoryTemplate[]>      // Get available templates

// ✅ IMPLEMENTED: Planning Session Integration
syncSessionWithProjectStories(sessionId, stories[], epicId) → Promise<void> // Bidirectional sync
importReadyStoriesIntoSession(sessionId, stories[]) → Promise<void>         // Legacy wrapper function
```

## Current Architecture Status: PRODUCTION READY ✅

### ✅ COMPLETED: Unified Story-Session Integration
- **Project-Centric Planning**: Full project → epics → stories → sessions hierarchy
- **Firebase Authentication**: Host authentication with Google/Email
- **Project Management**: Complete CRUD operations with real-time updates
- **Epic Management**: Complete epic lifecycle with story assignment and progress tracking
- **Story Management**: Full Kanban workflow with drag-and-drop, mobile support
- **Unified Story System**: Single story creation flow, eliminated dual story types
- **Bidirectional Real-time Sync**: Stories page ↔ Planning sessions with complete data sync
- **Performance Optimized**: Input lag resolved, React state optimized, mobile drag performance
- **Smart Reconnection**: Time-based logic prevents false reconnect prompts

### ✅ COMPLETED: Story-Planning Session Integration
**RESOLVED**: Stories created in Stories page and planning session stories are now fully integrated

**Implemented Solution**:
1. ✅ **Unified Story Creation**: All stories created via Stories page CreateStoryModal
2. ✅ **Real-time Import**: Ready stories automatically appear in planning sessions
3. ✅ **Bidirectional Sync**: Complete sync between Stories page and sessions (add/update/delete)
4. ✅ **Estimation Sync**: Voting results automatically sync back as story points
5. ✅ **Emergency Creation**: In-session story creation with auto-ready status
6. ✅ **Status Integration**: Stories workflow integrated with session lifecycle
7. ✅ **Permission Security**: Host-only data sync, participants vote safely

**Production Workflow**:
```
1. Team prepares backlog in Stories page (create stories, set priorities, acceptance criteria)
2. Stories marked as 'Ready' automatically appear in planning sessions
3. Team votes on stories during planning session (initial + re-voting)
4. Estimation results automatically sync back as story points
5. Real-time updates: edit/delete stories in Stories page reflects in sessions immediately
6. Emergency story creation available during planning sessions
```

#### Additional Planned Enhancements
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

### Adding Stories for Estimation
1. Create stories in Stories page with full story details
2. Set story status to 'Ready' to make available for planning sessions
3. Stories automatically appear in sessions for the selected epic
4. Use "Emergency Story" button in sessions for quick creation during planning

### Testing Real-time Features
1. Open multiple browser tabs/windows
2. Join the same session with different participant names
3. Verify updates appear within 1-2 seconds across all clients

### Modifying Voting Deck Options
1. Update `DECK_OPTIONS` in `create/page.tsx`
2. Update `PREDEFINED_DECKS` in `session/[id]/page.tsx`
3. Ensure deck type matches TypeScript union in `types/session.ts`

## Recent Updates & Improvements (Latest)

### 🎨 UI/UX Enhancements (COMPLETED)
- ✅ **Clean Modal Design**: Removed all colors from "View Details" modal in planning page
- ✅ **Team Members Layout**: Changed from row-based to responsive grid layout (4/3/2 columns)
- ✅ **Accessibility Fix**: Added proper DialogDescription to prevent accessibility warnings
- ✅ **Consistent Theming**: All modals now use black/white design scheme with muted backgrounds

### 🧹 Code Quality Improvements (COMPLETED)
- ✅ **Debug Cleanup**: Removed all console.log statements from service files and components
- ✅ **TypeScript Fixes**: Fixed error handling types and removed 'any' type usage
- ✅ **Import Cleanup**: Removed unused imports (getProjectSessionStats, getEpicsByProject)
- ✅ **Leftover Code Removal**: Cleaned up unused variables and dead code

### 🔧 Technical Improvements (COMPLETED)
- ✅ **Error Handling**: Improved error typing with proper instanceof checks
- ✅ **Firebase Compatibility**: Fixed Firestore doc() calls with proper string casting
- ✅ **Linting Compliance**: Resolved all TypeScript ESLint warnings and errors
- ✅ **Production Ready**: Removed all debugging code while maintaining error logging

## Current Known Issues & Limitations

### Technical Debt (Minimal)
- Error handling could be enhanced with comprehensive error boundaries
- Some NOTE comments documenting architectural changes (intentionally kept for reference)

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
✅ **Story Management**: Full Kanban board with drag-and-drop, mobile touch support
✅ **Authentication**: Firebase Auth for hosts, anonymous access for participants
✅ **Performance Optimized**: Resolved input lag, optimized React rendering, mobile drag performance
✅ **User Experience**: Smart reconnection, project-scoped views, responsive design

The architecture successfully supports the **project → sessions → stories** hierarchy with real-time updates, project-specific metrics, and seamless user experience. All code follows TypeScript best practices and is production-ready for Vercel/Railway deployment.

**The unified story-session integration has been completed, transforming Sprintor from a standalone planning poker tool into a complete agile story management system with full bidirectional sync between story preparation and estimation phases.**

**All major architectural goals achieved and system is production-ready!** 🚀