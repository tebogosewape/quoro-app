type Stage = { id: string; name: string; count: number; value?: string };
type Props = { stages: Stage[]; onOpen?: (stageId: string) => void };

/**
 * Renders a quick overview of conversion stages. The component intentionally accepts pre-calculated
 * counts and values so it stays agnostic of the underlying analytics source.
 */
export default function LeadPipeline({ stages, onOpen }: Props) {
    const total = stages.reduce((s, x) => s + x.count, 0);
    return (
        <div className="panel glass p-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="m-0">Pipeline</h5>
                <small className="text-muted">{total} total</small>
            </div>
            <div className="row g-2">
                {stages.map((s) => (
                    <div className="col-6 col-md-3" key={s.id}>
                        <button
                            className="w-100 btn btn-light"
                            style={{
                                borderRadius: 14,
                                border: '1px solid var(--glass-border)',
                                background:
                                    'linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.04))',
                                color: 'var(--text)',
                            }}
                            onClick={() => onOpen?.(s.id)}
                        >
                            <div style={{ fontWeight: 600 }}>{s.name}</div>
                            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.count}</div>
                            {s.value && (
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    {s.value}
                                </div>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
