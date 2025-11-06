import React from 'react';
import { Card, Row, Col, Form } from 'react-bootstrap';
import { DashStatusWidget } from './DashStatusWidget';

type DashStatusWidgetProps = {
    wtInProgress: number;
    wtCompleted: number;

    rbmInProgress: number;
    rbmCompleted: number;

    mdeInProgress: number;
    mdeCompleted: number;

    dsaInProgress: number;
    dsaCompleted: number;
};

const TransactionStatus: React.FC<DashStatusWidgetProps> = ({
    wtInProgress = 0,
    wtCompleted = 0,

    rbmInProgress = 0,
    rbmCompleted = 0,

    mdeInProgress = 0,
    mdeCompleted = 0,

    dsaInProgress = 0,
    dsaCompleted = 0,
}) => {
    const transactionTypes = [
        {
            name: 'Warehouse Transfer',
            status: 'In Progress',
            inProgress: wtInProgress,
            isComplete: wtCompleted,
        },
        {
            name: 'RBM Transfer',
            status: 'In Progress',
            inProgress: rbmInProgress,
            isComplete: rbmCompleted,
        },
        {
            name: 'MDE Transfer',
            status: 'In Progress',
            inProgress: mdeInProgress,
            isComplete: mdeCompleted,
        },
        {
            name: 'DSA Transfer',
            status: 'In Progress',
            inProgress: dsaInProgress,
            isComplete: dsaCompleted,
        },
    ];

    return (
        <Card className="mt-4 p-6 mb-3">
            <Row>
                {/**  !-- Transaction Types Header -- */}
                <Col>
                    <Form>
                        <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
                            <Form.Label>Transaction Status</Form.Label>
                            <Form.Select aria-label="Please select">
                                <option>Please select</option>
                                <option value="1">One</option>
                                <option value="2">Two</option>
                                <option value="3">Three</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Col>
                <Col>
                    <Form>
                        <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
                            <Form.Label>Report Date</Form.Label>
                            <Form.Select aria-label="Please select">
                                <option>Please select</option>
                                <option value="1">One</option>
                                <option value="2">Two</option>
                                <option value="3">Three</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Col>
            </Row>

            <Row className="g-4 mt-2">
                {transactionTypes.map((transaction, index) => (
                    <Col md={3} key={index}>
                        <DashStatusWidget
                            title={transaction.name}
                            inProgress={Number(transaction.inProgress)}
                            completed={Number(transaction.isComplete)}
                        />
                    </Col>
                ))}
            </Row>
        </Card>
    );
};

export default TransactionStatus;
