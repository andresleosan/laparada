import React from 'react';

type Item = { label: string; value: number };

type Props = {
  data: Item[];
  width?: number;
  height?: number;
  color?: string;
};

export function BarChart({ data, width = 400, height = 160, color = '#C9A84C' }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const padding = 8;
  const barWidth = (width - padding * 2) / data.length - 8;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {data.map((d, i) => {
        const x = padding + i * (barWidth + 8);
        const h = (d.value / max) * (height - 40);
        const y = height - h - 20;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={barWidth} height={h} rx={4} fill={color} />
            <text x={x + barWidth / 2} y={height - 6} fontSize={10} fill="#BDBDBD" textAnchor="middle">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
