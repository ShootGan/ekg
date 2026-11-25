import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { create } from '../model/ecg';
import { mulberry32 } from '../lib/rng';

export interface Mark {
  pole: string;
  n: string;
  t0: number;
  t1: number;
  txt: string;
  m?: string;
  c?: string[];
}

export interface EcgPrintHandle {
  focusOn(t0: number, t1: number, lead: string, scale?: number): void;
  reset(): void;
  getLastDt(): number | null;
  anchor(lead: string, t0?: number, t1?: number): DOMRect | null;
}

export interface EcgPrintProps {
  ecg: Record<string, unknown>;
  seed: number;
  marks?: Mark[];
  onCal?: (dtMs: number | null) => void;
  review?: { zaznaczenia?: Mark[]; focus?: string[]; dim?: boolean };
  reviewStatus?: (m: Mark) => 'ok' | 'brak' | 'zle';
  heightMm?: number;
  footer?: string;
  onDraw?: () => void;
}

const MM = 4;
const W = 250 * MM;
const COLW = 62.5 * MM;
const ROWH = 30 * MM;
const TOP = 22 * MM;
const PX_PER_S = 25 * MM;
const MIN_H_MM = 130;
const DEF_H_MM = 140;
const LAY = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
const STATUS = { ok: '#1b8a4a', brak: '#c62828', zle: '#c2620a' };
const ACCENT = '#b3261e';
const MARK = '#1f5fa8';
const FOCUS = '#24506e';

interface Trace {
  n: string;
  x0: number;
  y0: number;
  p: [number, number][];
  sep: boolean;
}

interface View {
  cv: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  dpr: number;
  base: number;
  s: number;
  ox: number;
  oy: number;
  hMm: number;
  yr: number;
  footer?: string;
  traces: Trace[];
  cal: [[number, number], [number, number]] | null;
  calOn: boolean;
  calDrag: boolean;
  lastDt: number | null;
  onCal?: (dtMs: number | null) => void;
  marks: Mark[];
  review?: { zaznaczenia?: Mark[]; focus?: string[]; dim?: boolean };
  status?: (m: Mark) => 'ok' | 'brak' | 'zle';
  onDraw?: () => void;
  lead: (n: string, t: number) => number;
  setZoom: (z: string) => void;
  setCal: (t: string) => void;
  setCalOn: (on: boolean) => void;
}

function leadOf(m: Mark): string {
  return m.n || m.pole;
}

function rowY(v: View, n: string): number | null {
  if (n === 'pasek') return v.yr;
  for (let r = 0; r < 3; r++) if (LAY[r].indexOf(n) >= 0) return r * ROWH + TOP;
  return null;
}

function tx(t: number): number {
  return 36 + t * PX_PER_S;
}

function markY(v: View, lead: string, t0: number): number | null {
  const y = rowY(v, lead);
  if (y == null) return null;
  return y - v.lead(lead === 'pasek' ? 'II' : lead, t0 - 0.03) * 10 * MM;
}

function clampView(v: View) {
  const w = v.cv.clientWidth, h = v.cv.clientHeight, sc = v.base * v.s;
  const mw = W * sc, mh = v.hMm * MM * sc;
  v.ox = mw < w ? (w - mw) / 2 : Math.min(0, Math.max(w - mw, v.ox));
  v.oy = mh < h ? (h - mh) / 2 : Math.min(0, Math.max(h - mh, v.oy));
}

function drawFocus(v: View, lw: (px: number) => number) {
  const f = v.review?.focus;
  if (!f || !f.length) return;
  const g = v.g;
  const box = (x: number, y: number, w: number) => {
    g.globalAlpha = 0.1;
    g.fillStyle = FOCUS;
    g.fillRect(x, y - ROWH * 0.55, w, ROWH * 0.95);
    g.globalAlpha = 1;
    g.strokeStyle = FOCUS;
    g.lineWidth = lw(2.5);
    g.strokeRect(x, y - ROWH * 0.55, w, ROWH * 0.95);
  };
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) if (f.indexOf(LAY[r][c]) >= 0) box(36 + c * COLW, r * ROWH + TOP, COLW);
  if (f.indexOf('II') >= 0) box(36, v.yr, 4 * COLW);
}

