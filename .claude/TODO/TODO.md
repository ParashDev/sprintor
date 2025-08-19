# TODO - Sprintor Development Tasks

## ✅ COMPLETED: Epic Management Implementation

### Phase 1: Epic Foundation ✅
- ✅ Created Epic interface in `src/types/epic.ts`
- ✅ Added Epic collection to Firestore
- ✅ Updated Story interface to include `epicId: string`
- ✅ Created Firestore indexes for epic queries

### Phase 2: Epic Service Layer ✅
- ✅ Created `src/lib/epic-service.ts` with full CRUD operations
- ✅ Real-time subscriptions with `subscribeToProjectEpics`
- ✅ Epic statistics calculation with story counts

### Phase 3: Epic Management Page ✅
- ✅ Created `src/app/epics/page.tsx` with grid layout
- ✅ Epic cards showing name, description, color, icon, story counts
- ✅ Story status breakdown badges (backlog, ready, in progress, review, testing, done)
- ✅ Epic status management (planning → active → completed)
- ✅ Responsive mobile layout

### Phase 4: Stories Page Integration ✅
- ✅ Added Epic Sidebar to stories page
- ✅ Collapsible sidebar on desktop, overlay drawer on mobile
- ✅ Epic filtering with URL state management
- ✅ Story-Epic linking in CreateStoryModal
- ✅ Real-time epic story count updates
- ✅ Epic color indicators and progress percentages

## 🚀 NEXT PRIORITY: Planning Session Integration

### Core Concept:
**Stories flow: Backlog → Ready (groomed) → Planning Session (estimation) → In Progress**
- Stories must be in "Ready" status to appear in planning sessions
- Planning sessions are scoped to a specific Epic
- Story creation happens BEFORE planning, not during

### Phase 1: Session Creation Enhancement (Immediate)

#### 1.1 Update Session Creation Page
- [ ] Update `src/app/create/page.tsx`:
  - [ ] Add Project selector dropdown (required)
  - [ ] Add Epic selector dropdown (required, filtered by project)
  - [ ] Store projectId and epicId in session document
  - [ ] Show selected epic name and color in preview
  - [ ] Validate that epic has "ready" stories before allowing session creation

#### 1.2 Update Session Data Model
- [ ] Add to Session interface:
  ```typescript
  interface Session {
    // existing fields...
    epicId?: string           // Links session to specific epic
    epicName?: string         // Display name for UI
    epicColor?: string        // Epic color for visual identification
  }
  ```

### Phase 2: Story Import into Sessions (Immediate)

#### 2.1 Auto-Import Ready Stories
- [ ] When joining session (`src/app/session/[id]/page.tsx`):
  - [ ] Fetch all stories where:
    - `epicId === session.epicId`
    - `status === 'ready'`
  - [ ] Auto-populate session stories list with these stories
  - [ ] Display story count indicator: "X stories ready for estimation"
  - [ ] Show epic name and color badge in session header

#### 2.2 Story Display in Session
- [ ] Update story cards in session to show:
  - [ ] Story title and description
  - [ ] Acceptance criteria count
  - [ ] Story type icon
  - [ ] Priority badge
  - [ ] Business value indicator

### Phase 3: Story Creation in Session (Fallback)

#### 3.1 Integrate CreateStoryModal
- [ ] Replace basic story creation with full CreateStoryModal:
  - [ ] Import existing `CreateStoryModal` component
  - [ ] Auto-populate projectId from session
  - [ ] Auto-populate epicId from session
  - [ ] Default status to "ready" for session-created stories
  - [ ] After creation, add story to session immediately

#### 3.2 Maintain Consistency
- [ ] Ensure session-created stories:
  - [ ] Are saved to Firestore stories collection
  - [ ] Appear in Stories page after session
  - [ ] Follow same data structure as stories created elsewhere
  - [ ] Update epic story counts in real-time

### Phase 4: Estimation Sync Back to Stories (Week 1)

#### 4.1 Update Story After Voting
- [ ] When voting is completed:
  - [ ] Update original story in Firestore:
    - [ ] Set `storyPoints` to final estimate
    - [ ] Set `isEstimated = true`
    - [ ] Set `estimatedInSession = sessionId`
    - [ ] Set `estimationDate = now()`
    - [ ] Add voting history to story document
  - [ ] Optionally move story status from "ready" to "in_progress"

#### 4.2 Real-time Updates
- [ ] Stories page should reflect estimates immediately
- [ ] Epic statistics should update with new story points
- [ ] Session should show "✓ Estimated" badge on completed stories

### Phase 5: UI/UX Enhancements (Week 1-2)

#### 5.1 Session Page Updates
- [ ] Add epic header section showing:
  - [ ] Epic name with color indicator
  - [ ] Epic description
  - [ ] Progress: "X of Y stories estimated"
  - [ ] Total story points estimated so far

#### 5.2 Story Management in Session
- [ ] Add filters:
  - [ ] Show only unestimated stories
  - [ ] Show estimated stories
  - [ ] Search by story title
- [ ] Bulk actions:
  - [ ] Mark multiple stories as "Won't Estimate"
  - [ ] Skip story for later

#### 5.3 Visual Indicators
- [ ] Color-code stories by estimation status:
  - [ ] Gray: Not started
  - [ ] Yellow: Voting in progress
  - [ ] Green: Estimated
  - [ ] Red: Skipped/blocked

## 📊 Implementation Flow

```
1. Stories Page: Create & Groom Stories → Move to "Ready" status
                                ↓
2. Create Session: Select Project → Select Epic → Create Session
                                ↓
3. Join Session: Auto-load "Ready" stories from Epic
                                ↓
4. Estimation: Vote on each story → Save estimates
                                ↓
5. Sync Back: Update story points → Update status → Update epic progress
```

## 🎯 Success Criteria

- [ ] Sessions can only estimate stories that are "Ready"
- [ ] Sessions are scoped to single Epic
- [ ] Story creation uses consistent CreateStoryModal
- [ ] Estimates sync back to original stories
- [ ] Real-time updates across all pages
- [ ] Mobile responsive design maintained

## 📊 Future Enhancements

### Epic Analytics Dashboard
- [ ] Epic burndown chart (stories over time)
- [ ] Story points velocity tracking
- [ ] Average cycle time per story status
- [ ] Completion predictions based on velocity

### Team Management System
- [ ] Create teams collection in Firestore
- [ ] Team member invitation system
- [ ] Role-based permissions
- [ ] Team presets for planning sessions

### Export & Reporting
- [ ] PDF session reports with estimates
- [ ] CSV export of estimation data
- [ ] Sprint planning documents
- [ ] Epic progress reports

### Advanced Features
- [ ] Planning poker timer per story
- [ ] Discussion notes during estimation
- [ ] Confidence level voting
- [ ] Async estimation mode
- [ ] Story splitting during estimation
- [ ] Dependencies between stories
- [ ] Capacity planning based on estimates

## 📝 Notes

- Use existing CreateStoryModal for consistency
- Maintain real-time sync with Firestore
- Follow existing UI patterns and components
- Ensure mobile responsiveness
- All features must support dark mode
- Performance: Handle 50+ stories per session
- Update CLAUDE.md after implementation