import { useEffect, useRef, useState } from 'react';

export interface SweepProps {
  height?: number;
  label?: string;
}

type Pt = [number, number];

const cycle: Pt[] = [
  [0, 0],
  [0.1, 0],
  [0.16, -0.12],
  [0.2, 0],
  [0.26, 0.03],
  [0.3, -1],
  [0.34, 0.32],
  [0.4, 0],
  [0.5, 0],
  [0.56, 0],
  [0.64, -0.26],
  [0.74, -0.3],
  [0.84, 0],
  [1, 0],
];

function buildPath(width: number, height: number, beats: number, offset: number): string {
  const base = height * 0.62;
  const amp = height * 0.34;
  const len = width;
  let d = '';
  for (let b = 0; b < beats; b++) {
    for (let i = 0; i < cycle.length; i++) {
      const [fx, fy] = cycle[i];
      const x = ((fx + b) / beats) * len - offset;
      const y = base + fy * amp;
      d += (d ? ' L' : 'M') + x.toFixed(2) + ',' + y.toFixed(2);
    }
  }
  return d;
}

export function EcgSweep({ height = 44, label }: SweepProps) {
  const [w, setW] = useState(240);
  const [t, setT] = useState(0);
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => setW(Math.max(120, host.clientWidth)));
    ro.observe(host);
    setW(Math.max(120, host.clientWidth));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.06, (now - last) / 1000);
      last = now;
      setT((v) => (v + dt * 26) % 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const beats = 4;
  const period = w;
  const off = (t / 1000) * period * beats;

  return (
    <div className="sweep" ref={hostRef}>
      <svg width={w} height={height} aria-hidden="true">
        <defs>
          <linearGradient id="sweepFade" x1="0" x2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="0.3" stopColor="var(--accent)" stopOpacity="0.8" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <line x1="0" y1={height * 0.62} x2={w} y2={height * 0.62} stroke="var(--line)" strokeWidth="1" />
        <g style={{ transform: `translateX(${-off}px)` }}>
          {[-1, 0, 1, 2].map((k) => (
            <path
              key={k}
              d={buildPath(period, height, beats, 0)}
              transform={`translate(${k * period},0)`}
              fill="none"
              stroke="url(#sweepFade)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      </svg>
      {label ? <span className="sweep-label">{label}</span> : null}
    </div>
  );
}
