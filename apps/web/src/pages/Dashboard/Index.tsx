import '@/styles/dashboard.css';

import ClientflowDashboard from '@/features/dashboard/components/clientflow/ClientflowDashboard';

export default function Dashboard() {
    return (
        <div className="dashboard-container">
            <ClientflowDashboard />
        </div>
    );
}
