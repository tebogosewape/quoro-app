export type EventItem = { id: string; when: string; title: string; client?: string };

type Props = { items: EventItem[]; onOpen?: (id: string) => void };

/**
 * Shows a grouped day-by-day schedule preview. Sorting and grouping happen locally so the widget
 * stays resilient even when the upstream data lacks ordering.
 */
export default function CalendarStrip({ items, onOpen }: Props) {
    const grouped = [...items]
        .sort((a, b) => +new Date(a.when) - +new Date(b.when))
        .reduce<Record<string, EventItem[]>>((acc, event) => {
            const dayKey = new Date(event.when).toLocaleDateString();
            (acc[dayKey] ||= []).push(event);
            return acc;
        }, {});
    const days: Array<[string, EventItem[]]> = Object.entries(grouped);

    return (
        <section className="card dashboard-panel p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="m-0">Schedule</h5>
                <small className="text-muted">{items.length} upcoming</small>
            </div>
            <div className="row g-3">
                {days.map(([day, list]) => (
                    <div className="col-12 col-md-6" key={day}>
                        <div className="p-2 dashboard-schedule-day">
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>{day}</div>
                            <ul className="list-unstyled m-0">
                                {list.map((entry) => (
                                    <li
                                        key={entry.id}
                                        className="d-flex justify-content-between py-1 dashboard-schedule-item"
                                        onClick={() => onOpen?.(entry.id)}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{entry.title}</div>
                                            {entry.client && (
                                                <div
                                                    className="text-muted"
                                                    style={{ fontSize: 12 }}
                                                >
                                                    {entry.client}
                                                </div>
                                            )}
                                        </div>
                                        <small className="text-muted">
                                            {new Date(entry.when).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </small>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
