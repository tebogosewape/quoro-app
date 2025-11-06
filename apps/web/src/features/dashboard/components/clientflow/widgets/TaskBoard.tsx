export type Task = {
    id: string;
    title: string;
    due?: string;
    priority?: 'low' | 'med' | 'high';
    client?: string;
    done?: boolean;
};

type Props = {
    items: Task[];
    onToggleDone?: (id: string, next: boolean) => void;
};

/**
 * Simple checklist-style presenter for agent tasks. Responsibilities are limited to rendering and
 * signalling toggle events – the container decides what to do with the mutations.
 */
export default function TaskBoard({ items, onToggleDone }: Props) {
    return (
        <div className="panel glass p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="m-0">My To-Dos</h5>
                <small className="text-muted">{items.filter((i) => !i.done).length} open</small>
            </div>
            <ul className="list-unstyled m-0">
                {items.map((t) => (
                    <li
                        key={t.id}
                        className="d-flex align-items-center justify-content-between py-2"
                        style={{ borderBottom: '1px dashed var(--glass-border)' }}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <input
                                type="checkbox"
                                checked={!!t.done}
                                onChange={(e) => onToggleDone?.(t.id, e.target.checked)}
                                aria-label={`Mark ${t.title} as done`}
                            />
                            <div>
                                <div
                                    style={{
                                        fontWeight: 600,
                                        textDecoration: t.done ? 'line-through' : 'none',
                                    }}
                                >
                                    {t.title}
                                </div>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    {t.client ? `Client: ${t.client}` : ''}{' '}
                                    {t.due ? `• Due ${new Date(t.due).toLocaleDateString()}` : ''}
                                </div>
                            </div>
                        </div>
                        {chip(t.priority)}
                    </li>
                ))}
            </ul>
        </div>
    );
}

const chip = (p?: 'low' | 'med' | 'high') => {
    const map = { low: '#89bab7', med: '#08b494', high: '#ff7a7a' } as const;
    const label = { low: 'Low', med: 'Medium', high: 'High' }[p ?? 'low'];
    const color = map[p ?? 'low'];
    return (
        <span className="badge" style={{ background: 'transparent', borderColor: color, color }}>
            {label}
        </span>
    );
};
