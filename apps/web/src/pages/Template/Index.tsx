import '@/styles/template.css';
import DashWelcomeCards from '../../components/features/dashboard/DashWelcomeCards';
import { useAuthStore } from '../../stores/auth.store';
import { format } from 'date-fns';

export default function Template() {
    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const session = useAuthStore((state) => state.session);
    const username = session
        ? `${session.user.firstName} ${session.user.lastName ?? ''}`.trim()
        : 'Unknown User (Guest)';

    return (
        <div className="template-container">
            <DashWelcomeCards username={username} currentDate={todayDate} />
        </div>
    );
}
