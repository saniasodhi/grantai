import { useState } from "react";
import { useLocation } from "wouter";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface GrantPoint {
  grantId: number;
  name: string;
  funder: string;
  fitScore: number;
  amount: number | null;
  winProbability: number | null;
  focusArea: string;
}

interface GrantUniverseProps {
  matches: GrantPoint[];
}

interface TooltipPayload {
  payload?: GrantPoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-white/20 bg-[#0d1a2e]/95 p-4 shadow-2xl backdrop-blur-md max-w-xs">
      <p className="font-bold text-white text-sm leading-tight">{d.name}</p>
      <p className="text-xs text-white/50 mt-0.5">{d.funder}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-white/40">Fit</p>
          <p className="font-bold text-blue-400">{d.fitScore}%</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Amount</p>
          <p className="font-bold text-emerald-400">${d.amount ? (d.amount / 1000).toFixed(0) + "K" : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Win</p>
          <p className="font-bold text-purple-400">{d.winProbability ?? "—"}%</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-white/30">{d.focusArea} · Click to apply</p>
    </div>
  );
}

function getDotColor(winProb: number | null, fitScore: number): string {
  const prob = winProb ?? 10;
  if (prob >= 30 || fitScore >= 90) return "#10b981";
  if (prob >= 20 || fitScore >= 80) return "#3b82f6";
  if (prob >= 12 || fitScore >= 70) return "#8b5cf6";
  return "#f59e0b";
}

function getDotSize(amount: number | null): number {
  if (!amount) return 5;
  if (amount >= 400000) return 14;
  if (amount >= 200000) return 11;
  if (amount >= 100000) return 8;
  return 5;
}

export function GrantUniverse({ matches }: GrantUniverseProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState<number | null>(null);

  const data = matches.map((m) => ({
    ...m,
    x: m.fitScore,
    y: m.amount ? Math.log10(m.amount) : 3,
    displayAmount: m.amount ?? 0,
  }));

  const handleClick = (data: { grantId: number }) => {
    navigate(`/grants/${data.grantId}`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🌌</span> Your Grant Universe
          </h2>
          <p className="text-xs text-white/40 mt-0.5">
            Fit Score (x) vs Funding Amount (y) · Dot size = grant size · Color = win probability
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400 inline-block" />High win</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-400 inline-block" />Medium</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-400 inline-block" />Lower</span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <XAxis
              dataKey="x"
              type="number"
              domain={[55, 100]}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              label={{ value: "Fit Score", position: "insideBottom", offset: -4, fill: "rgba(255,255,255,0.2)", fontSize: 11 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[3.5, 6.5]}
              tickFormatter={(v: number) => `$${Math.round(Math.pow(10, v) / 1000)}K`}
              tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />
            <Scatter
              data={data}
              onClick={handleClick}
              style={{ cursor: "pointer" }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getDotColor(entry.winProbability, entry.fitScore)}
                  r={getDotSize(entry.amount)}
                  opacity={hovered === null || hovered === index ? 0.9 : 0.35}
                  stroke={hovered === index ? "white" : "transparent"}
                  strokeWidth={2}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
