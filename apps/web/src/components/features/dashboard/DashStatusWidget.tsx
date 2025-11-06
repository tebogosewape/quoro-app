import { Card } from 'react-bootstrap';
import './DashWelcomeCards.css';

interface DashStatusWidgetProps {
    title: string;
    inProgress: number;
    completed: number;
}

export const DashStatusWidget: React.FC<DashStatusWidgetProps> = ({
    title,
    inProgress,
    completed,
}) => {
    return (
        <Card
            style={{
                cursor: 'pointer',
                backgroundColor: '#0C4068',
                borderLeft: '7px solid #00AEEF',
                color: '#fff',
            }}
            className="mb-3"
        >
            <Card.Body>
                <Card.Title className="text-center mb-3">{title}</Card.Title>

                <div className="d-flex justify-content-between">
                    {/* First value - In Progress */}
                    <div className="text-center flex-fill">
                        <div className="fw-bold" style={{ fontSize: '12px', color: '#fff' }}>
                            In Progress
                        </div>
                        <div className="h5 mb-0" style={{ fontSize: '30px' }}>
                            {inProgress}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ borderLeft: '1px solid #ccc' }}></div>

                    {/* Second value - Completed */}
                    <div className="text-center flex-fill">
                        <div className="small" style={{ fontSize: '12px', color: '#fff' }}>
                            Completed
                        </div>
                        <div className="h5 mb-0" style={{ fontSize: '30px' }}>
                            {completed}
                        </div>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};
