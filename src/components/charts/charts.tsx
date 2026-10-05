"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Axis labels are text — use the AA-safe token (ink-40 is ~3.7:1).
const AXIS = { fontSize: 11, fill: "var(--color-ink-50)" };

const tooltipStyle = {
  background: "var(--color-canvas)",
  border: "1px solid var(--color-ink-12)",
  borderRadius: 12,
  fontSize: 13,
  color: "var(--color-ink)",
  padding: "8px 12px",
} as const;

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="h-[210px] w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        {children as never}
      </ResponsiveContainer>
    </div>
  );
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  ariaLabel,
}: {
  data: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  ariaLabel: string;
}) {
  const rows = data.filter((d) => d.value > 0);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <div className="relative h-[190px] w-[190px] shrink-0" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="label"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
              isAnimationActive={false}
            >
              {rows.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
        <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold leading-none">
            {centerValue}
          </span>
          <span className="mt-1 text-[11px] uppercase tracking-wider text-ink-50">
            {centerLabel}
          </span>
        </span>
      </div>

      <ul className="w-full space-y-2 sm:max-w-[180px]">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-pill"
              style={{ background: d.color }}
              aria-hidden
            />
            <span className="flex-1 truncate text-ink-70">{d.label}</span>
            <span className="font-head font-bold tabular-nums">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({
  data,
  ariaLabel,
}: {
  data: { day: string; events: number }[];
  ariaLabel: string;
}) {
  return (
    <Frame label={ariaLabel}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-ink-06)" vertical={false} />
        <XAxis
          dataKey="day"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          interval={6}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-ink-12)" }} />
        <Area
          type="monotone"
          dataKey="events"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          fill="url(#trendFill)"
          isAnimationActive={false}
          name="Activity"
        />
      </AreaChart>
    </Frame>
  );
}

export function WorkloadChart({
  data,
  ariaLabel,
}: {
  data: { name: string; open: number; done: number; color: string }[];
  ariaLabel: string;
}) {
  return (
    <Frame label={ariaLabel}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -26, bottom: 0 }}>
        <CartesianGrid stroke="var(--color-ink-06)" vertical={false} />
        <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} width={44} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "var(--color-ink-06)" }}
        />
        <Bar dataKey="open" stackId="a" fill="var(--color-primary)" name="Open" radius={[0, 0, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="done" stackId="a" fill="var(--color-ink-12)" name="Done" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </Frame>
  );
}

export function SeverityChart({
  data,
  ariaLabel,
}: {
  data: { label: string; value: number; color: string }[];
  ariaLabel: string;
}) {
  return (
    <Frame label={ariaLabel}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 12, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--color-ink-06)" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-ink-06)" }} />
        <Bar dataKey="value" name="Issues" radius={[0, 6, 6, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </Frame>
  );
}
