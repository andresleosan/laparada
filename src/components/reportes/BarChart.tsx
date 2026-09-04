import { useId } from 'react';

type Item = { label: string; value: number };

type Props = {
  data: Item[];
  width?: number;
  height?: number;
  color?: string;
};

export function BarChart({ data, width = 400, height = 200, color = '#C9A84C' }: Props) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = `bar-chart-${generatedId}-title`;
  const descriptionId = `bar-chart-${generatedId}-description`;
  const accessibleValues = data.length > 0
    ? data.map((item) => `${item.label}: ${item.value}`).join('; ')
    : 'Sin datos';
  const max = Math.max(...data.map((d) => d.value), 1);
  const padding = 16;
  const barWidth = (width - padding * 2) / Math.max(data.length, 1) - 12;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
    >
      <title id={titleId}>Gráfico de barras</title>
      <desc id={descriptionId}>{accessibleValues}</desc>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((pct) => {
        const y = height - (height - 40) * pct - 20;
        return (
          <line key={`grid-${pct}`} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#DED8CC" strokeWidth="1" strokeDasharray="4" />
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const x = padding + i * (barWidth + 12);
        const h = (d.value / max) * (height - 40);
        const y = height - h - 20;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={color} opacity="0.8" />
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={color} opacity="0.2" style={{ mixBlendMode: 'lighten' }} />
            {/* Value label */}
            <text x={x + barWidth / 2} y={y - 4} fontSize={11} fontWeight="600" fill="#201F1B" textAnchor="middle">
              {d.value}
            </text>
            {/* Label */}
            <text x={x + barWidth / 2} y={height - 4} fontSize={9} fill="#6F695F" textAnchor="middle">
              {d.label.length > 8 ? d.label.slice(0, 6) + '...' : d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
