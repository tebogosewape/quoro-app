# Team Lead Dashboard Implementation

## Overview

The Team Lead Dashboard is a new feature that allows team leaders to manage their assigned agents, track performance metrics, and control agent leave status.

## Features Implemented

### 1. Database Changes

- **Added `isOnLeave` field to User entity**
    - Type: `TINYINT(1)` / `boolean`
    - Default value: `0` (false)
    - Field name in database: `is_on_leave`
    - Purpose: Tracks whether an agent is currently on leave and should not receive new lead allocations

### 2. Team Structure Setup

- **Seed script created**: `apps/api/src/database/seeds/setup-team-lead.ts`
    - Finds existing team leader or creates one (email: teamlead@qmapi.com)
    - Assigns all agents to the team leader via `managerId` field
    - Successfully executed - assigned 4 agents:
        - Tester Note
        - Lindiwe Dlamini
        - Machai Mafaesa
        - Neo Mahlangu

### 3. Backend API Endpoints

#### Get Team Lead Agents

- **Endpoint**: `GET /users/team-lead/agents`
- **Access**: Team Leader role only
- **Returns**: Array of agents with stats:
    ```typescript
    {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: UserRole;
        isOnLeave: boolean;
        totalLeads: number;
        convertedClients: number;
        conversionRate: number;
    }
    ```
- **Stats Calculation**:
    - `totalLeads`: Count of leads where `allocatedTo` = agent's full name
    - `convertedClients`: Count of clients where:
        - `assignedAgentId` = agent's ID
        - `status` in [APPROVED, ACTIVE, COMPLETED]
    - `conversionRate`: (convertedClients / totalLeads) \* 100

#### Update Agent Leave Status

- **Endpoint**: `PATCH /users/:id/leave-status`
- **Access**: Team Leader role only
- **Body**: `{ isOnLeave: boolean }`
- **Validation**: Only allows updating agents managed by the requesting team leader
- **Audit**: Creates audit log entry for leave status changes

### 4. Lead Allocation Protection

- **Modified**: `apps/api/src/leads/leads.service.ts` - `bulkAllocate` method
- **Behavior**:
    - Checks if agent is on leave before allocating leads
    - Throws `BadRequestException` if agent is on leave
    - Error message: "Cannot allocate leads to [name] - agent is currently on leave"
    - Prevents on-leave agents from receiving new leads

### 5. Frontend Implementation

#### API Client Functions

- **File**: `apps/web/src/api/users.ts`
- Added types:
    - `AgentStats` - agent with performance metrics
    - `AgentsListResponse` - wrapper for agents array
- Added functions:
    - `getTeamLeadAgents()` - fetch all managed agents with stats
    - `updateAgentLeaveStatus(agentId, isOnLeave)` - toggle leave status

#### Team Lead Dashboard Component

- **File**: `apps/web/src/pages/TeamLead/TeamLeadDashboard.tsx`
- **Features**:
    - Role-based access control (team_leader only)
    - Data table showing all managed agents
    - Real-time stats: Total Leads, Converted Clients, Conversion Rate
    - Toggle switch for leave status (inline editing)
    - Auto-refresh every 30 seconds
    - Manual refresh button
    - Team summary cards:
        - Total Agents
        - Active Agents
        - Agents On Leave
        - Total Team Leads
    - Conversion rate color coding:
        - Green: ≥ 20%
        - Yellow: ≥ 10%
        - Gray: < 10%

#### Routing

- **Route**: `/team/dashboard`
- **Protection**: `PrivateRoute` with role check for `team_leader`
- **Updated**: `apps/web/src/App.tsx` with new route
- **Updated**: `apps/web/src/components/layout/Auth/PrivateRoute.tsx` to support role-based checks

#### Navigation

- **Sidebar Link**: "Team Management"
- **Icon**: Team/users icon (multiple people)
- **Visibility**: Only shown to users with `team_leader` role
- **Location**: Between "Lead Management" and "Administration" sections

## Business Rules

1. **Leave Status**:
    - Agents on leave cannot receive new lead allocations
    - Leave status can only be changed by the agent's team leader
    - Status is visible in the team dashboard

2. **Conversion Tracking**:
    - Uses client status from `clients` table (not lead outcome)
    - Counts statuses: APPROVED, ACTIVE, COMPLETED as conversions
    - Calculates conversion rate as percentage

3. **Team Assignment**:
    - Agents are assigned to team leaders via `managerId` field
    - Team leaders can only view/manage their assigned agents
    - Existing team leader: Nandi Maseko (nandi.maseko@quorafinancial.co.za)

## Files Modified

### Backend

1. `apps/api/src/entities/user.entity.ts` - Added `isOnLeave` field
2. `apps/api/src/users/users.controller.ts` - Added 2 new endpoints
3. `apps/api/src/users/users.service.ts` - Added `getTeamLeadAgents` and `updateAgentLeaveStatus` methods
4. `apps/api/src/users/users.module.ts` - Added Lead and Client repositories
5. `apps/api/src/leads/leads.service.ts` - Added leave status check in `bulkAllocate`
6. `apps/api/src/leads/leads.module.ts` - Added User repository

### Frontend

1. `apps/web/src/api/users.ts` - Added types and API functions
2. `apps/web/src/pages/TeamLead/TeamLeadDashboard.tsx` - New component
3. `apps/web/src/App.tsx` - Added route
4. `apps/web/src/components/layout/Auth/PrivateRoute.tsx` - Added role support
5. `apps/web/src/components/layout/Sidebar/Sidebar.tsx` - Added nav link

### Database

1. Migration: `1765179117277-AddIsOnLeaveToUsers.ts` - Added `is_on_leave` column
2. Seed: `apps/api/src/database/seeds/setup-team-lead.ts` - Team structure setup

## Testing

### Test the Team Lead Dashboard

1. **Login as Team Leader**:
    - Email: nandi.maseko@quorafinancial.co.za
    - Navigate to "Team Management" in sidebar

2. **Verify Stats Display**:
    - Check that all 4 agents are listed
    - Verify lead counts are accurate
    - Verify conversion rates calculate correctly

3. **Test Leave Toggle**:
    - Toggle an agent to "On Leave"
    - Verify toast notification appears
    - Check that status persists after refresh

4. **Test Lead Allocation Protection**:
    - Set an agent to "On Leave"
    - Try to allocate leads to that agent via bulk allocation
    - Should receive error: "Cannot allocate leads to [name] - agent is currently on leave"

### API Testing

```bash
# Get team lead agents (requires team_leader token)
GET /users/team-lead/agents
Authorization: Bearer <team_leader_token>

# Update agent leave status
PATCH /users/<agent_id>/leave-status
Authorization: Bearer <team_leader_token>
Content-Type: application/json
{
  "isOnLeave": true
}
```

## Future Enhancements

1. **Performance Metrics**:
    - Add time-based filtering (last 30 days, last quarter)
    - Track conversion trends over time
    - Add agent activity logs

2. **Leave Management**:
    - Add leave date ranges (from/to)
    - Track leave history
    - Automatic leave expiry

3. **Team Communication**:
    - In-app notifications to agents
    - Leave request workflow
    - Notes/comments on agent performance

4. **Reporting**:
    - Export team performance data
    - Scheduled email reports
    - Comparative analysis across teams

## Dependencies

- **Backend**: NestJS, TypeORM, MySQL
- **Frontend**: React, React Bootstrap, React Query, React Router
- **Authentication**: JWT with role-based access control
