import { Card } from 'react-bootstrap';
import './DashWelcomeCards.css';

interface DashStatusWidgetPanelProps {
    title: string;
}

export const DashStatusWidgetPanel: React.FC<DashStatusWidgetPanelProps> = ({ title }) => {
    return (
        <Card
            style={{
                fontSize: '20px',
                color: '#0A3353',
            }}
            className="mb-3"
        >
            <Card.Body>{title}</Card.Body>
        </Card>
    );
};