function drawDim(v: View, paper: string) {
  const f = v.review?.focus;
  if (!v.review?.dim || !f || !f.length) return;
  const g = v.g;
  g.globalAlpha = 0.62;
  g.fillStyle = paper;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) if (f.indexOf(LAY[r][c]) < 0) g.fillRect(36 + c * COLW, r * ROWH + TOP - ROWH * 0.55, COLW, ROWH);
  if (f.indexOf('II') < 0 && f.indexOf('pasek') < 0) g.fillRect(36, v.yr - ROWH * 0.55, 4 * COLW, ROWH);
  g.globalAlpha = 1;
}

function drawReview(v: View, lw: (px: number) => number) {
  drawFocus(v, lw);
  const z = v.review?.zaznaczenia;
  if (!z || !z.length) return;
  const focus = v.review?.focus;
  const g = v.g, fs = 12 / Math.max(1, v.s * 0.55), placed: number[][] = [];
  z.forEach((m) => {
    const y = rowY(v, leadOf(m));
    if (y == null) return;
    if (focus && focus.length && leadOf(m) !== 'pasek' && focus.indexOf(leadOf(m)) < 0) return;
    const x0 = tx(m.t0), x1 = tx(m.t1), col = STATUS[v.status ? v.status(m) : 'ok'];
    g.globalAlpha = 0.14;
    g.fillStyle = col;
    g.fillRect(x0, y - 52, x1 - x0, 92);
    g.globalAlpha = 1;
    g.strokeStyle = col;
    g.lineWidth = lw(1.5);
    g.beginPath();
    g.moveTo(x0, y - 52);
    g.lineTo(x0, y + 40);
    g.moveTo(x1, y - 52);
    g.lineTo(x1, y + 40);
    g.stroke();
    g.font = '600 ' + fs + 'px sans-serif';
    const w = g.measureText(m.txt).width;
    let ly: number | null = null;
    const cand = [y - 57, y - 57 - (fs + 5), y + 40 + fs + 3, y + 40 + 2 * (fs + 5), y - 57 - 2 * (fs + 5)];
    for (let ci = 0; ci < cand.length && ly == null; ci++) {
      const c0 = cand[ci];
      const hit = placed.some((p) => x0 - 2 < p[2] && x0 + w + 6 > p[0] && c0 - fs < p[3] && c0 + 4 > p[1]);
      if (!hit) ly = c0;
    }
    if (ly == null) ly = cand[0];
    placed.push([x0 - 2, ly - fs, x0 + w + 6, ly + 4]);
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.fillRect(x0 - 1, ly - fs, w + 4, fs + 4);
    g.fillStyle = col;
    g.fillText(m.txt, x0 + 1, ly);
  });
}

