import type { Computed } from '../compute';
import type { HeartMesh, SolidGrid } from './mesh';
import { REGION_V } from './mesh';
import { SITES, V_M, V_P, branchSchedule } from './conduction';
import type { V3 } from './conduction';

export interface WaveData {
  vAct: Float32Array;
  vFrac: Float32Array;
  aAct: Float32Array;
  aFrac: Float32Array;
  inj: Uint8Array;
  secondary: boolean;
  rawMn: number;
  scale: number;
  aRawMn: number;
  aScale: number;
}

const ENDO_GAIN = 5;
const SLOW = 0.6;

const NB: [number, number, number, number][] = [];
for (let dz = -1; dz <= 1; dz++)
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) if (dx || dy || dz) NB.push([dx, dy, dz, Math.hypot(dx, dy, dz)]);

class Heap {
  t: number[] = [];
  i: number[] = [];
  get size() {
    return this.t.length;
  }
  push(id: number, tt: number) {
    const { t, i } = this;
    t.push(tt);
    i.push(id);
    let k = t.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (t[p] <= t[k]) break;
      [t[p], t[k]] = [t[k], t[p]];
      [i[p], i[k]] = [i[k], i[p]];
      k = p;
    }
  }
  pop(): [number, number] {
    const { t, i } = this;
    const rt = t[0];
    const ri = i[0];
    const lt = t.pop() as number;
    const li = i.pop() as number;
    if (t.length) {
      t[0] = lt;
      i[0] = li;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < t.length && t[l] < t[m]) m = l;
        if (r < t.length && t[r] < t[m]) m = r;
        if (m === k) break;
        [t[m], t[k]] = [t[k], t[m]];
        [i[m], i[k]] = [i[k], i[m]];
        k = m;
      }
    }
    return [rt, ri];
  }
}

function march(g: SolidGrid, want: number, seeds: Map<number, number>, endo: boolean, blocked = 0): Float32Array {
  const { nx, ny, nz, step } = g;
  const T = new Float32Array(g.region.length).fill(Infinity);
  const heap = new Heap();
  seeds.forEach((t, id) => {
    if (t < T[id]) {
      T[id] = t;
      heap.push(id, t);
    }
  });
  while (heap.size) {
    const [t, id] = heap.pop();
    if (t > T[id]) continue;
    const i = id % nx;
    const j = Math.floor(id / nx) % ny;
    const k = Math.floor(id / (nx * ny));
    const sa = endo && g.endo[id] && g.endo[id] !== blocked ? ENDO_GAIN : blocked && g.side[id] === blocked ? SLOW : 1;
    for (const [dx, dy, dz, d] of NB) {
      const a = i + dx;
      const b = j + dy;
      const c = k + dz;
      if (a < 0 || b < 0 || c < 0 || a >= nx || b >= ny || c >= nz) continue;
      const n = a + nx * (b + ny * c);
      if (g.region[n] !== want) continue;
      const sb = endo && g.endo[n] && g.endo[n] !== blocked ? ENDO_GAIN : blocked && g.side[n] === blocked ? SLOW : 1;
      const nt = t + (d * step) / (V_M * 0.5 * (sa + sb));
      if (nt < T[n]) {
        T[n] = nt;
        heap.push(n, nt);
      }
    }
  }
  return T;
}

function seedNear(g: SolidGrid, want: number, p: V3, radius: number, t: number, seeds: Map<number, number>) {
  const { nx, ny, nz, step, origin } = g;
  const r = Math.ceil(radius / step);
  const ci = Math.round((p[0] - origin[0]) / step);
  const cj = Math.round((p[1] - origin[1]) / step);
  const ck = Math.round((p[2] - origin[2]) / step);
  for (let k = ck - r; k <= ck + r; k++)
    for (let j = cj - r; j <= cj + r; j++)
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
        const id = i + nx * (j + ny * k);
        if (g.region[id] !== want) continue;
        const d = Math.hypot(origin[0] + i * step - p[0], origin[1] + j * step - p[1], origin[2] + k * step - p[2]);
        if (d > radius) continue;
        const tt = t + d / V_M;
        const prev = seeds.get(id);
        if (prev == null || tt < prev) seeds.set(id, tt);
      }
}

function samplePath(pts: V3[], step: number): { p: V3; s: number }[] {
  const out: { p: V3; s: number }[] = [];
  let s = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const n = Math.max(1, Math.ceil(len / step));
    for (let q = 0; q < n; q++) {
      const f = q / n;
      out.push({ p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f], s: s + len * f });
    }
    s += len;
  }
  out.push({ p: pts[pts.length - 1], s });
  return out;
}

