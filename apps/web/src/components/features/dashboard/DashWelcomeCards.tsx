import { Card, Row, Col } from 'react-bootstrap';
import { FaUser, FaBell, FaStar } from 'react-icons/fa';
import './DashWelcomeCards.css';

interface DashWelcomeCardsProps {
    username: string;
    currentDate: string;
}

const DashWelcomeCards: React.FC<DashWelcomeCardsProps> = ({ username, currentDate }) => {
    return (
        <Row className="g-2">
            {/* Left Card */}
            <Col md={6}>
                <Card className="top-card">
                    <Card.Body className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            <div className="icon-circle dark">
                                <FaUser />
                            </div>
                            <span className="ms-2 fw-semibold">Welcome, {username}</span>
                        </div>
                        <div className="divider-vertical" />
                        <span className="fw-semibold text-end">{currentDate}</span>
                    </Card.Body>
                </Card>
            </Col>

            {/* Right Card */}
            <Col md={6}>
                <Card className="top-card">
                    <Card.Body className="d-flex align-items-center justify-content-between">
                        <span className="fw-semibold">Notifications</span>
                        <div className="d-flex align-items-center">
                            <div className="icon-circle dark me-2">
                                <FaBell />
                            </div>
                            <div className="divider-vertical me-2" />
                            <div className="icon-circle blue">
                                <FaStar />
                            </div>
                        </div>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default DashWelcomeCards;
