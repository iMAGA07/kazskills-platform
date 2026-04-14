import React, { useState } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface SparkLineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  tooltipLabel?: string;
}

export function SparkLineChart({
  data,
  color = '#2B5CE6',
  height = 180,
  tooltipLabel = 'Значение',
}: SparkLineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) return null;

  const W = 600; // viewBox width
  const H = height;
  const PAD_LEFT = 40;
  const PAD_RIGHT = 10;
  const PAD_TOP = 12;
  const PAD_BOT = 28;

  const plotW = W - PAD_LEFT - PAD_RIGHT;
  const plotH = H - PAD_TOP - PAD_BOT;

  const min = 0;
  const max = Math.max(...data.map(d => d.value)) * 1.15 || 1;

  const xStep = plotW / Math.max(data.length - 1, 1);

  const px = (i: number) => PAD_LEFT + i * xStep;
  const py = (v: number) => PAD_TOP + plotH - ((v - min) / (max - min)) * plotH;

  const points = data.map((d, i) => `${px(i)},${py(d.value)}`).join(' ');

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    value: Math.round(min + t * (max - min)),
    y: PAD_TOP + plotH - t * plotH,
  }));

  const FAINT = '#F4F6FB';
  const BORDER_C = '#E8ECF6';

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block', overflow: 'visible' }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={`ytick-${i}`}>
            <line
              x1={PAD_LEFT} y1={t.y} x2={W - PAD_RIGHT} y2={t.y}
              stroke={BORDER_C} strokeWidth={1} strokeDasharray="3 3"
            />
            <text
              x={PAD_LEFT - 6} y={t.y + 4}
              textAnchor="end" fontSize={10} fill="#9CA3AF"
            >
              {t.value}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={`xlabel-${i}`}
            x={px(i)} y={H - 6}
            textAnchor="middle" fontSize={10} fill="#9CA3AF"
          >
            {d.label}
          </text>
        ))}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover areas + dots */}
        {data.map((d, i) => (
          <g key={`point-${i}`}>
            {/* Invisible wide hit area */}
            <rect
              x={px(i) - xStep / 2}
              y={PAD_TOP}
              width={xStep}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
            {/* Visible dot on hover */}
            {hovered === i && (
              <>
                <line
                  x1={px(i)} y1={PAD_TOP}
                  x2={px(i)} y2={PAD_TOP + plotH}
                  stroke={BORDER_C} strokeWidth={1} strokeDasharray="3 3"
                />
                <circle
                  cx={px(i)} cy={py(d.value)}
                  r={5} fill="#fff" stroke={color} strokeWidth={2.5}
                />
              </>
            )}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hovered !== null && (
        <div style={{
          position: 'absolute',
          top: Math.max(0, py(data[hovered].value) - 44),
          left: `calc(${(px(hovered) / W) * 100}% + 8px)`,
          background: '#fff',
          border: `1px solid ${BORDER_C}`,
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '12px',
          color: '#374151',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          zIndex: 10,
        }}>
          <div style={{ color: '#9CA3AF', marginBottom: '2px' }}>{data[hovered].label}</div>
          <div style={{ fontWeight: 600, color: '#0F1629' }}>{data[hovered].value} <span style={{ fontWeight: 400, color: '#6B7280' }}>{tooltipLabel}</span></div>
        </div>
      )}
    </div>
  );
}
