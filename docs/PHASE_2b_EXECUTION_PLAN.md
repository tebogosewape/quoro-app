# PHASE 2b: ClientDetails Save/Update — Execution Plan

**Status**: Ready to Execute
**Objective**: Wire `updateClient()` for basic field updates; replace mockClientApi.saveIncomeExpense() with real financial records API call.

---

## Overview

Phase 2a successfully fetches client details from the real API. Phase 2b focuses on:

1. **Update basic client fields** (name, phone, email, address, etc.)
2. **Replace income/expense mock save** with real API call (placeholder until financial-records.api.ts exists)
3. **Implement optimistic UI updates**
4. **Add save error handling**

---

## Current State Analysis

### Files Modified So Far

- `apps/web/src/pages/Clients/ClientDetails.tsx` — Phase 2a complete (fetch working)
- No backend changes yet
- Mock API still imported for backward compatibility

### Components Using Mock Data

1. **ClientMini** (line 458-474)
    - Currently hardcoded values
    - Needs: Wire to actual `data` fields; make editable

2. **IncomeExpenseForm** (line 480-630)
    - Uses `mockClientApi.saveIncomeExpense()` (line 539)
    - Needs: Stub with real API call (Phase 3 adds backend endpoint)

3. **HeaderBlock** (imported, used at line ~75)
    - Edit button calls navigate to edit page (doesn't exist)
    - Needs: Skip for Phase 2b (can be done in Phase 2c)

---

## Implementation Plan

### Step 1: Wire ClientMini (Read-Only → Editable)

**Current** (hardcoded):

```tsx
function ClientMini({ data }: { data: ClientDetailPayload }) {
    return (
        <Section title="Client">
            <div className="row g-3">
                <div className="col-md-6">
                    <Field label="Surname" value="PHALATSE" />
                    <Field label="First names" value="KT" />
                    <Field label="Language" value="Tswana" />
                </div>
                <div className="col-md-6">
                    <Field label="ID Number" value={data.nationalId} />
                    <Field label="Cell" value={data.phone} />
                    <Field label="Email" value={data.email} />
                </div>
            </div>
        </Section>
    );
}
```

**Target** (editable, with save):

```tsx
function ClientMini({
    data,
    onUpdate,
}: {
    data: ClientDetailPayload;
    onUpdate: (field: string, value: string) => Promise<void>;
}) {
    const [edit, setEdit] = useState({
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' '),
        phone: data.phone,
        email: data.email,
        physicalAddress: data.physicalAddress,
        postalAddress: data.postalAddress,
    });

    const [saving, setSaving] = useState<string | null>(null);

    const handleSave = async (field: string, value: string) => {
        setSaving(field);
        try {
            await onUpdate(field, value);
            setEdit((s) => ({ ...s, [field]: value }));
        } finally {
            setSaving(null);
        }
    };

    return (
        <Section title="Client">
            <div className="row g-3">
                <div className="col-md-6">
                    <EditableField
                        label="First names"
                        value={edit.firstName}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('firstName', v)}
                    />
                    <EditableField
                        label="Surname"
                        value={edit.lastName}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('lastName', v)}
                    />
                </div>
                <div className="col-md-6">
                    <Field label="ID Number" value={data.nationalId} />
                    <EditableField
                        label="Cell"
                        value={edit.phone}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('phone', v)}
                    />
                    <EditableField
                        label="Email"
                        value={edit.email}
                        disabled={saving !== null}
                        onChange={(v) => handleSave('email', v)}
                    />
                </div>
            </div>
        </Section>
    );
}
```

**New Component** (`EditableField`):

```tsx
function EditableField({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => Promise<void> | void;
}) {
    const [localValue, setLocalValue] = useState(value);
    const [loading, setLoading] = useState(false);

    useEffect(() => setLocalValue(value), [value]);

    const handleChange = async () => {
        setLoading(true);
        try {
            await onChange(localValue);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-3">
            <label className="form-label">{label}</label>
            <div className="d-flex gap-2">
                <input
                    type="text"
                    className="form-control"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    disabled={disabled || loading}
                />
                {localValue !== value && (
                    <Button variant="success" size="sm" disabled={loading} onClick={handleChange}>
                        {loading ? '...' : 'Save'}
                    </Button>
                )}
            </div>
        </div>
    );
}
```

### Step 2: Update MainPage to Pass onUpdate Handler

**Change in ClientDetails component**:

```tsx
const handleClientUpdate = async (field: string, value: string) => {
    try {
        const updates: Partial<Client> = {
            [field]: value,
        };
        const updated = await updateClient(data.id, updates as any);
        setData(mapClientToDetailPayload(updated));
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update client');
        throw err;
    }
};

// In JSX:
<Tab.Pane eventKey="client">
    <ClientMini data={data} onUpdate={handleClientUpdate} />
</Tab.Pane>;
```

### Step 3: Replace Income/Expense Save

**Current** (line 539):

```tsx
const save = async () => {
    setSaving(true);
    const saved = await mockClientApi.saveIncomeExpense(clientId, form);
    setSaving(false);
    setDirty(false);
    onSaved(saved);
};
```

**Target** (stub for Phase 3):

```tsx
const save = async () => {
    setSaving(true);
    try {
        // TODO: Phase 3 - Connect to financial-records API
        // For now, just show success (data doesn't persist)
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Optional: Send to backend when financial-records API exists
        // const saved = await saveFinancialRecords(clientId, form);
        // onSaved(saved);

        setDirty(false);
        console.log('Income/Expense form - save would happen in Phase 3');
        onSaved(form); // Return current form for now
    } catch (err) {
        console.error('Failed to save income/expense:', err);
    } finally {
        setSaving(false);
    }
};
```

---

## Type System Updates

### Extend ClientDetailPayload for Edits

Add fields that can be edited:

```typescript
type ClientDetailPayload = {
    // ... existing fields ...

    // Editable fields
    firstName?: string;
    lastName?: string;
    maritalStatus?: string;
    dateOfBirth?: string;
    physicalAddress?: string;
    postalAddress?: string;
    monthlyIncome?: number;
    monthlyExpenses?: number;
};
```

### Import updateClient Fully

Already done in Phase 2a, just verify:

```typescript
import { getClientById, updateClient, type Client } from '../../api/clients.api';
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('ClientDetails - Phase 2b', () => {
    it('should update client field on EditableField save', async () => {
        vi.mocked(updateClient).mockResolvedValueOnce({
            ...mockClient,
            firstName: 'John Updated',
        });

        const { getByDisplayValue, getByText } = render(
            <ClientDetails data={mockClient} onUpdate={vi.fn()} />
        );

        const input = getByDisplayValue('John');
        await userEvent.clear(input);
        await userEvent.type(input, 'Johnny');

        const saveBtn = getByText('Save');
        await userEvent.click(saveBtn);

        await waitFor(() => {
            expect(updateClient).toHaveBeenCalledWith(
                mockClient.id,
                { firstName: 'Johnny' }
            );
        });
    });

    it('should handle save error gracefully', async () => {
        vi.mocked(updateClient).mockRejectedValueOnce(new Error('Network error'));

        // Verify error state is set
    });

    it('should disable form during save', async () => {
        vi.mocked(updateClient).mockImplementationOnce(
            () => new Promise(() => {}) // Never resolves
        );

        const { getByDisplayValue } = render(<ClientDetails />);
        const input = getByDisplayValue('John');
        const saveBtn = getByText('Save');

        await userEvent.click(saveBtn);

        expect(input).toBeDisabled();
        expect(saveBtn).toBeDisabled();
    });
});
```

---

## Definition of Done for Phase 2b

- [ ] ClientMini displays actual client data (not hardcoded)
- [ ] ClientMini has editable fields (firstName, lastName, phone, email, addresses)
- [ ] Editable fields call updateClient() when saved
- [ ] Optimistic UI updates (field grayed out during save)
- [ ] Error handling shows error banner
- [ ] IncomeExpenseForm save button works (stubbed for Phase 3)
- [ ] TypeScript compilation clean
- [ ] No console errors
- [ ] Existing UI flow unchanged for non-editable components

---

## Scope & Limitations

**In Scope**:

- Basic CRUD for client name, contact, address
- Editable form UI components
- Error handling + retry

**Out of Scope**:

- Bulk edit or multi-select
- Audit trail (who changed what when)
- Undo/revert functionality
- Income/Expense persistence (Phase 3)
- Field validation rules (Phase 3+)

---

## Implementation Order

1. **Edit 1**: Add `EditableField` component (new function)
2. **Edit 2**: Update `ClientMini` to use `data` fields and accept `onUpdate` prop
3. **Edit 3**: Add `handleClientUpdate` to main component
4. **Edit 4**: Pass `onUpdate` to `<ClientMini>` in JSX
5. **Edit 5**: Stub `IncomeExpenseForm` save (add TODO comment)
6. **Test**: TypeScript check
7. **Commit**: Clean commit message

---

## Estimated Effort

- Implementation: 1-1.5 hours
- Testing: 30-45 minutes
- Debugging: 15-30 minutes
- **Total: 2-2.5 hours**

---

**Ready to Execute**: Yes
