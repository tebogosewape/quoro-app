export type DashboardEmail = {
    uid?: string | number;
    id?: string | number;
    from?: string;
    fromAddress?: string;
    subject?: string;
    date?: string | Date;
};

type DashboardMessagesPanelProps = {
    emails: DashboardEmail[];
    isLoading: boolean;
    isError: boolean;
};

const getSender = (email: DashboardEmail) =>
    email.from?.trim() || email.fromAddress?.trim() || 'Unknown sender';

const getInitial = (sender: string) => {
    const cleanSender = sender.replace(/^['"]|['"]$/g, '').trim();
    return cleanSender.charAt(0).toUpperCase() || 'U';
};

const formatMessageDate = (value?: string | Date) => {
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDifference = Math.round(
        (startOfToday.getTime() - startOfMessageDay.getTime()) / 86_400_000
    );

    if (dayDifference === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (dayDifference === 1) return 'Yesterday';

    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const getDateTime = (value?: string | Date) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const MailIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
    </svg>
);

const InboxIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16v16H4z" />
        <path d="M4 14h4l2 3h4l2-3h4" />
    </svg>
);

export default function DashboardMessagesPanel({
    emails,
    isLoading,
    isError,
}: DashboardMessagesPanelProps) {
    const recentEmails = emails.slice(0, 5);

    return (
        <section
            className="dashboard-panel dashboard-messages-panel"
            aria-labelledby="recent-messages-title"
        >
            <header className="dashboard-messages-panel__header">
                <span className="dashboard-messages-panel__heading-icon" aria-hidden="true">
                    <MailIcon />
                </span>
                <div>
                    <h2 id="recent-messages-title">Recent Messages</h2>
                    <p>Latest inbox activity</p>
                </div>
                {!isLoading && !isError && (
                    <span className="dashboard-messages-panel__count">{recentEmails.length}</span>
                )}
            </header>

            <div className="dashboard-messages-panel__body">
                {isLoading ? (
                    <div className="dashboard-messages-state" role="status">
                        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                        <span>Loading messages</span>
                    </div>
                ) : isError ? (
                    <div
                        className="dashboard-messages-state dashboard-messages-state--error"
                        role="alert"
                    >
                        <span className="dashboard-messages-state__icon" aria-hidden="true">
                            !
                        </span>
                        <div>
                            <strong>Messages unavailable</strong>
                            <span>Please try again shortly.</span>
                        </div>
                    </div>
                ) : recentEmails.length === 0 ? (
                    <div className="dashboard-messages-state dashboard-messages-state--empty">
                        <span className="dashboard-messages-state__empty-icon" aria-hidden="true">
                            <InboxIcon />
                        </span>
                        <strong>No recent messages</strong>
                        <span>Your latest emails will appear here.</span>
                    </div>
                ) : (
                    <ol className="dashboard-message-list">
                        {recentEmails.map((email, index) => {
                            const sender = getSender(email);

                            return (
                                <li
                                    key={email.uid || email.id || index}
                                    className="dashboard-message-item"
                                >
                                    <span
                                        className="dashboard-message-item__avatar"
                                        aria-hidden="true"
                                    >
                                        {getInitial(sender)}
                                    </span>
                                    <div className="dashboard-message-item__content">
                                        <div className="dashboard-message-item__meta">
                                            <span
                                                className="dashboard-message-item__sender"
                                                title={sender}
                                            >
                                                {sender}
                                            </span>
                                            <time dateTime={getDateTime(email.date)}>
                                                {formatMessageDate(email.date)}
                                            </time>
                                        </div>
                                        <p title={email.subject || 'No subject'}>
                                            {email.subject?.trim() || 'No subject'}
                                        </p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </div>
        </section>
    );
}
