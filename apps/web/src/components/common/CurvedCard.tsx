import React from 'react';
import type { ReactNode } from 'react';
import { Card } from 'react-bootstrap';

import '@/styles/components/curved-card.css';

type CurvedCardProps = {
    title: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    headerActions?: ReactNode;
};

const CurvedCard: React.FC<CurvedCardProps> = ({
    title,
    subtitle,
    children,
    className,
    headerActions,
}) => {
    return (
        <Card className="curved-card mt-3 mb-3">
            <Card.Header className="curved-card__header">
                <div>
                    <h2 className="curved-card__title">{title}</h2>
                    {subtitle ? <p className="curved-card__subtitle">{subtitle}</p> : null}
                </div>
                {headerActions ? <div className="curved-card__actions">{headerActions}</div> : null}
            </Card.Header>
            <Card.Body className={`curved-card__body ${className ?? ''}`.trim()}>
                {children}
            </Card.Body>
        </Card>
    );
};

export default CurvedCard;