function toVertices(mesh: HeartMesh, T: Float32Array, want: number, span: number, act: Float32Array, frac: Float32Array): { mn: number; scale: number } {
  const g = mesh.solid;
  const vals: number[] = [];
  for (let id = 0; id < T.length; id++) if (g.region[id] === want && Number.isFinite(T[id])) vals.push(T[id]);
  vals.sort((a, b) => a - b);
  const mn = vals.length ? vals[0] : Infinity;
  const mx = vals.length ? vals[Math.floor((vals.length - 1) * 0.985)] : -Infinity;
  if (!Number.isFinite(mn) || mx <= mn) return { mn: 0, scale: 0 };
  const inv = 1 / (mx - mn);
  const reg = want === 2 ? REGION_V : 0;
  for (let v = 0; v < mesh.count; v++) {
    if (mesh.region[v] !== reg) continue;
    let s = 0;
    let w = 0;
    for (let q = 0; q < 8; q++) {
      const id = mesh.vCell[v * 8 + q];
      if (id < 0) continue;
      const tt = T[id];
      if (!Number.isFinite(tt)) continue;
      s += mesh.vW[v * 8 + q] * (tt - mn) * inv;
      w += mesh.vW[v * 8 + q];
    }
    const f = w > 0 ? Math.max(0, Math.min(1, s / w)) : 1;
    frac[v] = f;
    act[v] = f * span;
  }
  return { mn, scale: span / (mx - mn) };
}

const waveCache = new Map<string, WaveData>();

export function computeWave(mesh: HeartMesh, c: Computed): WaveData {
  const key = `${c.z.id}:${mesh.count}`;
  const hit = waveCache.get(key);
  if (hit) return hit;
  const w = buildWave(mesh, c);
  waveCache.set(key, w);
  return w;
}

function buildWave(mesh: HeartMesh, c: Computed): WaveData {
  const H = c.heart;
  const HM = c.HM;
  const type = H.type;
  const out: WaveData = {
    vAct: new Float32Array(mesh.count),
    vFrac: new Float32Array(mesh.count),
    aAct: new Float32Array(mesh.count),
    aFrac: new Float32Array(mesh.count),
    inj: new Uint8Array(mesh.count),
    secondary: !!HM.secondary,
    rawMn: 0,
    scale: 1,
    aRawMn: 0,
    aScale: 1
  };
  const g = mesh.solid;
  const schedule = branchSchedule(H);

  const vSeeds = new Map<number, number>();
  if (type === 'vt') seedNear(g, 2, SITES.vt, 0.09, 0, vSeeds);
  else {
    const ends = new Map<string, number>();
    const blocked = (n: string) => (type === 'lbbb' && (n === 'lbTrunk' || n === 'laf' || n === 'lpf' || n === 'lsf')) || (type === 'rbbb' && n === 'rb');
    for (const br of schedule) {
      if (br.group !== 'V' || blocked(br.name)) continue;
      const smp = samplePath(br.pts, 0.04);
      for (const sm of smp) seedNear(g, 2, sm.p, 0.07, br.t0 + sm.s / V_P, vSeeds);
      ends.set(br.name, br.t0 + smp[smp.length - 1].s / V_P);
    }
    for (const br of schedule) {
      if (br.group !== 'P') continue;
      const t0 = ends.get(br.name.slice(3));
      if (t0 == null) continue;
      for (const sm of samplePath(br.pts, 0.03)) seedNear(g, 2, sm.p, 0.05, t0 + sm.s / V_P, vSeeds);
    }
    if (type === 'wpw') seedNear(g, 2, SITES.kentOut, 0.09, 0.004, vSeeds);
  }

  const aSeeds = new Map<number, number>();
  const aOrigin = H.svt === 'at' ? SITES.atFocus : H.svt === 'avnrt' ? SITES.av : H.svt === 'avrt' ? SITES.kentIn : SITES.sa;
  seedNear(g, 1, aOrigin, 0.08, 0, aSeeds);
  for (const br of schedule) {
    if (br.group !== 'A' || H.svt) continue;
    for (const sm of samplePath(br.pts, 0.04)) seedNear(g, 1, sm.p, 0.06, br.t0 + sm.s / V_P, aSeeds);
  }

  const vn = toVertices(mesh, march(g, 2, vSeeds, type !== 'vt' && type !== 'wpw', type === 'lbbb' ? 1 : type === 'rbbb' ? 2 : 0), 2, HM.D, out.vAct, out.vFrac);
  const an = toVertices(mesh, march(g, 1, aSeeds, false), 1, HM.Pdur, out.aAct, out.aFrac);
  out.rawMn = vn.mn;
  out.scale = vn.scale;
  out.aRawMn = an.mn;
  out.aScale = an.scale;

  if (H.stemi) {
    const anterior = H.stemi === 'anterior';
    const pos = mesh.pos;
    for (let i = 0; i < mesh.count; i++) {
      if (mesh.region[i] !== REGION_V) continue;
      const x = pos[i * 3];
      const y = pos[i * 3 + 1];
      const z = pos[i * 3 + 2];
      const hit = anterior ? z > -0.16 && y < 0.1 && x > -0.3 && (x < 0.26 || y < -0.5) : y < -0.6 || (z < -0.26 && y < -0.05);
      out.inj[i] = hit ? 1 : 0;
    }
  }
  return out;
}
