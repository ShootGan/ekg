import { useEffect, useRef } from 'react';
import { create } from '../model/ecg';
import type { ECGConfig, Generator, SchedulerState } from '../model/ecg';
import { mulberry32 } from '../lib/rng';

export interface PaperStripProps {
  cfg: ECGConfig | ECGConfig[];
  onCase?: (i: number) => void;
  leads: string[];
  rowMm?: number;
  mmPx?: number;
  live?: boolean;
  seed?: number;
  className?: string;
  label?: string;
}

const SPAN = 300;
const SPEED_MM = 25;
const MV_MM = 10;

interface Src {
  gen: Generator;
  S: SchedulerState;
}

function source(cfg: ECGConfig, seed: number): Src {
  const gen = create();
  gen.config(cfg);
  const S = gen.scheduler();
  gen.schedule(S, { t0: 0, rand: mulberry32(seed) }, SPAN + 2);
  return { gen, S };
}

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function drawGrid(g: CanvasRenderingContext2D, w: number, h: number, mm: number) {
  const min = cssVar('--gridMin', '#f0c4bf');
  const maj = cssVar('--gridMaj', '#de918a');
  g.fillStyle = cssVar('--paper', '#fffdf9');
  g.fillRect(0, 0, w, h);
  const line = (x0: number, y0: number, x1: number, y1: number, major: boolean) => {
    g.strokeStyle = major ? maj : min;
    g.lineWidth = major ? 1 : 0.6;
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.stroke();
  };
  for (let i = 0; i * mm <= w; i++) line(Math.round(i * mm) + 0.5, 0, Math.round(i * mm) + 0.5, h, i % 5 === 0);
  for (let j = 0; j * mm <= h; j++) line(0, Math.round(j * mm) + 0.5, w, Math.round(j * mm) + 0.5, j % 5 === 0);
}

export function PaperStrip({ cfg, onCase, leads, rowMm = 18, mmPx = 6, live = false, seed = 7, className, label }: PaperStripProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onCaseRef = useRef(onCase);
  onCaseRef.current = onCase;
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const cfgKey = JSON.stringify(cfg);

  useEffect(() => {
    const host = hostRef.current;
    const cv = cvRef.current;
    if (!host || !cv) return;
    const g = cv.getContext('2d');
    if (!g) return;
    const parsed = JSON.parse(cfgKey) as ECGConfig | ECGConfig[];
    const cfgs = Array.isArray(parsed) ? parsed : [parsed];
    const srcs = new Map<number, Src>();
    const srcFor = (i: number) => {
      let s = srcs.get(i);
      if (!s) {
        s = source(cfgs[i], seed + i);
        srcs.set(i, s);
      }
      return s;
    };
    let shown = -1;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animate = live && !reduced;
    const speed = SPEED_MM * mmPx;
    const rowH = rowMm * mmPx;
    const h = rowH * leads.length;
    const grid = document.createElement('canvas');
    let w = 0;
    let dpr = 1;
    let ys: Float32Array[] = [];
    let drawn = 0;
    let raf = 0;
    let t0 = performance.now();
    let ink = '#1b1714';
    let pen = '#b4232c';

    const caseAt = (p: number) => Math.floor(p / w) % cfgs.length;
    const value = (lead: string, p: number) => {
      const src = srcFor(caseAt(p));
      return src.gen.lead(lead, (p / speed) % SPAN, src.S, {});
    };

    const fill = (from: number, to: number) => {
      for (let p = from; p < to; p++) {
        const col = p % w;
        leads.forEach((L, r) => {
          ys[r][col] = rowH * r + rowH * 0.62 - value(L, p) * MV_MM * mmPx;
        });
      }
    };

    const setup = () => {
      w = Math.max(120, Math.floor(host.clientWidth));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = w * dpr;
      cv.height = h * dpr;
      cv.style.height = h + 'px';
      grid.width = cv.width;
      grid.height = cv.height;
      const gg = grid.getContext('2d');
      if (gg) {
        gg.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawGrid(gg, w, h, mmPx);
      }
      ink = cssVar('--trace', '#1b1714');
      pen = cssVar('--pen', '#b4232c');
      ys = leads.map(() => new Float32Array(w).fill(NaN));
      drawn = 0;
      shown = -1;
      t0 = performance.now();
      if (!animate) {
        fill(0, w);
        drawn = w;
        onCaseRef.current?.(0);
      }
    };

    const render = () => {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(grid, 0, 0);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const head = animate ? drawn % w : -1;
      const gap = 18;
      g.strokeStyle = ink;
      g.lineWidth = 1.6;
      g.lineJoin = 'round';
      leads.forEach((L, r) => {
        const row = ys[r];
        g.beginPath();
        let on = false;
        for (let x = 0; x < w; x++) {
          const y = row[x];
          const hidden = animate && x > head && x <= head + gap;
          if (Number.isNaN(y) || hidden) {
            on = false;
            continue;
          }
          if (on) g.lineTo(x, y);
          else g.moveTo(x, y);
          on = true;
        }
        g.stroke();
        g.fillStyle = ink;
        g.font = '500 14px Georgia, serif';
        g.fillText(L, 10, rowH * r + 20);
        if (animate && head >= 0) {
          g.fillStyle = pen;
          g.beginPath();
          g.arc(head, row[head], 3.5, 0, Math.PI * 2);
          g.fill();
        }
      });
    };

    const tick = (now: number) => {
      const target = Math.floor(((now - t0) / 1000) * speed);
      if (target > drawn) {
        fill(drawn, target);
        drawn = target;
        const c = caseAt(drawn);
        if (c !== shown) {
          shown = c;
          onCaseRef.current?.(c);
          if (srcs.size > 3) for (const k of srcs.keys()) if (k !== c && k !== (c + 1) % cfgs.length) srcs.delete(k);
        }
      }
      render();
      raf = requestAnimationFrame(tick);
    };

    setup();
    if (animate) raf = requestAnimationFrame(tick);
    else render();

    const ro = new ResizeObserver(() => {
      if (Math.floor(host.clientWidth) === w) return;
      setup();
      if (!animate) render();
    });
    ro.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [cfgKey, leads.join(','), rowMm, mmPx, live, seed]);

  return (
    <div ref={hostRef} className={className} role="img" aria-label={label}>
      <canvas ref={cvRef} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}
