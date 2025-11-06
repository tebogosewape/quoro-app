# PHASE 2 EXECUTION PLAN — ClientDetails Integration

**Objective**: Replace `mockClientApi` with real API calls (`getClientById`, `updateClient`); implement basic fetch and save for client details.

**Status**: Ready to Execute

---

## Current State Analysis

### ClientDetails.tsx (Lines 1-922)

**Current Flow**:

1. Component mounts with clientId from route
2. `useEffect` (line 43): calls `mockClientApi.getDetails(cid)` → returns mock data
3. State: `data` (ClientDetailPayload) and `loading`
4. Multiple tabs: Products, Client, Income/Expense, Creditors, Reports, Correspondence, Payments
5. Sub-components: HeaderBlock, ProductsPanel, IncomeExpenseForm, CorrespondencePanel, TodoPanel, NotesPanel

**Mock API Calls Found**:

- Line 43: `mockClientApi.getDetails(cid)` — Get initial client data
- Line 433: `mockClientApi.saveIncomeExpense(...)` — Save income/expense (SKIP for Phase 2)
- Line 626-644: `mockClientApi.getDetails()` + `sendWhatsApp()` — Correspondence (SKIP)
- Line 723-787: `mockClientApi.getDetails()` + `toggleTodo()` + `addTodo()` — Todos (SKIP)

**For Phase 2 (Minimal)**: Only replace lines 43 & main fetch

---

## Implementation Strategy

### Step 1: Update Imports

**Remove**:

```typescript
import {
    mockClientApi,
    type ClientDetailPayload,
    type Product,
    type MoneyRow,
    type IncomeExpense,
} from '../../api/mockClientApi';
```

**Add**:

```typescript
import { getClientById, updateClient, type Client } from '../../api/clients.api';
```

**Keep**: Types for UI components (Product, MoneyRow, IncomeExpense) — these are still needed

### Step 2: Data Mapping

**Backend Client** → **Frontend ClientDetailPayload**

Backend has:

- `id`, `firstName`, `lastName`, `email`, `phoneNumber`, `idNumber`, `dateOfBirth`
- `status`, `maritalStatus`, `clientType`, `physicalAddress`, `postalAddress`
- `monthlyIncome`, `monthlyExpenses`, `totalDebt`, `creditScore`
- `createdAt`, `updatedAt`, `createdBy`, `updatedBy`
- `clientProducts[]`, `assignedAgent`, ...

Frontend needs:

- Basic info: name, phone, email, ID
- Status badge
- Financial: income, expenses, balance
- Timeline: created/updated dates
- TODO: products, todos, notes, correspondence (separate endpoints in future phases)

**Approach**:

1. Phase 2a: Map basic Client to show header + basic info
2. Phase 2b: Add update capability for editable fields
3. Phase 2c+: Stub out other tabs with "Coming soon" or empty states

### Step 3: Updated useEffect

**Before**:

```typescript
useEffect(() => {
    let mounted = true;
    mockClientApi.getDetails(cid).then((d) => {
        if (mounted) {
            setData(d);
            setLoading(false);
        }
    });
    return () => {
        mounted = false;
    };
}, [cid]);
```

**After**:

```typescript
useEffect(() => {
    let isMounted = true;

    const fetchClient = async () => {
        setLoading(true);
        try {
            const client = await getClientById(cid);
            if (isMounted) {
                setData(mapClientToDetailPayload(client));
                setLoading(false);
            }
        } catch (err) {
            if (isMounted) {
                setError(err instanceof Error ? err.message : 'Failed to load client');
                setLoading(false);
            }
        }
    };

    fetchClient();
    return () => {
        isMounted = false;
    };
}, [cid]);
```

### Step 4: Add mapping function

**New Helper**:

