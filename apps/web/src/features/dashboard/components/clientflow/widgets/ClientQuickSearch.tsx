import { useMemo, useState, type FormEvent } from 'react';
import type { ClientQuickSearchResult } from '@/features/dashboard/api';
import { money } from '@/utils/currency';

type SearchFields = { file: string; name: string; id: string; phone: string };
type Props = {
    onSearch: (fields: SearchFields) => Promise<ClientQuickSearchResult[]>;
};

/**
 * Collects quick search parameters for the dashboard, executes the provided async search handler,
 * and renders a lightweight result list.
 */
export default function ClientQuickSearch({ onSearch }: Props) {
    const [fields, setFields] = useState<SearchFields>({ file: '', name: '', id: '', phone: '' });
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<ClientQuickSearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const query = useMemo(
        () =>
            [fields.file, fields.name, fields.id, fields.phone]
                .map((value) => value.trim())
                .filter(Boolean)
                .join(' '),
        [fields]
    );

    const updateField = (key: keyof SearchFields, value: string) => {
        setFields((prev) => ({ ...prev, [key]: value }));
    };

    const reset = () => {
        setFields({ file: '', name: '', id: '', phone: '' });
        setResults([]);
        setError(null);
        setHasSearched(false);
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!query) {
            setError('Enter at least one field to search.');
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsSearching(true);
        setError(null);

        const trimmedFields = Object.fromEntries(
            Object.entries(fields).map(([key, value]) => [key, value.trim()])
        ) as SearchFields;

        try {
            const response = await onSearch(trimmedFields);
            setResults(response);
            setHasSearched(true);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Search failed. Please try again.';
            setError(message);
            setResults([]);
            setHasSearched(false);
        } finally {
            setIsSearching(false);
        }
    };

    const emptyState = hasSearched && results.length === 0 && !isSearching && !error;

    return (
        <div className="panel glass p-3">
            <form onSubmit={submit}>
                <h6 className="mb-3">Search clients by…</h6>
                <div className="row g-2">
                    <div className="col-12 col-sm-6">
                        <input
                            className="form-control"
                            placeholder="File number"
                            value={fields.file}
                            onChange={(e) => updateField('file', e.target.value)}
                            disabled={isSearching}
                        />
                    </div>
                    <div className="col-12 col-sm-6">
                        <input
                            className="form-control"
                            placeholder="Client name"
                            value={fields.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            disabled={isSearching}
                        />
                    </div>
                    <div className="col-12 col-sm-6">
                        <input
                            className="form-control"
                            placeholder="SA ID number"
                            value={fields.id}
                            onChange={(e) => updateField('id', e.target.value)}
                            disabled={isSearching}
                        />
                    </div>
                    <div className="col-12 col-sm-6">
                        <input
                            className="form-control"
                            placeholder="Cell number"
                            value={fields.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                            disabled={isSearching}
                        />
                    </div>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <button
                        className="btn btn-link btn-sm text-muted"
                        type="button"
                        onClick={reset}
                        disabled={isSearching}
                    >
                        Clear
                    </button>
                    <button className="btn btn-primary" type="submit" disabled={isSearching}>
                        {isSearching && (
                            <span className="spinner-border spinner-border-sm me-2" role="status" />
                        )}
                        Search
                    </button>
                </div>
            </form>

            {error && (
                <div className="alert alert-danger mt-3 py-2" role="alert">
                    {error}
                </div>
            )}

            {isSearching && !error && (
                <p className="text-muted small mt-3 mb-0">Finding matching clients…</p>
            )}

            {emptyState && (
                <p className="text-muted small mt-3 mb-0">No clients matched your search.</p>
            )}

            {results.length > 0 && (
                <div className="mt-3">
                    <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0">
                            <thead>
                                <tr className="text-muted small">
                                    <th scope="col">Client</th>
                                    <th scope="col">ID</th>
                                    <th scope="col">Contact</th>
                                    <th scope="col">Status</th>
                                    <th scope="col">Debt</th>
                                    <th scope="col">Last contact</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result) => {
                                    const lastContact = formatDate(result.lastContactDate);
                                    return (
                                        <tr key={result.id}>
                                            <td>
                                                <div className="fw-semibold">
                                                    {result.fullName || '—'}
                                                </div>
                                                {result.assignedAgentName && (
                                                    <div className="text-muted small">
                                                        Agent: {result.assignedAgentName}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="text-muted small">
                                                {result.saIdNumber || '—'}
                                            </td>
                                            <td className="text-muted small">
                                                {result.contactNumber || result.email || '—'}
                                            </td>
                                            <td className="text-muted small">
                                                {result.status || '—'}
                                            </td>
                                            <td className="text-muted small">
                                                {typeof result.totalDebt === 'number'
                                                    ? money(result.totalDebt)
                                                    : '—'}
                                            </td>
                                            <td className="text-muted small">{lastContact}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <small className="text-muted">Showing {results.length} result(s).</small>
                </div>
            )}
        </div>
    );
}

const formatDate = (input: ClientQuickSearchResult['lastContactDate']) => {
    if (!input) return '—';
    const value = typeof input === 'string' ? new Date(input) : input;
    if (Number.isNaN(value.getTime())) return '—';
    return value.toLocaleString();
};
