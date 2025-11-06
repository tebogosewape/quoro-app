# PHASE 1 EXECUTION PLAN — ClientsOverview Integration

**Objective**: Replace `seedDirectory()` mock data with real API calls to `getClients()`.

**Status**: Ready to Execute

---

## Current State Analysis

### ClientsOverview.tsx (Lines 1-365)

**Current Flow**:

1. Component mounts
2. `useEffect` on line 130: calls `seedDirectory()` → returns 50 fake clients
3. State: `all` = seedDirectory() result
4. Filters applied client-side: search, status, agent
5. Sorting applied client-side
6. Pagination applied client-side (12 per page)

**Issues**:

- No real data persistence
- Agents list derived from mock (unreliable)
- No server-side pagination (loads 50 items every time)
- Search doesn't hit API
- Agent filter doesn't reflect real assignments

### API Available

**`getClients(query?: ClientSearchQuery)`** from `clients.api.ts`

```typescript
getClients({ page?, limit?, search?, status?, clientType?, sortBy?, sortOrder? })
  → Promise<ClientListResponse>
  → { clients: Client[], total, page, limit, totalPages }
```

**Key Features**:

- Server-side pagination
- Search across name, email, ID, phone
- Status filtering
- Sorting support
- RBAC built-in (agents see own clients)

---

## Refactoring Strategy

### 1. Type Mapping: `Client` → `ClientListItem`

**Backend Client** (from API):

```typescript
{
    id: string;
    idNumber: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    status: ClientStatus; // 'lead' | 'consultation_scheduled' | ... | 'withdrawn'
    clientType: ClientType;
    monthlyIncome: number;
    monthlyExpenses: number;
    totalDebt: number;
    assignedAgentId: string | null;
    createdAt: string; // ISO
    updatedAt: string; // ISO
    // ... more fields
}
```

**Frontend ClientListItem**:

```typescript
{
    id: string;
    name: string;
    phone: string;
    email: string;
    nationalId: string;
    status: 'new' | 'active' | 'awaiting_payment' | 'documents_outstanding' | 'finalised';
    product: string;
    createdAt: string;
    lastActivity: string;
    agent: string;
    balance: number;
}
```

**Mapping Strategy**:

Need to fetch:

1. Client details (basic)
2. Assigned agent name (via lookup or populate)
3. Primary product name (from clientProducts)
4. Outstanding balance (totalDebt)

**Challenge**: Backend Client doesn't directly map to `product` and `agent` name.

**Solution**:

- If backend includes `assignedAgent` relationship and `clientProducts` array, map those
- If not, we'll need 2 queries per client (inefficient) OR modify API to include
- For MVP: Use `totalDebt` as balance, extract first product if available

### 2. State Management Changes

**Current**:

```typescript
const [all, setAll] = useState<ClientListItem[]>([]);
useEffect(() => {
    setTimeout(() => setAll(seedDirectory()), 200);
}, []);
```

**Proposed**:

```typescript
const [all, setAll] = useState<ClientListItem[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);

useEffect(() => {
    const fetchClients = async () => {
        setLoading(true);
        setError(null);
        try {
            const query: ClientSearchQuery = {
                page: currentPage,
                limit: 12,
                search: q || undefined,
                status: status === 'all' ? undefined : (status as ClientStatus),
            };
            const response = await getClients(query);
            setAll(mapClientsToListItems(response.clients));
            setTotalPages(response.totalPages);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to fetch clients';
            setError(msg);
            console.error('Failed to fetch clients:', err);
        } finally {
            setLoading(false);
        }
    };
    fetchClients();
}, [currentPage, q, status]);

// Map function
const mapClientsToListItems = (clients: Client[]): ClientListItem[] => {
    return clients.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        phone: c.phoneNumber,
        email: c.email,
        nationalId: c.idNumber,
        status: mapBackendStatusToFrontend(c.status),
        product: c.clientProducts?.[0]?.productName || 'N/A',
        createdAt: c.createdAt,
        lastActivity: c.updatedAt,
        agent: c.assignedAgent?.firstName
            ? `${c.assignedAgent.firstName} ${c.assignedAgent.lastName || ''}`.trim()
            : 'Unassigned',
        balance: c.totalDebt || 0,
    }));
};

// Status mapping
const mapBackendStatusToFrontend = (status: ClientStatus): ClientListItem['status'] => {
    const map: Record<ClientStatus, ClientListItem['status']> = {
        lead: 'new',
        consultation_scheduled: 'new',
        documentation_pending: 'documents_outstanding',
        under_review: 'new',
        approved: 'active',
        rejected: 'new',
        active: 'active',
        completed: 'finalised',
        withdrawn: 'finalised',
    };
    return map[status] || 'new';
};
```

### 3. Filtering & Pagination

**Remove**:

- Client-side filtering (`useMemo` filter logic)
- Client-side sorting
- Client-side pagination

**Keep**:

- Filter UI controls (search, status dropdown, agent dropdown)
- Sort UI controls (column headers)
- Pagination UI controls

**Wire to API**:

- Search: Pass to `search` param
- Status: Pass to `status` param (after mapping)
- Pagination: Pass `page` and `limit=12` params
- Sort: Extract from `sortKey` and `sortDir`, pass if API supports

### 4. Error Handling & Loading States

**Add**:

- Loading spinner while fetching
- Error message display with retry button
- Empty state message

**UI Changes**:

```tsx
{
    error && (
        <div className="alert alert-danger mb-3" role="alert">
            {error}
            <Button variant="link" onClick={() => fetchClients()} className="ms-2 p-0">
                Retry
            </Button>
        </div>
    );
}

{
    loading && (
        <div className="text-center py-5">
            <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
            </Spinner>
        </div>
    );
}

{
    !loading && all.length === 0 && (
        <tr>
            <td colSpan={8} className="text-center text-muted py-5">
                No clients found.
            </td>
        </tr>
    );
}
```

