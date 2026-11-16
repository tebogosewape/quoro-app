import type { ReactNode } from 'react';

export type DashboardMetricTone = 'teal' | 'blue' | 'violet' | 'red';
export type DashboardMetricIcon = 'clients' | 'tasks' | 'warning' | 'performance';

type DashboardMetricCardProps = {
    label: string;
    value: string | number;
    helper: string;
    icon: DashboardMetricIcon;
    tone: DashboardMetricTone;
    attention?: boolean;
};

export default function DashboardMetricCard({
    label,
    value,
    helper,
    icon,
    tone,
    attention = false,
}: DashboardMetricCardProps) {
    const icons: Record<DashboardMetricIcon, ReactNode> = {
        clients: (
            <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </>
        ),
        tasks: (
            <>
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </>
        ),
        warning: (
            <>
                <path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z" />
                <path d="M12 9v4M12 17h.01" />
            </>
        ),
        performance: (
            <>
                <path d="M3 3v18h18" />
                <path d="m7 16 4-5 4 3 5-7" />
            </>
        ),
    };

    return (
        <article className={`dashboard-metric-card dashboard-metric-card--${tone}`}>
            <div className="dashboard-metric-card__topline">
                <span className="dashboard-metric-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {icons[icon]}
                    </svg>
                </span>
                {attention && <span className="dashboard-metric-card__status">Attention</span>}
            </div>
            <p className="dashboard-metric-card__label">{label}</p>
            <strong className="dashboard-metric-card__value">{value}</strong>
            <p className="dashboard-metric-card__helper">{helper}</p>
        </article>
    );
}
