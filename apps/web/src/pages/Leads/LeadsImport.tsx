import { useState } from 'react';
import { importLeadsFromFile, importLeadsFromPath, type LeadImportResponse } from '@/api/leads.api';
import './LeadsImport.css';

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5" />
    </svg>
);

const ServerIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="16" height="6" rx="1" />
        <rect x="4" y="14" width="16" height="6" rx="1" />
        <path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
    </svg>
);

export default function LeadsImport() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [serverPath, setServerPath] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<LeadImportResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please select a CSV file');
            setSelectedFile(null);
            event.target.value = '';
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError('File size must be less than 20MB');
            setSelectedFile(null);
            event.target.value = '';
            return;
        }

        setSelectedFile(file);
        setError(null);
        setResult(null);
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            setError('Please select a file first');
            return;
        }
        setUploading(true);
        setError(null);
        setResult(null);
        try {
            setResult(await importLeadsFromFile(selectedFile));
            setSelectedFile(null);
            const input = document.getElementById('csvFileInput') as HTMLInputElement | null;
            if (input) input.value = '';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleServerPathImport = async () => {
        const path = serverPath.trim();
        if (!path) {
            setError('Please enter a server file path');
            return;
        }
        setUploading(true);
        setError(null);
        setResult(null);
        try {
            setResult(await importLeadsFromPath(path));
            setServerPath('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import from server path');
        } finally {
            setUploading(false);
        }
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        const input = document.getElementById('csvFileInput') as HTMLInputElement | null;
        if (input) input.value = '';
    };

    return (
        <main className="leads-import">
            <header className="leads-import-header">
                <div>
                    <p className="leads-import-eyebrow">Lead management</p>
                    <h1>Import leads</h1>
                    <p>Load a CSV from your computer or an approved server location.</p>
                </div>
                <span className="leads-import-limit">CSV · Maximum 20MB</span>
            </header>

            {error && (
                <div className="leads-import-alert leads-import-alert--error" role="alert">
                    <div>
                        <strong>Import could not continue</strong>
                        <span>{error}</span>
                    </div>
                    <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
                        ×
                    </button>
                </div>
            )}

            {result && (
                <section className="leads-import-result" aria-live="polite">
                    <div className="leads-import-result-heading">
                        <div>
                            <strong>Import completed</strong>
                            <span>The CSV was processed successfully.</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setResult(null)}
                            aria-label="Dismiss result"
                        >
                            ×
                        </button>
                    </div>
                    <dl>
                        <div>
                            <dt>New leads</dt>
                            <dd>{result.inserted}</dd>
                        </div>
                        <div>
                            <dt>Updated</dt>
                            <dd>{result.updated}</dd>
                        </div>
                        <div>
                            <dt>Total processed</dt>
                            <dd>{result.inserted + result.updated}</dd>
                        </div>
                    </dl>
                </section>
            )}

            {uploading && (
                <div className="leads-import-progress" role="status" aria-live="polite">
                    <div>
                        <strong>Import in progress</strong>
                        <span>Keep this page open while the file is processed.</span>
                    </div>
                    <span className="leads-import-spinner" aria-hidden="true" />
                </div>
            )}

            <div className="leads-import-methods">
                <section className="leads-import-panel" aria-labelledby="file-import-title">
                    <div className="leads-import-panel-heading">
                        <span className="leads-import-icon">
                            <UploadIcon />
                        </span>
                        <div>
                            <h2 id="file-import-title">Upload CSV file</h2>
                            <p>Select a file stored on this computer.</p>
                        </div>
                    </div>
                    <div className="leads-import-field">
                        <label htmlFor="csvFileInput">CSV file</label>
                        <input
                            id="csvFileInput"
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                        <small>Required headers: Time Received and Cell.</small>
                    </div>
                    {selectedFile && (
                        <div className="leads-import-file" aria-live="polite">
                            <div>
                                <strong>{selectedFile.name}</strong>
                                <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                            </div>
                            <button type="button" onClick={clearSelectedFile} disabled={uploading}>
                                Remove
                            </button>
                        </div>
                    )}
                    <button
                        type="button"
                        className="leads-import-action"
                        onClick={handleFileUpload}
                        disabled={!selectedFile || uploading}
                    >
                        {uploading ? 'Importing…' : 'Upload and import'}
                    </button>
                </section>

                <section className="leads-import-panel" aria-labelledby="path-import-title">
                    <div className="leads-import-panel-heading">
                        <span className="leads-import-icon leads-import-icon--neutral">
                            <ServerIcon />
                        </span>
                        <div>
                            <h2 id="path-import-title">Import from server</h2>
                            <p>For approved operations and administration files.</p>
                        </div>
                    </div>
                    <div className="leads-import-field">
                        <label htmlFor="serverFilePath">Server file path</label>
                        <input
                            id="serverFilePath"
                            type="text"
                            placeholder="/var/data/leads/exportdata.csv"
                            value={serverPath}
                            onChange={(event) => setServerPath(event.target.value)}
                            disabled={uploading}
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <small>Enter the absolute path to a CSV file on the server.</small>
                    </div>
                    <button
                        type="button"
                        className="leads-import-action leads-import-action--secondary"
                        onClick={handleServerPathImport}
                        disabled={!serverPath.trim() || uploading}
                    >
                        {uploading ? 'Importing…' : 'Import from server'}
                    </button>
                </section>
            </div>

            <section className="leads-import-requirements" aria-labelledby="csv-requirements-title">
                <div className="leads-import-requirements-heading">
                    <div>
                        <h2 id="csv-requirements-title">CSV format requirements</h2>
                        <p>Use the exact header names below so the data maps correctly.</p>
                    </div>
                    <span>Duplicates are updated</span>
                </div>
                <div className="leads-import-columns">
                    <div>
                        <h3>Required headers</h3>
                        <ul>
                            <li>
                                <code>Time Received</code>
                                <span>Date and time the lead was received</span>
                            </li>
                            <li>
                                <code>Cell</code>
                                <span>Lead contact number</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3>Optional headers</h3>
                        <ul className="leads-import-optional">
                            <li>
                                <code>Franchise</code>
                            </li>
                            <li>
                                <code>Name</code>
                            </li>
                            <li>
                                <code>ID Number</code>
                            </li>
                            <li>
                                <code>Affiliate</code>
                            </li>
                            <li>
                                <code>Message</code>
                            </li>
                            <li>
                                <code>Allocated to</code>
                            </li>
                            <li>
                                <code>Lead Outcome</code>
                            </li>
                        </ul>
                    </div>
                </div>
                <p className="leads-import-note">
                    Duplicate leads are matched using Time Received, Cell and Affiliate, then
                    updated instead of inserted again.
                </p>
            </section>
        </main>
    );
}