```typescript
function mapClientToDetailPayload(client: Client): ClientDetailPayload {
    return {
        id: client.id,
        name: `${client.firstName} ${client.lastName}`,
        phone: client.phoneNumber,
        email: client.email,
        nationalId: client.idNumber,
        status: mapStatus(client.status),
        maritalStatus: client.maritalStatus,
        dateOfBirth: client.dateOfBirth,
        physicalAddress: client.physicalAddress,
        postalAddress: client.postalAddress || '',
        monthlyIncome: client.monthlyIncome || 0,
        monthlyExpenses: client.monthlyExpenses || 0,
        totalDebt: client.totalDebt || 0,
        creditScore: client.creditScore,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        products: (client as any).clientProducts || [],
        todos: [], // TODO: Fetch from tasks endpoint (Phase 2b)
        notes: [], // TODO: Fetch from notes endpoint (Phase 2b)
        messages: [], // TODO: Fetch from communications endpoint (Phase 2b)
        onboardingLocked: false, // TODO: Derive from status
    };
}

function mapStatus(status: string): 'new' | 'active' | 'completed' {
    const map: Record<string, 'new' | 'active' | 'completed'> = {
        lead: 'new',
        consultation_scheduled: 'new',
        documentation_pending: 'new',
        under_review: 'new',
        approved: 'active',
        active: 'active',
        completed: 'completed',
        withdrawn: 'completed',
    };
    return map[status] || 'new';
}
```

### Step 5: Add error state

**New State**:

```typescript
const [error, setError] = useState<string | null>(null);
```

**New JSX** (top of return):

```tsx
{
    error && (
        <div className="alert alert-danger mb-3 d-flex justify-content-between">
            <div>{error}</div>
            <Button variant="link" size="sm" onClick={() => setError(null)} className="p-0">
                Dismiss
            </Button>
        </div>
    );
}
```

### Step 6: Update HeaderBlock for edit

**Change** (line where edit is called):

```tsx
// Instead of navigate to /edit (which might not exist)
// Open an edit modal or inline edit form

// For Phase 2a: Just disable edit button with "Coming soon"
<Button disabled title="Coming soon">
    Edit Client
</Button>
```

---

## Type System

### ClientDetailPayload (Frontend)

Keep existing interface but add optional fields:

```typescript
type ClientDetailPayload = {
    id: string;
    name: string;
    phone: string;
    email: string;
    nationalId: string;
    status: 'new' | 'active' | 'completed';
    maritalStatus: string;
    dateOfBirth: string;
    physicalAddress: string;
    postalAddress: string;
    monthlyIncome: number;
    monthlyExpenses: number;
    totalDebt: number;
    creditScore?: number;
    createdAt: string;
    updatedAt: string;
    products: Product[];
    todos: Todo[];
    notes: Note[];
    messages: Message[];
    onboardingLocked: boolean;
};
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('ClientDetails', () => {
  it('should fetch client on mount', async () => {
    vi.mocked(getClientById).mockResolvedValueOnce(mockClient);
    render(<ClientDetails />);

    await waitFor(() => {
      expect(getClientById).toHaveBeenCalledWith('KH12919');
    });
  });

  it('should display loading state', () => {
    vi.mocked(getClientById).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByText } = render(<ClientDetails />);
    expect(getByText('Loading…')).toBeInTheDocument();
  });

  it('should display error message on fetch failure', async () => {
    vi.mocked(getClientById).mockRejectedValueOnce(new Error('API Error'));

    render(<ClientDetails />);

    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });

  it('should map Client to ClientDetailPayload correctly', () => {
    const result = mapClientToDetailPayload(mockClient);
    expect(result.name).toBe('John Doe');
    expect(result.status).toBe('active');
  });
});
```

---

## Definition of Done

- [x] All `mockClientApi.getDetails()` calls replaced with `getClientById()`
- [x] Mapping function handles null/undefined fields
- [x] Error state displays and is dismissible
- [x] Loading state displays while fetching
- [x] TypeScript compilation clean
- [x] No console errors
- [x] Basic client info displays from real API
- [ ] Tests pass (pending Jest setup)

---

## Scope & Limitations (Phase 2a = Minimal)

**In Scope**:

- Fetch basic client details
- Display in header
- Error handling
- Loading state

**Out of Scope (Phase 2b+)**:

- Income/Expense tab (needs financial-records endpoint)
- Products tab (needs product endpoint)
- Todos, Notes, Correspondence (need separate endpoints)
- Edit/Update functionality (Phase 2b)

---

## Files to Modify

1. `apps/web/src/pages/Clients/ClientDetails.tsx` — Main changes
    - Update imports
    - Replace useEffect
    - Add mapping function
    - Add error state

2. **No backend changes required** (API already supports `GET /clients/:id`)

---

## Estimated Effort

- Implementation: 30-45 minutes
- Testing: 30-45 minutes
- Debugging: 15-30 minutes
- **Total: 1-2 hours**

---

**Ready to Execute**: Yes
