import { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUpload,
    faFileArrowUp,
    faCheckCircle,
    faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
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
        <Container fluid className="py-4">
            <Row className="mb-4">
                <Col>
                    <h2 className="mb-1">Import Leads</h2>
                    <p className="text-muted">
                        Upload CSV files to import lead data into the system
                    </p>
                </Col>
            </Row>

            {error && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="danger" onClose={() => setError(null)} dismissible>
                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                            {error}
                        </Alert>
                    </Col>
                </Row>
            )}

            {result && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="success" onClose={() => setResult(null)} dismissible>
                            <FontAwesomeIcon icon={faCheckCircle} className="me-2" />
                            <strong>Import Successful!</strong>
                            <div className="mt-2">
                                <div>✅ New leads imported: {result.inserted}</div>
                                <div>🔄 Existing leads updated: {result.updated}</div>
                                <div>📊 Total processed: {result.inserted + result.updated}</div>
                            </div>
                        </Alert>
                    </Col>
                </Row>
            )}

            <Row className="g-4">
                {/* File Upload Method */}
                <Col lg={6}>
                    <Card>
                        <Card.Header>
                            <FontAwesomeIcon icon={faUpload} className="me-2" />
                            Upload CSV File
                        </Card.Header>
                        <Card.Body>
                            <p className="text-muted small mb-3">
                                Upload a CSV file from your computer. Maximum file size: 20MB
                            </p>

                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Select CSV File</Form.Label>
                                    <Form.Control
                                        id="csvFileInput"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                    <Form.Text className="text-muted">
                                        CSV must include headers: Time Received, Franchise, Name,
                                        Cell, ID Number, Affiliate, Message, Allocated to, Lead
                                        Outcome
                                    </Form.Text>
                                </Form.Group>

                                {selectedFile && (
                                    <Alert variant="info" className="mb-3">
                                        <strong>Selected:</strong> {selectedFile.name} (
                                        {(selectedFile.size / 1024).toFixed(2)} KB)
                                    </Alert>
                                )}

                                {uploading && <ProgressBar animated now={100} className="mb-3" />}

                                <Button
                                    variant="primary"
                                    onClick={handleFileUpload}
                                    disabled={!selectedFile || uploading}
                                    className="w-100"
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
                                            <FontAwesomeIcon icon={faUpload} className="me-2" />
                                            Upload & Import
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Server Path Method */}
                <Col lg={6}>
                    <Card>
                        <Card.Header>
                            <FontAwesomeIcon icon={faFileArrowUp} className="me-2" />
                            Import from Server Path
                        </Card.Header>
                        <Card.Body>
                            <p className="text-muted small mb-3">
                                Import a CSV file that already exists on the server (for
                                operations/admin use)
                            </p>

                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Server File Path</Form.Label>
                                    <Form.Control
                                        type="text"
                                        placeholder="/var/data/leads/exportdata.csv"
                                        value={serverPath}
                                        onChange={(e) => setServerPath(e.target.value)}
                                        disabled={uploading}
                                    />
                                    <Form.Text className="text-muted">
                                        Enter the absolute path to the CSV file on the server
                                    </Form.Text>
                                </Form.Group>

                                {uploading && <ProgressBar animated now={100} className="mb-3" />}

                                <Button
                                    variant="secondary"
                                    onClick={handleServerPathImport}
                                    disabled={!serverPath.trim() || uploading}
                                    className="w-100"
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
                                            <FontAwesomeIcon
                                                icon={faFileArrowUp}
                                                className="me-2"
                                            />
                                            Import from Server
                                        </>
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="mt-4">
                <Col>
                    <Card>
                        <Card.Header>CSV Format Requirements</Card.Header>
                        <Card.Body>
                            <h6>Required Headers:</h6>
                            <ul>
                                <li>
                                    <strong>Time Received</strong> - Date/time when the lead was
                                    received
                                </li>
                                <li>
                                    <strong>Cell</strong> - Contact phone number (required)
                                </li>
                            </ul>

                            <h6 className="mt-3">Optional Headers:</h6>
                            <ul>
                                <li>
                                    <strong>Franchise</strong> - Franchise name or code
                                </li>
                                <li>
                                    <strong>Name</strong> - Lead's full name
                                </li>
                                <li>
                                    <strong>ID Number</strong> - South African ID number
                                </li>
                                <li>
                                    <strong>Affiliate</strong> - Affiliate or referral source
                                </li>
                                <li>
                                    <strong>Message</strong> - Additional notes or message
                                </li>
                                <li>
                                    <strong>Allocated to</strong> - Agent or user assigned to the
                                    lead
                                </li>
                                <li>
                                    <strong>Lead Outcome</strong> - Current status or outcome
                                </li>
                            </ul>

                            <Alert variant="warning" className="mt-3">
                                <strong>Note:</strong> Duplicate leads (based on Time Received,
                                Cell, and Affiliate) will be updated rather than creating new
                                entries.
                            </Alert>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}
