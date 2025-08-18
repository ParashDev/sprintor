# TODO - Sprintor Development Tasks

## <¯ Current Priority: Epic Management Implementation

### Phase 1: Epic Foundation (Priority 1) =4

#### 1.1 Database & Data Model
- [ ] Create Epic interface in `src/types/epic.ts`
  ```typescript
  interface Epic {
    id: string
    name: string
    description: string
    projectId: string
    color: string // hex color for visual identification
    icon?: string // optional icon
    status: 'planning' | 'active' | 'completed'
    storyCount: number
    completedStoryCount: number
    createdAt: Date
    updatedAt: Date
    targetDate?: Date
    ownerId: string
  }
  ```
- [ ] Add Epic collection to Firestore
- [ ] Update Story interface to include `epicId: string`
- [ ] Create Firestore indexes for epic queries

#### 1.2 Epic Service Layer
- [ ] Create `src/lib/epic-service.ts` with:
  - [ ] `createEpic(epicData) ’ Promise<string>`
  - [ ] `getEpicsByProject(projectId) ’ Promise<Epic[]>`
  - [ ] `getEpic(epicId) ’ Promise<Epic|null>`
  - [ ] `updateEpic(epicId, updates) ’ Promise<void>`
  - [ ] `deleteEpic(epicId) ’ Promise<void>`
  - [ ] `subscribeToProjectEpics(projectId, callback) ’ Function`
  - [ ] `getEpicStats(epicId) ’ Promise<EpicStats>`

#### 1.3 Epic Management Page (`/epics`)
- [ ] Create `src/app/epics/page.tsx` (follow projects page design)
- [ ] Features:
  - [ ] Project selector dropdown (same as stories page)
  - [ ] Epic cards grid layout (2-3 columns)
  - [ ] Create Epic button
  - [ ] Epic card showing:
    - Name & description
    - Color indicator
    - Story count badge
    - Progress bar
    - Edit/Delete actions
- [ ] Responsive mobile layout
- [ ] Use same styling/components as projects page

#### 1.4 Create/Edit Epic Modal
- [ ] Create `src/components/epics/CreateEpicModal.tsx`
- [ ] Follow CreateStoryModal structure (fixed header/footer, scrollable content)
- [ ] Fields:
  - [ ] Epic name (required)
  - [ ] Description
  - [ ] Color picker (preset colors)
  - [ ] Icon selector (optional)
  - [ ] Target date
  - [ ] Status
- [ ] Performance optimized (uncontrolled inputs)

### Phase 2: Stories Page Integration =á

#### 2.1 Stories Page Redesign
- [ ] Add Epic Sidebar to stories page
  - [ ] Collapsible sidebar (left side)
  - [ ] List epics for selected project
  - [ ] Epic color indicators
  - [ ] Story count badges
  - [ ] "All Stories" option
  - [ ] Quick add epic button
  - [ ] Active epic highlight

#### 2.2 Story-Epic Integration
- [ ] Update CreateStoryModal:
  - [ ] Add epic selector dropdown
  - [ ] Default to currently selected epic
  - [ ] Required field validation
- [ ] Update story cards:
  - [ ] Show epic color stripe
  - [ ] Epic name badge
- [ ] Update story service:
  - [ ] Filter stories by epicId
  - [ ] Update epic story counts on CRUD

#### 2.3 Epic Filtering & Navigation
- [ ] URL state for selected epic (`?project=xxx&epic=xxx`)
- [ ] Persist epic selection in localStorage
- [ ] Update stats cards to show epic-specific metrics
- [ ] Breadcrumb: Projects ’ [Project Name] ’ Epics ’ [Epic Name]

### Phase 3: Planning Session Integration =â

#### 3.1 Epic-Aware Planning Sessions
- [ ] When creating session, optionally select epic
- [ ] Import stories from specific epic
- [ ] Show epic name in session view
- [ ] Sync estimates back to epic stories

#### 3.2 Epic Analytics
- [ ] Epic progress tracking
- [ ] Epic velocity metrics
- [ ] Epic burndown chart
- [ ] Epic completion predictions

## =Ë Implementation Order

1. **Week 1**: Database & Epic Service (1.1, 1.2)
2. **Week 1**: Epic Management Page (1.3, 1.4)
3. **Week 2**: Stories Sidebar Integration (2.1)
4. **Week 2**: Story-Epic Linking (2.2, 2.3)
5. **Week 3**: Planning Integration (3.1)
6. **Week 3**: Analytics (3.2)

## <¨ UI/UX Guidelines

### Epic Page Design (Match Projects Page)
- Grid layout with cards
- Same header structure with title and "Create Epic" button
- Dropdown for project selection
- Responsive grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Card hover effects and shadows
- Same color scheme and spacing

### Epic Sidebar (Stories Page)
- Width: 260px on desktop, full width drawer on mobile
- Sticky positioning
- Smooth collapse animation
- Epic items with:
  - Color dot indicator
  - Epic name
  - Story count badge
  - Hover state

### Color Palette for Epics
```javascript
const EPIC_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' }
]
```

## =Ý Notes

- Keep consistent with existing design patterns
- Use shadcn/ui components where possible
- Maintain mobile-first responsive design
- Follow TypeScript strict typing
- Implement loading states for all async operations
- Add proper error handling
- Update CLAUDE.md documentation after implementation

##  Completed Tasks

- [x] Story Management System with Kanban board
- [x] Drag and drop with mobile support
- [x] Story templates and creation flow
- [x] Project-based story filtering

## = In Progress

- [ ] Epic Management Implementation (Current Focus)

## =€ Future Enhancements

- [ ] Epic templates
- [ ] Epic dependencies and relationships
- [ ] Epic roadmap view
- [ ] Cross-project epic linking
- [ ] Epic capacity planning
- [ ] AI-powered epic breakdown suggestions