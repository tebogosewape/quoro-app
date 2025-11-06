type Props = {
    data: number[];
    width?: number;
    height?: number;
    stroke?: string;
    fill?: string;
};

/**
 * Minimal SVG sparkline generator used by KPI cards. Normalises values to the available bounding
 * box so it remains adaptable regardless of data scale.
 */
export default function Spark({
    data,
    width = 100,
    height = 28,
    stroke = 'var(--brand-aqua)',
    fill = 'transparent',
}: Props) {
    if (!data.length) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);

    const normalise = (value: number) => {
        if (max === min) return height / 2;
        return height - ((value - min) / (max - min)) * height;
    };

    const step = width / (data.length - 1 || 1);
    const path = data
        .map((value, index) => `${index === 0 ? 'M' : 'L'} ${index * step},${normalise(value)}`)
        .join(' ');

    return (
        <svg width={width} height={height} role="img" aria-label="trend">
            <path
                d={path}
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}