function drawMarks(v: View, lw: (px: number) => number) {
  if (!v.marks.length) return;
  const g = v.g, fs = 14 / Math.max(1, v.s * 0.55);
  v.marks.forEach((m, i) => {
    const y = markY(v, leadOf(m), m.t0);
    if (y == null) return;
    const x0 = tx(m.t0), x1 = tx(m.t1);
    g.strokeStyle = g.fillStyle = MARK;
    g.lineWidth = lw(1.4);
    g.beginPath();
    g.moveTo(x0, y - 34);
    g.lineTo(x0, y + 14);
    g.moveTo(x1, y - 34);
    g.lineTo(x1, y + 14);
    g.moveTo(x0, y - 30);
    g.lineTo(x1, y - 30);
    g.stroke();
    g.setLineDash([lw(3), lw(2)]);
    g.beginPath();
    g.moveTo(x0 - 8, y);
    g.lineTo(x1 + 8, y);
    g.stroke();
    g.setLineDash([]);
    g.font = fs + 'px sans-serif';
    g.fillText(m.txt, x0, i % 2 ? y + 26 : y - 34 - lw(4));
  });
}

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function draw(v: View) {
  const g = v.g, cv = v.cv;
  clampView(v);
  const sc = v.base * v.s;
  const lw = (px: number) => px / Math.max(1, v.s * 0.6);
  const h = v.hMm * MM;
  const paperBg = cssVar('--paper', '#fff');
  const gridMin = cssVar('--gridMin', '#f6caca');
  const gridMaj = cssVar('--gridMaj', '#e88f8f');
  const ink = cssVar('--trace', '#111');
  g.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
  g.fillStyle = paperBg;
  g.fillRect(0, 0, cv.clientWidth, cv.clientHeight);
  g.setTransform(v.dpr * sc, 0, 0, v.dpr * sc, v.dpr * v.ox, v.dpr * v.oy);
  for (let i = 0; i <= W / MM; i++) {
    g.strokeStyle = i % 5 ? gridMin : gridMaj;
    g.lineWidth = lw(i % 5 ? 0.6 : 1);
    g.beginPath();
    g.moveTo(i * MM, 0);
    g.lineTo(i * MM, h);
    g.stroke();
  }
  for (let j = 0; j <= h / MM; j++) {
    g.strokeStyle = j % 5 ? gridMin : gridMaj;
    g.lineWidth = lw(j % 5 ? 0.6 : 1);
    g.beginPath();
    g.moveTo(0, j * MM);
    g.lineTo(W, j * MM);
    g.stroke();
  }
  drawReview(v, lw);
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = lw(1.4);
  g.font = '14px sans-serif';
  [TOP, TOP + ROWH, TOP + 2 * ROWH, v.yr].forEach((y) => {
    g.beginPath();
    g.moveTo(4, y);
    g.lineTo(8, y);
    g.lineTo(8, y - 40);
    g.lineTo(28, y - 40);
    g.lineTo(28, y);
    g.lineTo(32, y);
    g.stroke();
  });
  v.traces.forEach((t) => {
    g.fillText(t.n, t.x0 + 4, t.y0 - 48);
    g.beginPath();
    t.p.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    if (t.sep) {
      g.beginPath();
      g.moveTo(t.x0, t.y0 - 58);
      g.lineTo(t.x0, t.y0 - 44);
      g.stroke();
    }
  });
  drawDim(v, paperBg);
  if (v.footer) {
    const fy = h - 3.2 * MM;
    g.font = '600 15px ui-monospace, Consolas, monospace';
    const fw = g.measureText(v.footer).width;
    g.fillStyle = paperBg;
    g.globalAlpha = 0.86;
    g.fillRect(34, fy - 15, fw + 8, 20);
    g.globalAlpha = 1;
    g.fillStyle = ink;
    g.fillText(v.footer, 38, fy);
  }
  if (v.cal) {
    const a = v.cal[0], b = v.cal[1];
    g.strokeStyle = ACCENT;
    g.lineWidth = lw(1.2);
    g.setLineDash([4, 3]);
    g.beginPath();
    g.moveTo(a[0], 0);
    g.lineTo(a[0], h);
    g.moveTo(b[0], 0);
    g.lineTo(b[0], h);
    g.stroke();
    g.setLineDash([]);
    g.lineWidth = lw(1.6);
    g.beginPath();
    g.moveTo(a[0], a[1]);
    g.lineTo(b[0], b[1]);
    g.stroke();
  }
  drawMarks(v, lw);
  v.setZoom(v.s.toFixed(1).replace('.', ',') + '×');
  v.onDraw?.();
}

function resize(v: View) {
  const w = v.cv.clientWidth, h = v.cv.clientHeight;
  v.dpr = window.devicePixelRatio || 1;
  v.cv.width = Math.max(1, Math.round(w * v.dpr));
  v.cv.height = Math.max(1, Math.round(h * v.dpr));
  v.base = Math.min(w / W, h / (v.hMm * MM));
  draw(v);
}

function toWorld(v: View, e: { clientX: number; clientY: number }): [number, number] {
  const b = v.cv.getBoundingClientRect(), sc = v.base * v.s;
  return [(e.clientX - b.left - v.ox) / sc, (e.clientY - b.top - v.oy) / sc];
}

function zoomAt(v: View, f: number, x: number, y: number) {
  const ns = Math.min(12, Math.max(1, v.s * f));
  const s0 = v.base * v.s, s1 = v.base * ns;
  v.ox = x - (x - v.ox) * s1 / s0;
  v.oy = y - (y - v.oy) * s1 / s0;
  v.s = ns;
  draw(v);
}

function calibrate(v: View) {
  if (!v.cal) {
    v.lastDt = null;
    v.setCal('');
    v.onCal?.(null);
    return;
  }
  const a = v.cal[0], b = v.cal[1];
  const dt = Math.abs(b[0] - a[0]) * 10;
  const dv = (a[1] - b[1]) / (10 * MM);
  v.lastDt = Math.round(dt);
  v.setCal(
    'Δt ' + Math.round(dt) + ' ms' + (dt > 200 ? ' (≈' + Math.round(60000 / dt) + '/min)' : '') +
      ' · ΔU ' + (dv >= 0 ? '+' : '') + dv.toFixed(2).replace('.', ',') + ' mV'
  );
  v.onCal?.(v.lastDt);
}

