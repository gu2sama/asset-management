import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface DataItem {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: DataItem[];
  onSliceClick?: (index: number) => void;
  centerLabel?: string;
  centerSub?: string;
  height?: number;
}

interface TooltipPayload {
  active?: boolean;
  payload?: Array<{ name?: string; value?: unknown }>;
}

function DonutTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: '8px',
      color: '#f1f5f9', fontSize: '12px', padding: '8px 12px',
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{d.name}</div>
      <div>¥{Number(d.value).toLocaleString()}</div>
    </div>
  );
}

export function SharedDonutChart({ data, onSliceClick, centerLabel, centerSub, height = 280 }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const handleClick = useCallback((_: unknown, index: number) => {
    setActiveIdx((prev) => (prev === index ? null : index));
    onSliceClick?.(index);
  }, [onSliceClick]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted text-sm" style={{ height }}>
        データがありません
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius="52%" outerRadius="72%"
            dataKey="value"
            onClick={handleClick}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.color}
                opacity={activeIdx === null || activeIdx === i ? 1 : 0.35}
                style={{ cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </Pie>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Tooltip content={DonutTooltip as any} />
        </PieChart>
      </ResponsiveContainer>

      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-text font-bold text-base leading-tight">{centerLabel}</div>
          {centerSub && <div className="text-muted text-xs mt-0.5">{centerSub}</div>}
        </div>
      )}
    </div>
  );
}
