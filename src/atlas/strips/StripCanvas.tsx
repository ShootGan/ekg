import { useEffect, useRef } from 'react';
import type { Computed } from '../compute';
import type { Clock, Phase } from '../clock';
import type { Measure, LeadName } from '../../model/ecg';
import { phaseAt } from '../clock';
import { PH_COL } from '../../data/phases';
import { NAMES } from '../../model/ecg';
import { SR, sampleAt } from './sample';

export interface StripCanvasProps {
  caseData: Computed;
  clock: Clock;
  meas: Measure;
  lead: LeadName;
  onLeadChange(lead: LeadName): void;
  index: number;
}

interface View {
  w: number;
  h: number;
  dpr: number;
  pxmm: number;
  win: number;
}

const GAP = 0.12;

interface Band {
  k: string;
  a0: number;
  a1: number;
}

function bandsFor(c: Computed, ph: Phase): Band[] {
  const out: Band[] = [];
  let b = ph.v && ph.v.ph ? ph.v.b : null;
  let a = null;
  if (!b && ph.a && (ph.a.ph === 'P' || ph.a.ph === 'PR')) {
    a = ph.a.a;
    b = a.beat;
  }
  if (b && b.ta != null && !a) a = c.ATR.find((x) => x.beat === b) || null;
  if (!b && ph.a && ph.a.ph === 'blok') {
    const A = ph.a.a;
    out.push({ k: 'P', a0: A.t, a1: A.t + A.Pdur });
    return out;
  }
  if (a && !c.heart.atria) {
    out.push({ k: 'P', a0: a.t, a1: a.t + a.Pdur });
    if (b) out.push({ k: 'PR', a0: a.t + a.Pdur, a1: b.t });
  }
  if (b) {
    out.push({ k: 'QRS', a0: b.t, a1: b.t + b.D });
    out.push({ k: 'ST', a0: b.t + b.D, a1: b.t + b.stEnd });
    out.push({ k: 'T', a0: b.t + b.stEnd, a1: b.t + b.tEnd });
  }
  if (!b && !a && ph.v) {
    const pb = ph.v.b;
    const nb = c.BEATS[ph.v.i + 1];
    if (nb) out.push({ k: 'TP', a0: pb.t + pb.tEnd, a1: nb.ta != null && !c.heart.atria ? nb.ta : nb.t });
  }
  return out;
}

function rgb(theme: ReturnType<typeof readTheme>, k: string): string {
  const v = (theme.ph as Record<string, string>)[k];
  if (v) return v;
  const c = PH_COL[k as keyof typeof PH_COL] || '160,160,160';
  return c.startsWith('var') ? '160,160,160' : c;
}

export function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string, d: string) => cs.getPropertyValue(n).trim() || d;
  return {
    paper: g('--paper', '#fff7f5'),
    gridMin: g('--gridMin', '#f6c9c2'),
    gridMaj: g('--gridMaj', '#e88d82'),
    trace: g('--trace', '#111'),
    ph: {
      P: g('--P', '66,135,245'),
      PR: g('--PR', '140,140,140'),
      QRS: g('--QRS', '220,50,40'),
      ST: g('--ST', '235,150,20'),
      T: g('--T', '40,160,90'),
      TP: '160,160,160',
      F: g('--F', '120,80,200'),
      blok: '214,40,40'
    }
  };
}

