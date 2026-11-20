import { create } from '../model/ecg';
import type { ComplexKind, ECGConfig, Generator, Measure, SchedulerState } from '../model/ecg';
import { mulberry32 } from '../lib/rng';
import type { AtlasCase, HeartFlags } from '../data/atlas';
import { GEO } from './heart2d/geometry';
import { atrialMap, ventMap, nearest, getGrid } from './heart2d/grid';
import type { AtrialMap, Grid, VentMap, VentOpts } from './heart2d/grid';

export interface Beat {
  t: number;
  k: ComplexKind;
  D: number;
  tp: number;
  qt: number;
  stEnd: number;
  tEnd: number;
  ta: number | null;
}

export interface AtrEv {
  t: number;
  Pdur: number;
  beat: Beat | null;
}

export interface HM {
  G: Grid;
  am: AtrialMap;
  vm: VentMap;
  k: number;
  rel: (x: number) => number;
  D: number;
  Pdur: number;
  aScale: number;
  avArr: number;
  kentArr: number;
  hisRel: [number, number] | null;
  secondary: boolean;
  vAct: Float64Array;
  vFrac: Float64Array;
  aAct: Float64Array;
  inj: Uint8Array;
  meas: Measure;
}

export interface Computed {
  z: AtlasCase;
  cfg: ECGConfig;
  heart: HeartFlags;
  gen: Generator;
  S: SchedulerState;
  BEATS: Beat[];
  ATR: AtrEv[];
  HM: HM;
  meas: Measure;
}

export function computeCase(z: AtlasCase): Computed {
  const H = z.heart;
  const gen = create();
  gen.config(z.cfg);
  const S = gen.scheduler();
  const R = mulberry32(12345);
  gen.schedule(S, { t0: 0, rand: R }, 1800);
  if (H.dissoc) {
    let ta = 0.37;
    while (ta < 1800) {
      S.atr.push({ t: ta, k: 'a' });
      ta += (60 / H.dissoc) * (1 + (R() - 0.5) * 0.03);
    }
  }
  const retro = H.svt === 'avnrt' || H.svt === 'avrt';
  if (retro) {
    const d = H.svt === 'avnrt' ? 0.06 : 0.13;
    S.atr.length = 0;
    for (const v of S.ev) S.atr.push({ t: v.t + d, k: 'pac' });
  }
  if (H.svt === 'at') for (const a of S.atr) a.k = 'pac';
  const E = gen.cfg();

  const BEATS: Beat[] = S.ev.map((v) => {
    const m = gen.morph(v.k, v.rr || 0.8);
    const narrow = E.tAmp >= 1.5 && v.k === 'n' && E.bbb !== 'L';
    const sd = 0.046 * Math.sqrt(m.qt / 0.4) * (narrow ? 0.62 : 1);
    const tOn = Math.max(m.D + 0.03, m.tp - (narrow ? 2.4 * sd : 0.12));
    const tEnd = m.tp + (narrow ? 2.6 : 2.2) * sd;
    return { t: v.t, k: v.k, D: m.D, tp: m.tp, qt: m.qt, stEnd: tOn, tEnd, ta: null };
  });

  const Pdur = H.hyperK ? 0.13 : 0.105;
  const ATR: AtrEv[] = S.atr.map((a) => ({ t: a.t, Pdur, beat: null }));

  let j = 0;
  for (let i = 0; i < ATR.length; i++) {
    const a = ATR[i];
    const nextA = ATR[i + 1] ? ATR[i + 1].t : Infinity;
    while (j < BEATS.length && BEATS[j].t <= a.t + 0.06) j++;
    const b = BEATS[j];
    if (!H.dissoc && !retro && b && b.k === 'n' && b.t - a.t < 0.45 && b.t < nextA + 0.02 && z.cfg.av !== 3) {
      a.beat = b;
      b.ta = a.t;
    }
  }

  const G = getGrid(!!H.lvh);
  const am = atrialMap(G, H.svt === 'at' ? GEO.atFocus : H.svt === 'avrt' ? GEO.kent[0] : retro ? GEO.avEntry : undefined);
  const t = H.type;
  const vo: VentOpts =
    t === 'lbbb' ? { lb: false } : t === 'rbbb' ? { rb: false } : t === 'wpw' ? { kent: true, off: 40 } : t === 'vt' ? { focus: true } : {};
  const vm = ventMap(G, vo);
  const first = BEATS.find((b) => b.k !== 'v') || BEATS[0];
  const D = first.D;
  const k = (D * 1000) / (vm.mx - vm.mn);
  const rel = (x: number) => ((x - vm.mn) * k) / 1000;

  const HM: HM = {
    G,
    am,
    vm,
    k,
    rel,
    D,
    Pdur,
    aScale: Pdur / am.mx,
    avArr: (am.T[nearest(G, 'A', GEO.avEntry[0], GEO.avEntry[1])] * Pdur) / am.mx,
    kentArr: (am.T[nearest(G, 'A', GEO.kent[0][0], GEO.kent[0][1])] * Pdur) / am.mx,
    hisRel: vm.his ? [rel(vm.his.t1) - 0.035, rel(vm.his.t1)] : null,
    secondary: (['lbbb', 'rbbb', 'vt', 'wpw'] as string[]).includes(t as string) || !!H.lvh,
    vAct: new Float64Array(G.cells.length),
    vFrac: new Float64Array(G.cells.length),
    aAct: new Float64Array(G.cells.length),
    inj: new Uint8Array(G.cells.length),
    meas: {} as Measure
  };

  G.V.forEach((i) => {
    HM.vAct[i] = rel(vm.T[i]);
    HM.vFrac[i] = (vm.T[i] - vm.mn) / (vm.mx - vm.mn);
  });
  G.A.forEach((i) => {
    HM.aAct[i] = am.T[i] * HM.aScale;
  });
  if (H.stemi)
    G.V.forEach((i) => {
      const c = G.cells[i];
      HM.inj[i] = H.stemi === 'anterior' ? (c.x > 190 && c.x < 300 && c.y > 240 ? 1 : 0) : c.y > 352 || (c.y > 330 && c.x < 150) ? 1 : 0;
    });

  gen.config(z.cfg);
  const meas = gen.measure(S, [4, 34], null);
  HM.meas = meas;

  return { z, cfg: z.cfg, heart: H, gen, S, BEATS, ATR, HM, meas };
}
