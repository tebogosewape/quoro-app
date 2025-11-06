import React from 'react';
import type { ReactNode } from 'react';
import { Card } from 'react-bootstrap';

type CurvedFormProps = {
    title: string;
    children: ReactNode;
};

const CurvedForm: React.FC<CurvedFormProps> = ({ title, children }) => {
    return (
        <Card
            className="m-5"
            style={{
                borderRadius: '22px',
                backgroundColor: '#fff',
            }}
        >
            <Card.Header
                style={{
                    backgroundColor: '#87CEEB',
                    fontSize: '24px',
                    color: '#0A3353',
                    borderRadius: '22px 22px 0 0',
                    fontWeight: '500',
                }}
            >
                {title}
            </Card.Header>
            <Card.Body className="m-0 p-0">{children}</Card.Body>
        </Card>
    );
};

export default CurvedForm;
