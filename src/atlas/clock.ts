import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AtrEv, Beat, Computed } from './compute';
import type { PhaseKey } from '../data/phases';

export type VentPh = 'QRS' | 'ST' | 'T';

export interface VState {
  b: Beat;
  i: number;
  r: number;
  ph: VentPh;
}

export interface AState {
  a: AtrEv;
  i: number;
  r: number;
  ph: 'P' | 'PR' | 'blok' | null;
}

export interface Phase {
  key: PhaseKey;
  v: VState | null;
  a: AState | null;
}

export function bsearch(arr: { t: number }[], t: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (arr[m].t <= t) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
}

export function ventState(c: Computed, t: number): VState | null {
  const i = bsearch(c.BEATS, t);
  if (i < 0) return null;
  const b = c.BEATS[i];
  const r = t - b.t;
  const ph: VentPh | null = r < b.D ? 'QRS' : r < b.stEnd ? 'ST' : r < b.tEnd ? 'T' : null;
  return ph ? { b, i, r, ph } : null;
}

export function atrState(c: Computed, t: number): AState | null {
  const i = bsearch(c.ATR, t);
  if (i < 0) return null;
  const a = c.ATR[i];
  const r = t - a.t;
  if (r < a.Pdur) return { a, i, r, ph: 'P' };
  if (a.beat && t < a.beat.t) return { a, i, r, ph: 'PR' };
  if (!a.beat && c.heart.block && r < 0.42 && !c.heart.dissoc) return { a, i, r, ph: 'blok' };
  return { a, i, r, ph: null };
}

export function phaseAt(c: Computed, t: number): Phase {
  const v = ventState(c, t);
  const a = c.ATR.length ? atrState(c, t) : null;
  const fl = c.heart.atria;
  let key: PhaseKey = v && v.ph ? v.ph : a && a.ph ? (a.ph === 'blok' ? 'TP' : a.ph) : fl ? 'F' : 'TP';
  if (fl && !(v && v.ph)) {
    const nb = c.BEATS[v ? v.i + 1 : 0];
    if (nb && nb.t - t < 0.1) key = 'PR';
  }
  return { key, v, a };
}

export function boundaries(c: Computed, t: number): number[] {
  const out: number[] = [];
  const i = Math.max(0, bsearch(c.BEATS, t) - 2);
  for (let k = i; k < Math.min(c.BEATS.length, i + 6); k++) {
    const b = c.BEATS[k];
    out.push(b.t, b.t + b.D, b.t + b.stEnd, b.t + b.tEnd);
  }
  if (c.ATR.length) {
    const j = Math.max(0, bsearch(c.ATR, t) - 2);
    for (let k = j; k < Math.min(c.ATR.length, j + 7); k++) {
      const a = c.ATR[k];
      out.push(a.t, a.t + a.Pdur);
    }
  }
  return out.sort((x, y) => x - y);
}

export type FrameCb = (t: number, ph: Phase) => void;

export interface Clock {
  tRef: { current: number };
  winRef: { current: number };
  scrubRef: { current: { s0: number } | null };
  playingRef: { current: boolean };
  speedRef: { current: number };
  gainRef: { current: number };
  setPlaying(p: boolean): void;
  setSpeed(v: number): void;
  setGain(v: number): void;
  step(dir: number): void;
  boundaries(t?: number): number[];
  pickTime(): number;
  setWindow(sec: number): void;
  onFrame(cb: FrameCb): () => void;
  flush(): void;
}

export interface ClockUi {
  playing: boolean;
  speed: number;
  gain: number;
}

export function useClock(c: Computed | null): { clock: Clock; ui: ClockUi } {
  const refs = useRef({
    t: 0,
    win: 6,
    scrub: null as { s0: number } | null,
    playing: true,
    speed: 0.25,
    gain: 10
  });
  const [ui, setUi] = useState<ClockUi>({ playing: true, speed: 0.25, gain: 10 });
  const subs = useRef<Set<FrameCb>>(new Set());
  const cRef = useRef<Computed | null>(c);
  cRef.current = c;

  const emit = useCallback((t: number) => {
    const cur = cRef.current;
    if (!cur) return;
    const ph = phaseAt(cur, t);
    subs.current.forEach((cb) => cb(t, ph));
  }, []);

  const clock = useMemo<Clock>(() => {
    const st = refs.current;
    return {
      tRef: {
        get current() {
          return st.t;
        },
        set current(v: number) {
          st.t = v;
        }
      },
      winRef: {
        get current() {
          return st.win;
        },
        set current(v: number) {
          st.win = v;
        }
      },
      scrubRef: {
        get current() {
          return st.scrub;
        },
        set current(v: { s0: number } | null) {
          st.scrub = v;
        }
      },
      playingRef: {
        get current() {
          return st.playing;
        },
        set current(v: boolean) {
          st.playing = v;
        }
      },
      speedRef: {
        get current() {
          return st.speed;
        },
        set current(v: number) {
          st.speed = v;
        }
      },
      gainRef: {
        get current() {
          return st.gain;
        },
        set current(v: number) {
          st.gain = v;
        }
      },
      setPlaying(p: boolean) {
        st.playing = p;
        setUi((u) => (u.playing === p ? u : { ...u, playing: p }));
      },
      setSpeed(v: number) {
        st.speed = v;
        setUi((u) => (u.speed === v ? u : { ...u, speed: v }));
      },
      setGain(v: number) {
        st.gain = v;
        setUi((u) => (u.gain === v ? u : { ...u, gain: v }));
      },
      step(dir: number) {
        st.playing = false;
        setUi((u) => (u.playing ? { ...u, playing: false } : u));
        const cur = cRef.current;
        if (!cur) return;
        const bs = boundaries(cur, st.t);
        if (dir > 0) {
          const n = bs.find((x) => x > st.t + 0.002);
          if (n != null) st.t = n + 0.001;
        } else {
          const p = bs.filter((x) => x < st.t - 0.004).pop();
          if (p != null) st.t = Math.max(st.win * 0.2, p + 0.001);
        }
      },
      boundaries(t?: number) {
        const cur = cRef.current;
        if (!cur) return [];
        return boundaries(cur, t == null ? st.t : t);
      },
      pickTime() {
        const cur = cRef.current;
        if (!cur) return 0;
        const nr = cur.BEATS.find((b) => b.t > st.win + 0.4);
        const t = nr ? nr.t - 0.45 : st.win + 0.4;
        st.t = t;
        return t;
      },
      setWindow(sec: number) {
        if (sec > 0.2) st.win = sec;
      },
      onFrame(cb: FrameCb) {
        subs.current.add(cb);
        return () => {
          subs.current.delete(cb);
        };
      },
      flush() {
        emit(st.t);
      }
    };
  }, [emit]);

  useEffect(() => {
    if (!c) return;
    const st = refs.current;
    st.gain = c.z.gain != null ? c.z.gain : 10;
    st.t = clock.pickTime();
    st.scrub = null;
    setUi((u) => (u.gain === st.gain ? u : { ...u, gain: st.gain }));
    emit(st.t);
    let last = performance.now();
    let stop = false;
    const frame = (now: number) => {
      if (stop) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (st.playing) st.t += dt * st.speed;
      if (st.t > 1790) st.t = st.win + 0.5;
      if (st.t < 0) st.t = 0;
      emit(st.t);
      window.requestAnimationFrame(frame);
    };
    const raf = window.requestAnimationFrame(frame);
    return () => {
      stop = true;
      window.cancelAnimationFrame(raf);
    };
  }, [c, clock, emit]);

  return { clock, ui };
}
