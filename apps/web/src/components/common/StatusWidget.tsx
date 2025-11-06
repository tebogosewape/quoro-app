import { Card } from 'react-bootstrap';

interface StatusWidgetProps {
    title: string;
    progressCount: number;
}

export const StatusWidget: React.FC<StatusWidgetProps> = ({ title, progressCount }) => {
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
                    <div className="text-center flex-fill">
                        <div className="h5 mb-0" style={{ fontSize: '30px' }}>
                            {progressCount}
                        </div>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};