function buildTrace(v: View, ecg: Record<string, unknown>, seed: number) {
  const G = create();
  G.config(ecg);
  const S = G.scheduler();
  const cx = { t0: -1.5, rand: mulberry32(seed) };
  G.schedule(S, cx, 11.5);
  const lead = (n: string, t: number) => G.lead(n, t, S, cx);
  v.lead = lead;
  v.yr = TOP + 3 * ROWH;
  const traces: Trace[] = [];
  for (let ri = 0; ri < 3; ri++) {
    const y0 = ri * ROWH + TOP;
    for (let c = 0; c < 4; c++) {
      const n = LAY[ri][c], xa = 36 + c * COLW, ts = c * 2.5, p: [number, number][] = [];
      const len = COLW - (c === 3 ? 40 : 0);
      for (let k = 0; k < len; k += 0.5) p.push([xa + k, y0 - lead(n, ts + k / PX_PER_S) * 10 * MM]);
      traces.push({ n, x0: xa, y0, p, sep: c > 0 });
    }
  }
  const rp: [number, number][] = [];
  for (let k = 0; k < W - 40; k += 0.5) rp.push([36 + k, v.yr - lead('II', k / PX_PER_S) * 10 * MM]);
  traces.push({ n: 'II', x0: 36, y0: v.yr, p: rp, sep: false });
  v.traces = traces;
}

