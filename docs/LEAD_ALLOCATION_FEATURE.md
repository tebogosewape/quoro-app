# Lead Allocation Feature

## Overview

Created a comprehensive lead allocation system that allows Admin, Manager, and CEO roles to assign leads to agent users. When a lead is assigned, a task is automatically created for the agent. Agents can click on these tasks from their dashboard to be redirected to the client onboarding wizard with lead data pre-populated.

**New: Bulk Operations Support** - Managers can now select multiple leads and assign/unassign them in bulk, streamlining the lead distribution process.

## Implementation Details

### 1. Lead Allocation Page

**File:** `apps/web/src/pages/Admin/LeadAllocation.tsx`

**Features:**

- Modern gradient header matching design system (#667eea → #764ba2)
- Statistics cards showing total leads, unassigned, and assigned
- Advanced filtering:
    - Search by name, phone, or ID number
    - Filter by lead outcome
    - Filter by assignment status (all/unassigned/by agent)
- **Bulk selection:**
    - Checkboxes for selecting individual leads
    - "Select All" checkbox with indeterminate state support
    - Clear selection button
    - Bulk action bar appears when leads are selected
- Lead table displaying:
    - Selection checkbox
    - Time received
    - Contact information
    - Franchise and affiliate
    - Lead status
    - Assignment status
    - Action buttons (Assign/Reassign and Unassign)
- Individual lead actions:
    - Assign/Reassign modal for selecting agent
    - Quick unassign button for assigned leads
- **Bulk operations:**
    - Bulk Assign: Assign multiple leads to one agent at once
    - Bulk Unassign: Remove assignment from multiple leads
    - Confirmation dialog for bulk unassign
- Automatic task creation when lead is assigned (single or bulk)

**Permissions:** Requires `roles.manage` permission (Admin, Manager, CEO)

**Route:** `/leads/allocation`

### 2. Sidebar Menu Integration

**File:** `apps/web/src/components/layout/Sidebar/Sidebar.tsx`

Added "Lead Allocation" menu item under Lead Management section:

- Visible only to users with `roles.manage` permission
- Icon: User with plus sign
- Located between "Import Leads" and other lead management options

### 3. Routing Configuration

**File:** `apps/web/src/App.tsx`

Added route:

```tsx
<Route
    path="/leads/allocation"
    element={
        <PrivateRoute permission="roles.manage">
            <LeadAllocation />
        </PrivateRoute>
    }
/>
```

### 4. Onboarding Wizard Enhancement

**File:** `apps/web/src/pages/Clients/OnboardingWizard.tsx`

**Enhancements:**

- Added support for accepting lead data via React Router navigation state
- Pre-populates form fields when lead data is provided:
    - `firstNames`: Extracted from lead name (first word)
    - `surname`: Extracted from lead name (remaining words)
    - `phone`: Lead cell number
    - `idNumber`: Lead ID number

**Usage:**

```tsx
navigate('/clients/new', {
    state: { leadData: {...} }
});
```

### 5. Agent Dashboard Enhancement

**File:** `apps/web/src/features/dashboard/components/clientflow/ClientflowDashboard.tsx`

**Features:**

- Added `handleTaskClick` function to detect lead conversion tasks
- Made tasks clickable with visual feedback (hover effect)
- Lead conversion tasks show:
    - Special icon (user with plus)
    - Lead information (name, phone)
    - "Click to convert to client →" prompt
- When clicked:
    - If lead task: Navigates to `/clients/new` with pre-filled lead data
    - If client task: Navigates to client details page

**Visual Indicators:**

- Cursor changes to pointer on hover for actionable tasks
- Background color changes on hover (#f8f9fa)
- Lead tasks show inline SVG icon
- Lead data preview in task description

## Workflow

### Manager Workflow - Single Lead Assignment

1. Navigate to Lead Management → Lead Allocation
2. View list of leads with filtering options
3. Click "Assign" or "Reassign" button on a lead
4. Select agent from dropdown (or leave empty to unassign)
5. Click "Assign Lead"
6. System:
    - Updates `lead.allocatedTo` with agent's full name
    - Creates task with type `follow_up`, status `assigned`
    - Task metadata includes:
        - `leadId`: Reference to lead
        - `leadData`: All lead information for pre-filling
7. Alternative: Click the red "X" button to quickly unassign a lead

### Manager Workflow - Bulk Operations

**Bulk Assignment:**

1. Navigate to Lead Management → Lead Allocation
2. Select multiple leads using checkboxes (or use "Select All")
3. Click "Bulk Assign" button in the action bar
4. Select agent from dropdown in the modal
5. Click "Assign Leads"
6. System:
    - Updates all selected leads with agent assignment
    - Creates individual tasks for each lead
    - Shows success message with count
7. Selection is cleared automatically

**Bulk Unassignment:**

1. Navigate to Lead Management → Lead Allocation
2. Select multiple assigned leads using checkboxes
3. Click "Bulk Unassign" button in the action bar
4. Confirm the action in the dialog
5. System:
    - Removes agent assignment from all selected leads
    - Shows success message with count
6. Selection is cleared automatically

**Quick Actions:**

- Click "Clear selection" to deselect all leads
- Select/deselect individual leads by clicking checkboxes
- Use "Select All" checkbox in table header for convenience
- Indeterminate state shows when some (but not all) leads are selected

### Agent Workflow

1. Log in and view dashboard
2. See "Outstanding Tasks" section
3. Lead conversion tasks show:
    - Title: "Convert Lead: [Name]"
    - Lead preview with name and phone
    - "Click to convert to client →" prompt
4. Click task
5. Redirected to onboarding wizard with:
    - Name pre-filled (split into first/last)
    - Phone number pre-filled
    - ID number pre-filled
6. Complete client onboarding
7. Task can be marked complete

## API Integration

### Lead Assignment (Single)

- **Endpoint:** `PATCH /leads/:id`
- **Payload:** `{ allocatedTo: "Agent Name" }` or `{ allocatedTo: null }` to unassign

### Lead Assignment (Bulk)

- **Implementation:** Multiple parallel API calls
- **Operations:**
    - Bulk Assign: `Promise.all()` for updating leads and creating tasks
    - Bulk Unassign: `Promise.all()` for updating multiple leads
- **Error Handling:** Individual failures are caught and reported

### Task Creation

- **Endpoint:** `POST /tasks`
- **Payload:**

```json
{
    "title": "Convert Lead: John Doe",
    "description": "Follow up with lead and convert to client...",
    "type": "follow_up",
    "status": "assigned",
    "priority": "normal",
    "assignedToUserId": "agent-uuid",
    "metadata": {
        "leadId": "lead-uuid",
        "leadData": {
            "name": "John Doe",
            "cell": "0821234567",
            "idNumber": "8001015800087",
            "franchise": "JHB",
            "affiliate": "Partner Co"
        }
    }
}
```

### Agent Listing

- **Endpoint:** `GET /users`
- **Query:** `{ role: 'agent', status: 'active', all: true }`

## Design System Compliance

### Colors

- Primary gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Border radius: 12px for cards, 16px for headers
- Shadow: `0 2px 4px rgba(0,0,0,0.1)` for cards

### Icons

- All icons are inline SVG (no icon libraries)
- Consistent sizing: 16px for table actions, 18px for menu items
- Stroke width: 2px

### Typography

- Header: h2 with mb-1
- Subtitle: opacity-75 on colored backgrounds
- Stats: fs-4 for values, small for labels

### Badges

- Success: green for converted leads
- Warning: yellow for pending leads
- Info: blue for assigned agents
- Secondary: grey for other statuses

## Files Modified

1. ✅ `apps/web/src/pages/Admin/LeadAllocation.tsx` (NEW - Enhanced with bulk operations)
2. ✅ `apps/web/src/components/layout/Sidebar/Sidebar.tsx`
3. ✅ `apps/web/src/App.tsx`
4. ✅ `apps/web/src/pages/Clients/OnboardingWizard.tsx`
5. ✅ `apps/web/src/features/dashboard/components/clientflow/ClientflowDashboard.tsx`

## Testing Checklist

### Basic Functionality

- [ ] Admin can access Lead Allocation page
- [ ] Non-admin users cannot access Lead Allocation page
- [ ] Leads can be filtered by outcome, assignment, and search
- [ ] Agents appear in dropdown (active agents only)

### Single Lead Assignment

- [ ] Assigning lead updates UI immediately
- [ ] Task is created successfully (check via API/database)
- [ ] Unassign button appears for assigned leads
- [ ] Quick unassign works correctly
- [ ] Agent sees task on dashboard
- [ ] Clicking lead task navigates to onboarding
- [ ] Onboarding form is pre-filled with lead data
- [ ] Form submission creates client successfully
- [ ] Task can be marked complete after client creation

### Bulk Operations

- [ ] Checkboxes appear for all leads
- [ ] Individual lead selection works
- [ ] "Select All" checkbox selects all visible leads
- [ ] "Select All" shows indeterminate state when some leads selected
- [ ] Bulk action bar appears when leads are selected
- [ ] Selection count displays correctly
- [ ] "Clear selection" button works
- [ ] Bulk Assign modal opens with correct count
- [ ] Bulk Assign creates tasks for all selected leads
- [ ] Bulk Assign updates all leads simultaneously
- [ ] Bulk Assign shows success message with count
- [ ] Bulk Unassign shows confirmation dialog
- [ ] Bulk Unassign removes assignment from all selected leads
- [ ] Bulk Unassign shows success message with count
- [ ] Selection clears after bulk operations
- [ ] Error handling works for failed bulk operations

## Future Enhancements

1. ~~**Bulk Assignment:** Allow selecting multiple leads and assigning to same agent~~ ✅ **COMPLETED**
2. **Auto-assignment:** Distribute leads evenly across available agents
3. **Task Completion:** Automatically complete task when client is created
4. **Lead History:** Track allocation history and reassignments
5. **Performance Metrics:** Track agent conversion rates from leads to clients
6. **Notifications:** Email/SMS notification to agent when lead is assigned
7. **Lead Aging:** Highlight leads that haven't been followed up within X days
8. **Agent Workload:** Show agent's current lead count before assignment
