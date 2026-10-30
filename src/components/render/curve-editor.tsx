"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { curvePath, normalizeCurve } from "@/lib/curve";
import type { CurvePoint } from "@/lib/types";

const WIDTH = 320;
const HEIGHT = 208;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function CurveEditor({
  points,
  onChange,
}: {
  points: CurvePoint[];
  onChange: (points: CurvePoint[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const normalized = normalizeCurve(points);
  const path = curvePath(normalized, WIDTH, HEIGHT);

  const updatePoint = (index: number, clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01(1 - (clientY - rect.top) / rect.height);
    const next = normalizeCurve(points).map((point) => ({ ...point }));

    if (index === 0) {
      next[0] = { x: 0, y };
    } else if (index === next.length - 1) {
      next[index] = { x: 1, y };
    } else {
      const minimum = next[index - 1].x + 0.01;
      const maximum = next[index + 1].x - 0.01;
      next[index] = { x: Math.min(maximum, Math.max(minimum, x)), y };
    }

    onChange(next);
  };

  const startDrag = (event: ReactPointerEvent<SVGCircleElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setActive(index);
    updatePoint(index, event.clientX, event.clientY);
  };

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (active === null) return;
    updatePoint(active, event.clientX, event.clientY);
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (active === null) return;
    svgRef.current?.releasePointerCapture(event.pointerId);
    setActive(null);
  };

  const activePoint = active !== null ? normalized[active] : null;

  return (
    <div className="rounded-[10px] border border-line bg-[#08090c] p-2">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="block h-auto w-full touch-none select-none"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="application"
        aria-label="Tone curve editor"
      >
        <defs>
          <linearGradient id="curve-wash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e5d3ae" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#e5d3ae" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width={WIDTH} height={HEIGHT} fill="#08090c" />
        {[1, 2, 3, 4].map((step) => (
          <g key={step}>
            <line
              x1={(WIDTH / 5) * step}
              y1="0"
              x2={(WIDTH / 5) * step}
              y2={HEIGHT}
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1={(HEIGHT / 5) * step}
              x2={WIDTH}
              y2={(HEIGHT / 5) * step}
              stroke="rgba(255,255,255,0.055)"
              strokeWidth="1"
            />
          </g>
        ))}
        <line
          x1="0"
          y1={HEIGHT}
          x2={WIDTH}
          y2="0"
          stroke="rgba(255,255,255,0.11)"
          strokeDasharray="3 5"
        />

        <path d={`${path} L ${WIDTH} ${HEIGHT} L 0 ${HEIGHT} Z`} fill="url(#curve-wash)" />
        <path d={path} fill="none" stroke="#e5d3ae" strokeWidth="1.8" strokeLinecap="round" />

        {normalized.map((point, index) => (
          <circle
            key={index}
            cx={point.x * WIDTH}
            cy={(1 - point.y) * HEIGHT}
            r={active === index ? 6.5 : 5}
            fill={active === index ? "#f6e8ca" : "#121317"}
            stroke="#e5d3ae"
            strokeWidth="1.8"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => startDrag(event, index)}
          />
        ))}
      </svg>

      <div className="flex items-center justify-between px-1.5 pb-1 pt-2">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-2">
          Shadows
        </span>
        <span className="font-mono text-[9px] text-muted">
          {activePoint
            ? `in ${Math.round(activePoint.x * 100)} · out ${Math.round(activePoint.y * 100)}`
            : "Drag a point"}
        </span>
        <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-muted-2">
          Highlights
        </span>
      </div>
    </div>
  );
}