export const EcgPrint = forwardRef<EcgPrintHandle, EcgPrintProps>(function EcgPrint(props, ref) {
  const { ecg, seed, marks, review, reviewStatus, onCal, footer, onDraw } = props;
  const hMm = Math.max(MIN_H_MM, props.heightMm ?? DEF_H_MM);
  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const viewRef = useRef<View | null>(null);
  const toggleCalRef = useRef<() => void>(() => {});
  const [zoom, setZoom] = useState('1,0×');
  const [, setCalText] = useState('');
  const [, setCalOnState] = useState(false);
  const ecgKey = JSON.stringify(ecg);

  useEffect(() => {
    const cv = cvRef.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    const v: View = {
      cv, g, dpr: 1, base: 1, s: 1, ox: 0, oy: 0, hMm, yr: TOP + 3 * ROWH, traces: [],
      cal: null, calOn: false, calDrag: false, lastDt: null, marks: [], lead: () => 0,
      setZoom, setCal: setCalText, setCalOn: setCalOnState,
    };
    viewRef.current = v;

    const pts: Record<number, [number, number]> = {};
    let lastD: number | null = null;
    let lastPos: [number, number] | null = null;

    const setCal = (on: boolean) => {
      v.calOn = on;
      v.setCalOn(on);
    };
    toggleCalRef.current = () => setCal(!v.calOn);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const b = cv.getBoundingClientRect();
      zoomAt(v, e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - b.left, e.clientY - b.top);
    };
    const onDown = (e: PointerEvent) => {
      cv.setPointerCapture(e.pointerId);
      pts[e.pointerId] = [e.clientX, e.clientY];
      if (false && Object.keys(pts).length === 1) {
        const w = toWorld(v, e);
        v.cal = [w, w];
        v.calDrag = true;
        calibrate(v);
        draw(v);
        return;
      }
      lastPos = [e.clientX, e.clientY];
    };
    const onMove = (e: PointerEvent) => {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = [e.clientX, e.clientY];
      const ids = Object.keys(pts);
      if (v.calDrag && v.cal && ids.length === 1) {
        v.cal[1] = toWorld(v, e);
        calibrate(v);
        draw(v);
        return;
      }
      if (ids.length === 2) {
        v.calDrag = false;
        const a = pts[Number(ids[0])], b = pts[Number(ids[1])];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const rc = cv.getBoundingClientRect();
        if (lastD) zoomAt(v, d / lastD, (a[0] + b[0]) / 2 - rc.left, (a[1] + b[1]) / 2 - rc.top);
        lastD = d;
      } else if (lastPos) {
        v.ox += e.clientX - lastPos[0];
        v.oy += e.clientY - lastPos[1];
        lastPos = [e.clientX, e.clientY];
        draw(v);
      }
    };
    const onUp = (e: PointerEvent) => {
      delete pts[e.pointerId];
      lastD = null;
      v.calDrag = false;
      const ids = Object.keys(pts);
      lastPos = ids.length ? pts[Number(ids[0])] : null;
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (false) {
        v.cal = null;
        calibrate(v);
        draw(v);
      }
    };

    cv.addEventListener('wheel', onWheel, { passive: false });
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    document.addEventListener('keydown', onKey);
    const ro = new ResizeObserver(() => resize(v));
    ro.observe(cv);
    resize(v);

    return () => {
      cv.removeEventListener('wheel', onWheel);
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      cv.removeEventListener('pointerup', onUp);
      cv.removeEventListener('pointercancel', onUp);
      document.removeEventListener('keydown', onKey);
      ro.disconnect();
      viewRef.current = null;
    };
  }, [hMm]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    v.marks = marks ?? [];
    v.review = review;
    v.status = reviewStatus;
    v.footer = footer;
    draw(v);
  }, [marks, review, reviewStatus, footer]);

  useEffect(() => {
    const v = viewRef.current;
    if (v) v.onCal = onCal;
  }, [onCal]);

  useEffect(() => {
    const v = viewRef.current;
    if (v) v.onDraw = onDraw;
  }, [onDraw]);

  useEffect(() => {
    const v = viewRef.current;
    if (!v) return;
    buildTrace(v, JSON.parse(ecgKey) as Record<string, unknown>, seed);
    resize(v);
  }, [ecgKey, seed]);

  useImperativeHandle(
    ref,
    () => ({
      focusOn(t0: number, t1: number, lead: string, scale = 5) {
        const v = viewRef.current;
        if (!v) return;
        const y = markY(v, lead, t0);
        if (y == null) return;
        const w = v.cv.clientWidth, h = v.cv.clientHeight;
        v.s = scale;
        v.base = Math.min(w / W, h / (v.hMm * MM));
        v.ox = w / 2 - (tx(t0) + tx(t1)) / 2 * v.base * v.s;
        v.oy = h / 2 - y * v.base * v.s;
        draw(v);
      },
      reset() {
        const v = viewRef.current;
        if (!v) return;
        v.s = 1;
        v.ox = 0;
        v.oy = 0;
        draw(v);
      },
      getLastDt() {
        return viewRef.current?.lastDt ?? null;
      },
      anchor(lead: string, t0?: number, t1?: number) {
        const v = viewRef.current;
        if (!v) return null;
        const y = rowY(v, lead);
        if (y == null) return null;
        let x0: number, x1: number;
        if (t0 != null && t1 != null) {
          x0 = tx(t0);
          x1 = tx(t1);
        } else if (lead === 'pasek') {
          x0 = 36;
          x1 = 36 + 4 * COLW;
        } else {
          const c = LAY.find((r) => r.includes(lead))?.indexOf(lead) ?? 0;
          x0 = 36 + c * COLW;
          x1 = x0 + COLW;
        }
        const sc = v.base * v.s;
        const b = v.cv.getBoundingClientRect();
        const left = b.left + v.ox + x0 * sc;
        const top = b.top + v.oy + (y - ROWH * 0.55) * sc;
        return new DOMRect(left, top, (x1 - x0) * sc, ROWH * 0.95 * sc);
      },
    }),
    []
  );

  const zoomBy = (f: number) => {
    const v = viewRef.current;
    if (!v) return;
    zoomAt(v, f, v.cv.clientWidth / 2, v.cv.clientHeight / 2);
  };

  const resetView = () => {
    const v = viewRef.current;
    if (!v) return;
    v.s = 1;
    v.ox = 0;
    v.oy = 0;
    draw(v);
  };

  return (
    <div className="ecgprint">
      <div className="row no-print" style={{ marginBottom: 8 }}>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Oddal">
          −
        </button>
        <span className="mono" style={{ minWidth: 52, textAlign: 'center' }}>
          {zoom}
        </span>
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Przybliż">
          +
        </button>
        <button type="button" onClick={resetView}>
          Reset
        </button>
      </div>
      <div className="ecgprint-scroll">
        <canvas
          ref={cvRef}
          style={{
            width: '100%',
            aspectRatio: `${W} / ${hMm * MM}`,
            display: 'block',
            background: 'var(--paper)',
            borderRadius: 4,
            border: '1px solid var(--line)',
            touchAction: 'none',
            cursor: 'grab',
          }}
        />
      </div>
      <p className="hint no-print">
        25 mm/s · 10 mm/mV · mała kratka = 40 ms / 0,1 mV, duża = 200 ms / 0,5 mV. Kółko myszy lub szczypanie dwoma
        palcami = zoom, przeciąganie = przesuw.
      </p>
    </div>
  );
});
