import React, { useState } from 'react';

interface MonthlyPoint {
  month: string;
  usage: number;
}

interface UsageChartProps {
  id?: string;
  history: MonthlyPoint[];
  avgMonthlyUsage: number;
  requestedQuantity: number;
  recommendedQuantity: number;
  monthsOfSupply: number;
}

export const UsageChart: React.FC<UsageChartProps> = ({
  id = 'usage-analysis-chart',
  history,
  avgMonthlyUsage,
  requestedQuantity,
  recommendedQuantity,
  monthsOfSupply,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Maximum value for scaling SVG chart bars
  const maxUsage = Math.max(
    avgMonthlyUsage * 1.5,
    ...history.map((h) => h.usage),
    1
  );

  const chartHeight = 110;
  const chartWidth = 320;
  const barWidth = 44;
  const spacing = (chartWidth - history.length * barWidth) / (history.length + 1);

  // Y-coordinate for average line
  const avgY = chartHeight - (avgMonthlyUsage / maxUsage) * (chartHeight - 24) - 12;

  return (
    <div id={id} className="w-full space-y-3">
      {/* Metric Pills Bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-slate-400 block font-medium">Requested</span>
          <span className="font-mono font-bold text-slate-900 text-xs">{requestedQuantity}</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-slate-400 block font-medium">90d Average</span>
          <span className="font-mono font-bold text-slate-800 text-xs">{avgMonthlyUsage}/mo</span>
        </div>
        <div className="bg-white p-2 rounded border border-slate-200">
          <span className="text-slate-400 block font-medium">Coverage</span>
          <span className="font-mono font-bold text-amber-600 text-xs">{monthsOfSupply} mos</span>
        </div>
        <div className="bg-white p-2 rounded border border-emerald-200 bg-emerald-50/40">
          <span className="text-emerald-700 block font-medium">Recommended</span>
          <span className="font-mono font-bold text-emerald-800 text-xs">{recommendedQuantity}</span>
        </div>
      </div>

      {/* SVG Bar & Baseline Chart */}
      <div className="relative bg-white rounded-lg p-2 border border-slate-200/80">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 px-1">
          <span className="font-semibold text-slate-600">90-Day Consumption Trend (Units)</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-500 inline-block border-t border-dashed border-amber-600"></span>
            <span className="text-slate-500">Monthly Avg ({avgMonthlyUsage})</span>
          </span>
        </div>

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-28 overflow-visible"
        >
          {/* Background Grid Lines */}
          <line
            x1="0"
            y1={chartHeight - 12}
            x2={chartWidth}
            y2={chartHeight - 12}
            stroke="#e2e8f0"
            strokeWidth="1"
          />

          {/* Average Baseline Line */}
          <line
            x1="0"
            y1={avgY}
            x2={chartWidth}
            y2={avgY}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          <text
            x={chartWidth - 4}
            y={avgY - 4}
            fill="#d97706"
            fontSize="9"
            fontWeight="bold"
            textAnchor="end"
            fontFamily="monospace"
          >
            Avg: {avgMonthlyUsage}
          </text>

          {/* Bars */}
          {history.map((point, index) => {
            const x = spacing + index * (barWidth + spacing);
            const barHeight = Math.max(8, (point.usage / maxUsage) * (chartHeight - 34));
            const y = chartHeight - 12 - barHeight;
            const isHovered = hoveredIdx === index;

            return (
              <g
                key={point.month}
                onMouseEnter={() => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-all"
              >
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className={
                    isHovered
                      ? 'fill-indigo-700 transition-colors'
                      : 'fill-indigo-500 hover:fill-indigo-600 transition-colors'
                  }
                />

                {/* Value label on top of bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 4}
                  fill={isHovered ? '#1e1b4b' : '#475569'}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {point.usage}
                </text>

                {/* Month label on x-axis */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 1}
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                >
                  {point.month}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>Actual monthly withdrawals from stock master</span>
          <span className="font-medium text-slate-700">
            {monthsOfSupply > 3 ? 'Over-replenishment flagged' : 'Balanced run-rate'}
          </span>
        </div>
      </div>
    </div>
  );
};
