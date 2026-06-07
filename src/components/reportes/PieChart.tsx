import React from 'react';

type Item = { label: string; value: number; color?: string };

type Props = {
  data: Item[];
  size?: number;
};

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'L', cx, cy, 'Z'].join(' ');
  return d;
}

export function PieChart({ data, size = 160 }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let angle = 0;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const colors = ['#C9A84C', '#E5A823', '#8BC34A', '#FF7043', '#90CAF9', '#4DD0E1', '#FFB74D'];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>
      {data.map((d, i) => {
        const start = angle;
        const sliceAngle = (d.value / total) * 360;
        const end = start + sliceAngle;
        const path = describeArc(cx, cy, r, start, end);
        const sliceColor = d.color || colors[i % colors.length];
        angle = end;
        return (
          <g key={i}>
            <path d={path} fill={sliceColor} filter="url(#shadow)" opacity="0.9" />
            <path d={path} fill={sliceColor} opacity="0.2" />
          </g>
        );
      })}
      {/* Center circle for donut effect */}
      <circle cx={cx} cy={cy} r={r * 0.4} fill="#0A0A0A" />
    </svg>
  );
}
