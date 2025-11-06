import Spark from '../charts/Spark';

export type KPI = {
    id: string;
    label: string;
    value: string | number;
    delta?: { dir: 'up' | 'down'; pct: number };
    trend?: number[];
};

type Props = { items: KPI[] };

/**
 * Displays a responsive grid of KPI tiles with support for directional deltas and micro trend charts.
 * Keep the presentation intentionally dumb; feed it already formatted values from the container.
 */
export default function KPIStats({ items }: Props) {
    return (
        <div className="row g-3">
            {items.map((k) => (
                <div className="col-12 col-sm-6 col-lg-3" key={k.id}>
                    <div className="panel glass p-3 h-100">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    {k.label}
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{k.value}</div>
                                {k.delta && (
                                    <div
                                        style={{
                                            fontSize: 12,
                                            color:
                                                k.delta.dir === 'up'
                                                    ? 'var(--brand-aqua)'
                                                    : '#ff7a7a',
                                        }}
                                    >
                                        {k.delta.dir === 'up' ? '▲' : '▼'} {k.delta.pct}% this week
                                    </div>
                                )}
                            </div>
                            {k.trend && <Spark data={k.trend} width={90} height={30} />}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
