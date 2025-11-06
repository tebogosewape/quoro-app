export type Message = {
    id: string;
    channel: 'whatsapp' | 'email' | 'sms';
    author: string;
    snippet: string;
    time: string;
    unread?: boolean;
};

type Props = { items: Message[]; onOpen?: (id: string) => void };

const Icon = ({ ch }: { ch: Message['channel'] }) => {
    const map = { whatsapp: '💬', email: '✉️', sms: '📱' } as const;
    return <span aria-hidden>{map[ch]}</span>;
};

/**
 * Lightweight inbox preview. It exposes minimal interaction (open message) so richer behaviour can
 * be layered on later without forcing breaking changes in the container.
 */
export default function UnifiedInbox({ items, onOpen }: Props) {
    return (
        <div className="panel glass p-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="m-0">Inbox</h5>
                <small className="text-muted">{items.filter((i) => i.unread).length} unread</small>
            </div>
            <ul className="list-unstyled m-0">
                {items.map((m) => (
                    <li
                        key={m.id}
                        className="py-2 d-flex align-items-start gap-2"
                        style={{
                            borderBottom: '1px dashed var(--glass-border)',
                            cursor: 'pointer',
                        }}
                        onClick={() => onOpen?.(m.id)}
                    >
                        <div style={{ fontSize: 18, width: 24, textAlign: 'center' }}>
                            <Icon ch={m.channel} />
                        </div>
                        <div className="flex-grow-1">
                            <div style={{ fontWeight: m.unread ? 700 : 500 }}>{m.author}</div>
                            <div
                                className="text-muted"
                                style={{
                                    fontSize: 12,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {m.snippet}
                            </div>
                        </div>
                        <small className="text-muted">
                            {new Date(m.time).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </small>
                    </li>
                ))}
            </ul>
        </div>
    );
}