---

## Implementation Steps

### Step 1: Create Helper Functions

- `mapClientsToListItems()`
- `mapBackendStatusToFrontend()`

### Step 2: Update State

- Add `loading`, `error`, `currentPage`, `totalPages`
- Remove/refactor `filtered`, `agents` (derived now)
- Update `useEffect` to call real API

### Step 3: Update UI

- Wire pagination to `currentPage` state
- Add loading spinner
- Add error display with retry
- Update agent dropdown (populate from API response)

### Step 4: Handle Sort & Search

- For now: Accept that API response is paginated (can't sort by column if only 12 items)
- Consider: Add backend sort params if needed later

### Step 5: Test

- Mock `getClients()` with sample data
- Verify state updates correctly
- Verify error handling
- Verify pagination

---

## Code Diff Preview

### Imports to Add

```typescript
import {
    getClients,
    type Client,
    type ClientStatus,
    type ClientListResponse,
    type ClientSearchQuery,
} from '@/api/clients.api';
import { Spinner } from 'react-bootstrap';
import { NormalizedApiError } from '@/api/axios.config';
```

### Remove Functions

- `seedDirectory()` (lines 41-100)

### Update useEffect

```typescript
useEffect(() => {
    let isMounted = true;

    const fetchClients = async () => {
        setLoading(true);
        setError(null);
        try {
            const query: ClientSearchQuery = {
                page: currentPage,
                limit: 12,
                search: q || undefined,
                status: status === 'all' ? undefined : mapStatusToBackend(status),
            };
            const response = await getClients(query);
            if (isMounted) {
                setAll(mapClientsToListItems(response.clients));
                setTotalPages(response.totalPages);
            }
        } catch (err) {
            if (isMounted) {
                const msg = err instanceof Error ? err.message : 'Failed to fetch clients';
                setError(msg);
            }
        } finally {
            if (isMounted) {
                setLoading(false);
            }
        }
    };

    fetchClients();
    return () => {
        isMounted = false;
    };
}, [currentPage, q, status]);
```

### Update Pagination

```typescript
// Remove these lines:
// const [page, setPage] = useState(1);
// const pageSize = 12;
// const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
// useEffect(() => setPage(1), [q, status, sortKey, sortDir, agent]);
// const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

// Keep: currentPage, totalPages, all (already paginated)
// Use: all instead of pageRows
// Use: setCurrentPage instead of setPage
```

---

## Testing Strategy

### Unit Tests (Jest)

```typescript
describe('ClientsOverview', () => {
  it('should fetch clients on mount', async () => {
    const mockClients = [/* ... */];
    vi.mocked(getClients).mockResolvedValueOnce({
      clients: mockClients,
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });

    render(<ClientsOverview />);

    await waitFor(() => {
      expect(getClients).toHaveBeenCalled();
    });
  });

  it('should search clients when query changes', async () => {
    render(<ClientsOverview />);

    const searchInput = screen.getByPlaceholderText(/Search/);
    fireEvent.change(searchInput, { target: { value: 'Phalatse' } });

    await waitFor(() => {
      expect(getClients).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Phalatse' })
      );
    });
  });

  it('should filter by status', async () => {
    render(<ClientsOverview />);

    const statusSelect = screen.getByDisplayValue(/All statuses/);
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    await waitFor(() => {
      expect(getClients).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  it('should paginate', async () => {
    render(<ClientsOverview />);

    const nextButton = screen.getByText(/Next/);
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(getClients).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it('should display error message on failure', async () => {
    vi.mocked(getClients).mockRejectedValueOnce(new Error('Network error'));

    render(<ClientsOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  it('should retry on error button click', async () => {
    vi.mocked(getClients)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ clients: [], total: 0, page: 1, limit: 12, totalPages: 0 });

    render(<ClientsOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    const retryButton = screen.getByText(/Retry/);
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(getClients).toHaveBeenCalledTimes(2);
    });
  });
});
```

### Component Tests

- Verify search params passed to API
- Verify pagination state updates
- Verify agent filter populated from response
- Verify status mapping correct
- Verify error states render

---

## Definition of Done

✅ `seedDirectory()` function removed
✅ `getClients()` called instead
✅ Real clients appear in list
✅ Search passes `search` param
✅ Status filter passes `status` param
✅ Pagination passes `page` and `limit` params
✅ Loading spinner shows while fetching
✅ Error message shows on failure
✅ Retry button works
✅ Network tab shows real `/clients` requests
✅ Tests pass: `npm -w apps/web test`
✅ No console errors
✅ TypeScript clean

---

## Files to Modify

1. `/apps/web/src/pages/Clients/ClientsOverview.tsx` — Primary changes
2. `/apps/web/src/api/clients.api.ts` — May need to export additional types (Status mapping)

---

## Estimated Effort

- Implementation: 1-2 hours
- Testing: 1-2 hours
- Debugging & refinement: 30 min - 1 hour
- **Total: 2.5-5 hours**

---

## Risks & Mitigations

| Risk                              | Impact | Mitigation                                         |
| --------------------------------- | ------ | -------------------------------------------------- |
| API response format differs       | High   | Validate with Zod, add logging                     |
| Agent field missing from response | Medium | Handle gracefully, default to 'Unassigned'         |
| Status mapping incomplete         | Medium | Test all 9 statuses, add fallback                  |
| Performance: Too many API calls   | Medium | Debounce search, cache results (React Query ready) |
| Backend not implementing RBAC     | High   | Verify with BE tests                               |

---

**Next**: Execute Implementation