export function StripCanvas(props: StripCanvasProps) {
  const { caseData: c, clock, lead, onLeadChange, index } = props;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLCanvasElement | null>(null);
  const fgRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<View | null>(null);
  const themeRef = useRef<ReturnType<typeof readTheme> | null>(null);

  const measureRef = useRef(props.meas);
  measureRef.current = props.meas;

  useEffect(() => {
    const host = hostRef.current;
    const bg = bgRef.current;
    const fg = fgRef.current;
    if (!host || !bg || !fg) return;

    const theme = readTheme();
    themeRef.current = theme;

    const paintGrid = () => {
      const v = viewRef.current;
      if (!v) return;
      const g = bg.getContext('2d');
      if (!g) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, bg.width, bg.height);
      g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      g.fillStyle = theme.paper;
      g.fillRect(0, 0, v.w, v.h);
      for (let x = 0, k = 0; x <= v.w; x += v.pxmm, k++) {
        g.strokeStyle = k % 5 ? theme.gridMin : theme.gridMaj;
        g.lineWidth = k % 5 ? 0.5 : 1;
        g.beginPath();
        g.moveTo(x + 0.25, 0);
        g.lineTo(x + 0.25, v.h);
        g.stroke();
      }
      for (let y = v.h, k = 0; y >= 0; y -= v.pxmm, k++) {
        g.strokeStyle = k % 5 ? theme.gridMin : theme.gridMaj;
        g.lineWidth = k % 5 ? 0.5 : 1;
        g.beginPath();
        g.moveTo(0, y - 0.25);
        g.lineTo(v.w, y - 0.25);
        g.stroke();
      }
    };

    const resize = () => {
      const w = host.clientWidth || 800;
      const pxmm = w >= 700 ? 5 : 4;
      const win = w / pxmm / 25;
      const h = Math.round(30 * pxmm);
      const dpr = window.devicePixelRatio || 1;
      for (const cv of [bg, fg]) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
        cv.style.width = w + 'px';
        cv.style.height = h + 'px';
      }
      viewRef.current = { w, h, dpr, pxmm, win };
      clock.setWindow(win);
      paintGrid();
      clock.flush();
    };

    const draw = (t: number, ph: Phase) => {
      const v = viewRef.current;
      if (!v) return;
      const g = fg.getContext('2d');
      if (!g) return;
      const scrub = clock.scrubRef.current;
      const s0 = scrub ? scrub.s0 : Math.floor(t / v.win) * v.win;
      const pxs = v.pxmm * 25;
      const full = !clock.playingRef.current;
      const xOf = (tt: number) => (tt >= s0 ? (tt - s0) * pxs : (tt - s0 + v.win) * pxs);
      const bands = bandsFor(c, ph);
      g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
      g.clearRect(0, 0, v.w, v.h);
      const base = v.h * 0.58;
      const sc = clock.gainRef.current * v.pxmm;

      for (const band of bands) {
        const lo = full ? Math.max(band.a0, s0) : Math.max(band.a0, t - v.win + GAP);
        const hi = full ? Math.min(band.a1, s0 + v.win) : Math.min(band.a1, t);
        if (hi <= lo) continue;
        const cur = band.k === ph.key || !!(ph.a && ph.a.ph === 'blok' && band.k === 'P');
        g.fillStyle = `rgba(${rgb(theme, band.k)},${cur ? 0.26 : 0.11})`;
        const segs: [number, number][] = lo < s0 && hi > s0 ? [[lo, s0 - 1e-6], [s0, hi]] : [[lo, hi]];
        for (const [p, q] of segs) {
          const x0 = xOf(p);
          const x1 = xOf(q);
          g.fillRect(x0, 0, Math.max(1, x1 - x0), v.h);
        }
        if (index === 0) {
          const xm = xOf((lo + hi) / 2);
          g.fillStyle = `rgb(${rgb(theme, band.k)})`;
          g.font = 'bold 11px system-ui';
          g.textAlign = 'center';
          if ((hi - lo) * pxs > 16) g.fillText(band.k, xm, v.h - 5);
        }
      }

      g.strokeStyle = theme.trace || '#111';
      g.lineWidth = 1.5;
      g.lineJoin = 'round';
      const drawSeg = (ta: number, tb: number, xoff: number) => {
        if (tb <= ta) return;
        const i0 = Math.max(0, Math.ceil(ta * SR));
        const i1 = Math.floor(tb * SR);
        g.beginPath();
        for (let i = i0; i <= i1; i++) {
          const x = (i / SR - xoff) * pxs;
          const y = base - sampleAt(c, lead, i) * sc;
          if (i === i0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      };
      if (full) drawSeg(s0, s0 + v.win, s0);
      else {
        drawSeg(s0, t, s0);
        drawSeg(Math.max(0, t - v.win + GAP), s0, s0 - v.win);
      }

      const xc = (t - s0) * pxs;
      g.fillStyle = 'rgba(30,30,30,.85)';
      g.fillRect(xc - 1, 0, 2, v.h);
      if (full) {
        g.beginPath();
        g.moveTo(xc - 7, 0);
        g.lineTo(xc + 7, 0);
        g.lineTo(xc, 9);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(xc - 7, v.h);
        g.lineTo(xc + 7, v.h);
        g.lineTo(xc, v.h - 9);
        g.closePath();
        g.fill();
      }
      g.beginPath();
      g.arc(xc, base - sampleAt(c, lead, Math.round(t * SR)) * sc, 3.5, 0, 7);
      g.fillStyle = '#b3261e';
      g.fill();
    };

    const toT = (e: PointerEvent) => {
      const v = viewRef.current as View;
      const r = fg.getBoundingClientRect();
      const x = Math.max(0, Math.min(r.width - 1, e.clientX - r.left));
      const s0 = clock.scrubRef.current ? clock.scrubRef.current.s0 : Math.floor(clock.tRef.current / v.win) * v.win;
      return s0 + x / (v.pxmm * 25);
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      const v = viewRef.current as View;
      clock.setPlaying(false);
      clock.scrubRef.current = { s0: Math.floor(clock.tRef.current / v.win) * v.win };
      fg.setPointerCapture(e.pointerId);
      clock.tRef.current = toT(e);
      clock.flush();
    };
    const onMove = (e: PointerEvent) => {
      if (clock.scrubRef.current && fg.hasPointerCapture(e.pointerId)) {
        clock.tRef.current = toT(e);
        clock.flush();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (clock.scrubRef.current) {
        clock.tRef.current = toT(e);
        clock.scrubRef.current = null;
        clock.flush();
      }
    };
    const onCancel = () => {
      clock.scrubRef.current = null;
    };

    fg.style.cursor = 'col-resize';
    fg.style.touchAction = 'none';
    fg.addEventListener('pointerdown', onDown);
    fg.addEventListener('pointermove', onMove);
    fg.addEventListener('pointerup', onUp);
    fg.addEventListener('pointercancel', onCancel);

    const off = clock.onFrame((t, ph) => draw(t, ph));
    const ro = new ResizeObserver(() => resize());
    ro.observe(host);
    resize();
    draw(clock.tRef.current, phaseAt(c, clock.tRef.current));

    return () => {
      off();
      ro.disconnect();
      fg.removeEventListener('pointerdown', onDown);
      fg.removeEventListener('pointermove', onMove);
      fg.removeEventListener('pointerup', onUp);
      fg.removeEventListener('pointercancel', onCancel);
    };
  }, [c, clock, lead, index]);

  return (
    <div className="atlas-strip" ref={hostRef}>
      <select
        className="atlas-strip-lead"
        value={lead}
        aria-label="Odprowadzenie paska"
        onChange={(e) => onLeadChange(e.target.value as LeadName)}
      >
        {NAMES.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <canvas ref={bgRef} />
      <canvas ref={fgRef} className="atlas-strip-fg" />
    </div>
  );
}
