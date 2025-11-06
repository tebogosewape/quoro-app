import React, { useState } from 'react';
import { Card, Table, Form, Row, Col, InputGroup } from 'react-bootstrap';
import type { TransferSummaryItem } from '../../../types/dashboard-transfer-summary';

type ZebraTableProps = {
    data: TransferSummaryItem[];
    renderAction?: (item: TransferSummaryItem) => React.ReactNode;
};

const DashTable: React.FC<ZebraTableProps> = ({ data, renderAction }) => {
    const [search, setSearch] = useState('');

    const filteredData = data.filter((item) =>
        Object.values(item).join(' ').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Card className="mb-3">
            <Card.Body className="p-0">
                <Row className="align-items-center">
                    <Col></Col>
                    <Col xs="auto" className="m-2">
                        <InputGroup size="sm">
                            <InputGroup.Text className="bg-white border-end-0 rounded-start-pill">
                                <i
                                    className="fas fa-search text-muted"
                                    style={{ color: '##00AEEF' }}
                                />
                            </InputGroup.Text>
                            <Form.Control
                                type="text"
                                placeholder="ex. WPP000000000 / Store Name"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                style={{ width: '245px', color: '#000' }}
                                className="border-start-0 rounded-end-pill"
                            />
                        </InputGroup>
                    </Col>
                </Row>

                <Table striped hover responsive className="mb-0" style={{ fontSize: '10px' }}>
                    <thead>
                        <tr>
                            <th>
                                <strong>Code From</strong>
                            </th>
                            <th>
                                <strong>Code To</strong>
                            </th>
                            <th>
                                <strong>Date</strong>
                            </th>
                            <th>
                                <strong>Quantity</strong>
                            </th>
                            <th>
                                <strong>Type</strong>
                            </th>
                            <th>
                                <strong>Receipt ID</strong>
                            </th>
                            <th>
                                <strong>Processed</strong>
                            </th>
                            <th>
                                <strong>Status</strong>
                            </th>
                            {renderAction && (
                                <th>
                                    <strong>Action</strong>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((tx, idx) => (
                                <tr key={idx}>
                                    <td>{tx.codeFrom}</td>
                                    <td>{tx.codeTo}</td>
                                    <td>{tx.date}</td>
                                    <td>{tx.quantity}</td>
                                    <td>{tx.type}</td>
                                    <td>{tx.receiptId}</td>
                                    <td>{tx.isProcessed ? 'Yes' : 'No'}</td>
                                    <td>{tx.status}</td>
                                    {renderAction && <td>{renderAction(tx)}</td>}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="text-center text-muted">
                                    No results found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
};

export default DashTable;
