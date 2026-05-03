import { useEffect, useRef, useState } from "react";

interface WinGaugeProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function WinGauge({ value, size = 64, strokeWidth = 6 }: WinGaugeProps) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const duration = 1200;

  useEffect(() => {
    startRef.current = null;
    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * value));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - displayed / 100);

  // Color: red→yellow→green based on value
  const getColor = (v: number) => {
    if (v >= 80) return "#10b981"; // emerald
    if (v >= 50) return "#f59e0b"; // amber
    if (v >= 25) return "#3b82f6"; // blue
    return "#ef4444";              // red
  };

  const color = getColor(value);
  const isHigh = value >= 80;

  return (
    <div className="relative flex flex-col items-center gap-1">
      <div
        className="relative"
        style={{
          filter: isHigh ? `drop-shadow(0 0 6px ${color}88)` : undefined,
        }}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Filled arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
        </svg>
        {/* Center text */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ transform: "rotate(0deg)" }}
        >
          <span
            className="font-black leading-none tabular-nums"
            style={{ fontSize: size * 0.22, color }}
          >
            {displayed}%
          </span>
        </div>
      </div>
      {isHigh && (
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            boxShadow: `0 0 16px ${color}44`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
