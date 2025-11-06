import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { importLeadsFromFile, importLeadsFromPath, type LeadImportResponse } from '@/api/leads.api';

export default function LeadsImport() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [serverPath, setServerPath] = useState('');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<LeadImportResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.name.endsWith('.csv')) {
                setError('Please select a CSV file');
                setSelectedFile(null);
                return;
            }
            if (file.size > 20 * 1024 * 1024) {
                setError('File size must be less than 20MB');
                setSelectedFile(null);
                return;
            }
            setSelectedFile(file);
            setError(null);
            setResult(null);
        }
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
            const response = await importLeadsFromFile(selectedFile);
            setResult(response);
            setSelectedFile(null);
            // Reset file input
            const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleServerPathImport = async () => {
        if (!serverPath.trim()) {
            setError('Please enter a server file path');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);

        try {
            const response = await importLeadsFromPath(serverPath);
            setResult(response);
            setServerPath('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to import from server path');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="container-fluid px-4 py-4">
            {/* Modern Header Card with Gradient */}
            <div
                className="card border-0 shadow-sm mb-4"
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '16px',
                }}
            >
                <div className="card-body p-4">
                    <div className="d-flex align-items-center">
                        <div
                            className="bg-white bg-opacity-25 rounded-3 p-3 me-3"
                            style={{ backdropFilter: 'blur(10px)' }}
                        >
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-white mb-1 fw-bold">Import Leads</h2>
                            <p className="text-white text-opacity-75 mb-0">
                                Upload CSV files to import lead data into the system
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert
                    variant="danger"
                    onClose={() => setError(null)}
                    dismissible
                    className="shadow-sm d-flex align-items-center mb-4"
                    style={{ borderRadius: '12px' }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="me-2 flex-shrink-0"
                    >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    {error}
                </Alert>
            )}

            {/* Success Alert */}
            {result && (
                <Alert
                    variant="success"
                    onClose={() => setResult(null)}
                    dismissible
                    className="shadow-sm mb-4"
                    style={{ borderRadius: '12px' }}
                >
                    <div className="d-flex align-items-start">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="me-3 flex-shrink-0"
                            style={{ marginTop: '2px' }}
                        >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <div className="flex-grow-1">
                            <strong className="d-block mb-2">Import Successful!</strong>
                            <div className="row g-3">
                                <div className="col-md-4">
                                    <div
                                        className="bg-white bg-opacity-50 rounded p-3 text-center"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <div className="fs-3 fw-bold text-success">
                                            {result.inserted}
                                        </div>
                                        <div className="small">New Leads</div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div
                                        className="bg-white bg-opacity-50 rounded p-3 text-center"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <div className="fs-3 fw-bold text-info">
                                            {result.updated}
                                        </div>
                                        <div className="small">Updated</div>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div
                                        className="bg-white bg-opacity-50 rounded p-3 text-center"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <div className="fs-3 fw-bold text-dark">
                                            {result.inserted + result.updated}
                                        </div>
                                        <div className="small">Total Processed</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Alert>
            )}

            <Row className="g-4 mb-4">
                {/* File Upload Method */}
                <Col lg={6}>
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div
                            className="card-header bg-white border-0 p-4"
                            style={{ borderRadius: '12px 12px 0 0' }}
                        >
                            <div className="d-flex align-items-center">
                                <div
                                    className="bg-primary bg-opacity-10 rounded-3 p-2 me-3"
                                    style={{ width: '48px', height: '48px' }}
                                >
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#667eea"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="17 8 12 3 7 8"></polyline>
                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                    </svg>
                                </div>
                                <div>
                                    <h5 className="mb-0 fw-semibold">Upload CSV File</h5>
                                    <p className="text-muted small mb-0">
                                        From your computer (max 20MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-4">
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold mb-2">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2"
                                            style={{ marginTop: '-3px' }}
                                        >
                                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                            <polyline points="13 2 13 9 20 9"></polyline>
                                        </svg>
                                        Select CSV File
                                    </Form.Label>
                                    <Form.Control
                                        id="csvFileInput"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                        className="shadow-sm"
                                        style={{ borderRadius: '8px' }}
                                    />
                                    <Form.Text className="text-muted">
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        Required headers: Time Received, Cell (phone). Optional:
                                        Franchise, Name, ID Number, Affiliate, Message, Allocated
                                        to, Lead Outcome
                                    </Form.Text>
                                </Form.Group>

                                {selectedFile && (
                                    <Alert
                                        variant="info"
                                        className="mb-3 d-flex align-items-center shadow-sm"
                                        style={{ borderRadius: '8px' }}
                                    >
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2 flex-shrink-0"
                                        >
                                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                            <polyline points="13 2 13 9 20 9"></polyline>
                                        </svg>
                                        <div>
                                            <strong>Selected:</strong> {selectedFile.name}
                                            <span className="ms-2 text-muted">
                                                ({(selectedFile.size / 1024).toFixed(2)} KB)
                                            </span>
                                        </div>
                                    </Alert>
                                )}

                                {uploading && (
                                    <div className="mb-3">
                                        <ProgressBar
                                            animated
                                            now={100}
                                            style={{ height: '8px', borderRadius: '4px' }}
                                        />
                                    </div>
                                )}

                                <Button
                                    onClick={handleFileUpload}
                                    disabled={!selectedFile || uploading}
                                    className="w-100 shadow-sm"
                                    style={{
                                        borderRadius: '8px',
                                        background:
                                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        border: 'none',
                                        padding: '12px',
                                    }}
                                >
                                    {uploading ? (
                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="me-2"
                                                style={{ marginTop: '-3px' }}
                                            >
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="17 8 12 3 7 8"></polyline>
                                                <line x1="12" y1="3" x2="12" y2="15"></line>
                                            </svg>
                                            Upload & Import
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </div>
                    </div>
                </Col>

                {/* Server Path Method */}
                <Col lg={6}>
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                        <div
                            className="card-header bg-white border-0 p-4"
                            style={{ borderRadius: '12px 12px 0 0' }}
                        >
                            <div className="d-flex align-items-center">
                                <div
                                    className="bg-secondary bg-opacity-10 rounded-3 p-2 me-3"
                                    style={{ width: '48px', height: '48px' }}
                                >
                                    <svg
                                        width="32"
                                        height="32"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="#6c757d"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect
                                            x="2"
                                            y="7"
                                            width="20"
                                            height="14"
                                            rx="2"
                                            ry="2"
                                        ></rect>
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h5 className="mb-0 fw-semibold">Server Path Import</h5>
                                    <p className="text-muted small mb-0">
                                        For operations/admin use only
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-4">
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-semibold mb-2">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-2"
                                            style={{ marginTop: '-3px' }}
                                        >
                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        Server File Path
                                    </Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="/var/data/leads/exportdata.csv"
                                        value={serverPath}
                                        onChange={(e) => setServerPath(e.target.value)}
                                        disabled={uploading}
                                        className="shadow-sm"
                                        style={{ borderRadius: '8px', fontFamily: 'monospace' }}
                                    />
                                    <Form.Text className="text-muted">
                                        <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="me-1"
                                            style={{ marginTop: '-2px' }}
                                        >
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        Enter the absolute path to the CSV file on the server
                                    </Form.Text>
                                </Form.Group>

                                {uploading && (
                                    <div className="mb-3">
                                        <ProgressBar
                                            animated
                                            now={100}
                                            style={{ height: '8px', borderRadius: '4px' }}
                                        />
                                    </div>
                                )}

                                <Button
                                    variant="secondary"
                                    onClick={handleServerPathImport}
                                    disabled={!serverPath.trim() || uploading}
                                    className="w-100 shadow-sm"
                                    style={{
                                        borderRadius: '8px',
                                        padding: '12px',
                                    }}
                                >
                                    {uploading ? (
                                        <>
                                            <span
                                                className="spinner-border spinner-border-sm me-2"
                                                role="status"
                                                aria-hidden="true"
                                            />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <svg
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="me-2"
                                                style={{ marginTop: '-3px' }}
                                            >
                                                <rect
                                                    x="2"
                                                    y="7"
                                                    width="20"
                                                    height="14"
                                                    rx="2"
                                                    ry="2"
                                                ></rect>
                                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                                            </svg>
                                            Import from Server
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* CSV Format Requirements */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                <div
                    className="card-header bg-white border-0 p-4"
                    style={{ borderRadius: '12px 12px 0 0' }}
                >
                    <div className="d-flex align-items-center">
                        <div
                            className="bg-info bg-opacity-10 rounded-3 p-2 me-3"
                            style={{ width: '48px', height: '48px' }}
                        >
                            <svg
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#0dcaf0"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                        </div>
                        <div>
                            <h5 className="mb-0 fw-semibold">CSV Format Requirements</h5>
                            <p className="text-muted small mb-0">
                                Make sure your CSV file follows this structure
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card-body p-4">
                    <Row>
                        <Col md={6}>
                            <div
                                className="bg-light p-3 rounded mb-3"
                                style={{ borderRadius: '8px' }}
                            >
                                <h6 className="fw-semibold mb-3">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-2"
                                        style={{ marginTop: '-3px' }}
                                    >
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    </svg>
                                    Required Headers
                                </h6>
                                <ul className="mb-0 ps-3">
                                    <li className="mb-2">
                                        <code className="bg-white px-2 py-1 rounded">
                                            Time Received
                                        </code>{' '}
                                        - Date/time when the lead was received
                                    </li>
                                    <li className="mb-0">
                                        <code className="bg-white px-2 py-1 rounded">Cell</code> -
                                        Contact phone number (required)
                                    </li>
                                </ul>
                            </div>
                        </Col>
                        <Col md={6}>
                            <div
                                className="bg-light p-3 rounded mb-3"
                                style={{ borderRadius: '8px' }}
                            >
                                <h6 className="fw-semibold mb-3">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="me-2"
                                        style={{ marginTop: '-3px' }}
                                    >
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="16"></line>
                                        <line x1="8" y1="12" x2="16" y2="12"></line>
                                    </svg>
                                    Optional Headers
                                </h6>
                                <ul className="mb-0 ps-3 small">
                                    <li className="mb-1">
                                        <code className="bg-white px-2 py-1 rounded">
                                            Franchise
                                        </code>{' '}
                                        - Franchise name or code
                                    </li>
                                    <li className="mb-1">
                                        <code className="bg-white px-2 py-1 rounded">Name</code> -
                                        Lead's full name
                                    </li>
                                    <li className="mb-1">
                                        <code className="bg-white px-2 py-1 rounded">
                                            ID Number
                                        </code>{' '}
                                        - South African ID
                                    </li>
                                    <li className="mb-1">
                                        <code className="bg-white px-2 py-1 rounded">
                                            Affiliate
                                        </code>{' '}
                                        - Affiliate or referral source
                                    </li>
                                    <li className="mb-1">
                                        <code className="bg-white px-2 py-1 rounded">Message</code>{' '}
                                        - Additional notes
                                    </li>
                                    <li className="mb-1">
                                        <code className="bg-white px-2 py-1 rounded">
                                            Allocated to
                                        </code>{' '}
                                        - Assigned agent/user
                                    </li>
                                    <li className="mb-0">
                                        <code className="bg-white px-2 py-1 rounded">
                                            Lead Outcome
                                        </code>{' '}
                                        - Current status
                                    </li>
                                </ul>
                            </div>
                        </Col>
                    </Row>

                    <Alert
                        variant="warning"
                        className="mb-0 d-flex align-items-start shadow-sm"
                        style={{ borderRadius: '8px' }}
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="me-2 flex-shrink-0"
                            style={{ marginTop: '2px' }}
                        >
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                            <strong>Note:</strong> Duplicate leads (based on Time Received, Cell,
                            and Affiliate) will be updated rather than creating new entries.
                        </div>
                    </Alert>
                </div>
            </div>
        </div>
    );
}

