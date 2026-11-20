import { BufferAttribute, BufferGeometry } from 'three';

export type Region = 'A' | 'V';
export type ChamberId = 'RA' | 'LA' | 'RV' | 'LV';

export const REGION_A = 0;
export const REGION_V = 1;
export const REGION_VESSEL = 2;

export interface HeartLabel {
  id: ChamberId;
  label: string;
  pos: [number, number, number];
}

export interface SolidGrid {
  nx: number;
  ny: number;
  nz: number;
  step: number;
  origin: [number, number, number];
  region: Uint8Array;
  endo: Uint8Array;
  side: Uint8Array;
}

export interface HeartMesh {
  geometry: BufferGeometry;
  pos: Float32Array;
  chamber: Int32Array;
  region: Uint8Array;
  shade: Float32Array;
  count: number;
  radius: number;
  center: [number, number, number];
  centers: Record<ChamberId, [number, number, number]>;
  labels: HeartLabel[];
  cut: number;
  solid: SolidGrid;
  vCell: Int32Array;
  vW: Float32Array;
  dispose(): void;
}

type V3 = [number, number, number];

export const CUT_Z = 0.02;
const AV_Y0 = 0.25;
const AV_SLOPE = 0.1;
const STEP = 0.0145;
const SOLID_STEP = 0.03;
const BOUNDS: [number, number, number, number, number, number] = [-0.74, 0.74, -1.12, 1.08, -0.56, 0.42];

const BASE: V3 = [-0.07, 0.12, 0.0];
const ROT_Z = (15 * Math.PI) / 180;
const ROT_X = (3 * Math.PI) / 180;
const cz = Math.cos(ROT_Z);
const sz = Math.sin(ROT_Z);
const cx = Math.cos(ROT_X);
const sx = Math.sin(ROT_X);

interface Ell {
  c: V3;
  r: V3;
  taper: number;
}

interface Shape {
  lvO: Ell;
  lvC: Ell;
  rvO: Ell;
  rvC: Ell;
  raO: Ell;
  raC: Ell;
  laO: Ell;
  laC: Ell;
  raa: Ell;
  laa: Ell;
}

function shape(lvh: boolean): Shape {
  const lvO: Ell = lvh ? { c: [0.15, -0.4, -0.11], r: [0.45, 0.68, 0.44], taper: 0.7 } : { c: [0.13, -0.4, -0.1], r: [0.4, 0.66, 0.4], taper: 0.7 };
  const lvC: Ell = lvh ? { c: [0.15, -0.36, -0.1], r: [0.2, 0.56, 0.2], taper: 0.62 } : { c: [0.14, -0.38, -0.09], r: [0.24, 0.6, 0.24], taper: 0.62 };
  const rvO: Ell = { c: [-0.2, -0.25, 0.14], r: [0.38, 0.5, 0.3], taper: 0.78 };
  const rvC: Ell = { c: rvO.c, r: [rvO.r[0] - 0.055, rvO.r[1] - 0.055, rvO.r[2] - 0.055], taper: 0.62 };
  const raO: Ell = { c: [-0.36, 0.42, -0.02], r: [0.23, 0.25, 0.23], taper: 0 };
  const laO: Ell = { c: [0.17, 0.5, -0.12], r: [0.28, 0.2, 0.23], taper: 0 };
  const shrink = (e: Ell, w: number): Ell => ({ c: e.c, r: [e.r[0] - w, e.r[1] - w, e.r[2] - w], taper: 0 });
  return {
    lvO,
    lvC,
    rvO,
    rvC,
    raO,
    raC: shrink(raO, 0.042),
    laO,
    laC: shrink(laO, 0.042),
    raa: { c: [-0.22, 0.58, 0.19], r: [0.13, 0.085, 0.1], taper: 0 },
    laa: { c: [0.43, 0.44, 0.05], r: [0.13, 0.075, 0.1], taper: 0 }
  };
}

interface Tube {
  pts: V3[];
  r: number;
}

const VESSELS: Tube[] = [
  { pts: [[0.03, 0.24, -0.04], [0.02, 0.66, -0.02], [0.12, 0.84, -0.08], [0.3, 0.84, -0.22], [0.36, 0.62, -0.32]], r: 0.1 },
  { pts: [[-0.1, 0.22, 0.2], [0.03, 0.56, 0.16], [0.17, 0.7, 0.04]], r: 0.09 },
  { pts: [[-0.4, 0.84, -0.05], [-0.38, 0.52, -0.03]], r: 0.075 }
];
const VESSEL_WALL = 0.034;

function toLocal(x: number, y: number, z: number, o: V3) {
  const px = x - BASE[0];
  const py = y - BASE[1];
  const pz = z - BASE[2];
  const x1 = cz * px + sz * py;
  const y1 = -sz * px + cz * py;
  o[0] = x1;
  o[1] = cx * y1 - sx * pz;
  o[2] = sx * y1 + cx * pz;
}

export function toWorld(l: V3): V3 {
  const y1 = cx * l[1] + sx * l[2];
  const pz = -sx * l[1] + cx * l[2];
  const px = cz * l[0] - sz * y1;
  const py = sz * l[0] + cz * y1;
  return [px + BASE[0], py + BASE[1], pz + BASE[2]];
}

function ell(x: number, y: number, z: number, e: Ell): number {
  let dx = x - e.c[0];
  const dy = y - e.c[1];
  let dz = z - e.c[2];
  if (e.taper > 0 && dy < 0) {
    const s = Math.min(1, -dy / e.r[1]);
    const f = Math.max(0.12, 1 - e.taper * s * s);
    dx /= f;
    dz /= f;
  }
  const ax = dx / e.r[0];
  const ay = dy / e.r[1];
  const az = dz / e.r[2];
  const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
  const bx = ax / e.r[0];
  const by = ay / e.r[1];
  const bz = az / e.r[2];
  const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(e.r[0], e.r[1], e.r[2]);
}

function segDist(x: number, y: number, z: number, a: V3, b: V3): number {
  const bx = b[0] - a[0];
  const by = b[1] - a[1];
  const bz = b[2] - a[2];
  const px = x - a[0];
  const py = y - a[1];
  const pz = z - a[2];
  const h = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz)));
  return Math.hypot(px - bx * h, py - by * h, pz - bz * h);
}

function tubeDist(x: number, y: number, z: number, t: Tube): number {
  let d = Infinity;
  for (let i = 1; i < t.pts.length; i++) d = Math.min(d, segDist(x, y, z, t.pts[i - 1], t.pts[i]));
  return d;
}

function smin(a: number, b: number, k: number): number {
  const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (b - a)) / k));
  return a * h + b * (1 - h) - k * h * (1 - h);
}

function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

interface Parts {
  vent: number;
  atr: number;
  ves: number;
  outer: number;
  cav: number;
  full: number;
  cut: number;
  lv: number;
  rv: number;
  ra: number;
  la: number;
  lvCav: number;
  rvCav: number;
  ly: number;
  x: number;
  y: number;
}

const L: V3 = [0, 0, 0];

function evalParts(x: number, y: number, z: number, S: Shape, P: Parts): Parts {
  toLocal(x, y, z, L);
  const lv = ell(L[0], L[1], L[2], S.lvO);
  const rv = ell(L[0], L[1], L[2], S.rvO);
  const g = (lv - rv) / 0.05;
  const vent = smin(lv, rv, 0.1) + 0.03 * Math.exp(-g * g);
  const lvCav = ell(L[0], L[1], L[2], S.lvC);
  const rvCav = smax(ell(L[0], L[1], L[2], S.rvC), -lv, 0.03);

  const ra = ell(x, y, z, S.raO);
  const la = ell(x, y, z, S.laO);
  let atr = smin(ra, la, 0.08);
  atr = smin(atr, ell(x, y, z, S.raa), 0.06);
  atr = smin(atr, ell(x, y, z, S.laa), 0.06);
  const aCav = Math.min(ell(x, y, z, S.raC), ell(x, y, z, S.laC));

  let ves = Infinity;
  let vCav = Infinity;
  for (const t of VESSELS) {
    const d = tubeDist(x, y, z, t);
    ves = Math.min(ves, d - t.r);
    vCav = Math.min(vCav, d - t.r + VESSEL_WALL);
  }

  const outer = smin(smin(vent, atr, 0.045), ves, 0.03);
  const cav = Math.min(lvCav, rvCav, aCav, vCav);
  const mem = Math.abs(y - AV_Y0 - AV_SLOPE * x) - 0.013;
  const full = Math.min(smax(outer, -cav, 0.012), Math.max(outer, mem));
  P.vent = vent;
  P.atr = atr;
  P.ves = ves;
  P.outer = outer;
  P.cav = cav;
  P.full = full;
  P.cut = smax(full, z - CUT_Z, 0.018);
  P.lv = lv;
  P.rv = rv;
  P.ra = ra;
  P.la = la;
  P.lvCav = lvCav;
  P.rvCav = rvCav;
  P.ly = L[1];
  P.x = x;
  P.y = y;
  return P;
}

function newParts(): Parts {
  return { vent: 0, atr: 0, ves: 0, outer: 0, cav: 0, full: 0, cut: 0, lv: 0, rv: 0, ra: 0, la: 0, lvCav: 0, rvCav: 0, ly: 0, x: 0, y: 0 };
}

function regionOf(P: Parts): number {
  if (P.ves < P.vent && P.ves < P.atr) return REGION_VESSEL;
  return P.vent <= P.atr && P.y < AV_Y0 + AV_SLOPE * P.x ? REGION_V : REGION_A;
}

function buildSolid(S: Shape): SolidGrid {
  const [X0, X1, Y0, Y1, Z0, Z1] = BOUNDS;
  const step = SOLID_STEP;
  const nx = Math.ceil((X1 - X0) / step) + 1;
  const ny = Math.ceil((Y1 - Y0) / step) + 1;
  const nz = Math.ceil((Z1 - Z0) / step) + 1;
  const region = new Uint8Array(nx * ny * nz);
  const endo = new Uint8Array(nx * ny * nz);
  const side = new Uint8Array(nx * ny * nz);
  const P = newParts();
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        evalParts(X0 + i * step, Y0 + j * step, Z0 + k * step, S, P);
        if (P.full > step * 0.35) continue;
        const r = regionOf(P);
        if (r === REGION_VESSEL) continue;
        const id = i + nx * (j + ny * k);
        region[id] = r + 1;
        if (r === REGION_V) side[id] = P.lv <= P.rv ? 1 : 2;
        const ec = Math.min(P.lvCav, P.rvCav);
        if (r === REGION_V && P.ly < -0.02 && ec > -step && ec < step * 1.4) endo[id] = P.lvCav <= P.rvCav ? 1 : 2;
      }
  return { nx, ny, nz, step, origin: [X0, Y0, Z0], region, endo, side };
}

function bindVertices(pos: Float32Array, region: Uint8Array, g: SolidGrid): { vCell: Int32Array; vW: Float32Array } {
  const n = region.length;
  const vCell = new Int32Array(n * 8).fill(-1);
  const vW = new Float32Array(n * 8);
  const { nx, ny, nz, step, origin } = g;
  for (let v = 0; v < n; v++) {
    const want = region[v] === REGION_V ? 2 : region[v] === REGION_A ? 1 : 0;
    if (!want) continue;
    const fx = (pos[v * 3] - origin[0]) / step;
    const fy = (pos[v * 3 + 1] - origin[1]) / step;
    const fz = (pos[v * 3 + 2] - origin[2]) / step;
    const i0 = Math.floor(fx);
    const j0 = Math.floor(fy);
    const k0 = Math.floor(fz);
    let sum = 0;
    for (let q = 0; q < 8; q++) {
      const i = i0 + (q & 1);
      const j = j0 + ((q >> 1) & 1);
      const k = k0 + ((q >> 2) & 1);
      if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
      const id = i + nx * (j + ny * k);
      if (g.region[id] !== want) continue;
      const w = (1 - Math.abs(fx - i)) * (1 - Math.abs(fy - j)) * (1 - Math.abs(fz - k)) + 1e-4;
      vCell[v * 8 + q] = id;
      vW[v * 8 + q] = w;
      sum += w;
    }
    if (sum === 0) {
      let best = -1;
      let bd = Infinity;
      for (let dk = -2; dk <= 3; dk++)
        for (let dj = -2; dj <= 3; dj++)
          for (let di = -2; di <= 3; di++) {
            const i = i0 + di;
            const j = j0 + dj;
            const k = k0 + dk;
            if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) continue;
            const id = i + nx * (j + ny * k);
            if (g.region[id] !== want) continue;
            const d = (fx - i) ** 2 + (fy - j) ** 2 + (fz - k) ** 2;
            if (d < bd) {
              bd = d;
              best = id;
            }
          }
      if (best >= 0) {
        vCell[v * 8] = best;
        vW[v * 8] = 1;
        sum = 1;
      }
    }
    if (sum > 0) for (let q = 0; q < 8; q++) vW[v * 8 + q] /= sum;
  }
  return { vCell, vW };
}

const cache = new Map<string, HeartMesh>();

export function buildHeart(lvh: boolean, lod = 1): HeartMesh {
  const key = `${lvh ? 1 : 0}:${lod}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = build(lvh, lod);
  cache.set(key, m);
  return m;
}

function build(lvh: boolean, lod: number): HeartMesh {
  const S = shape(lvh);
  const P = newParts();
  const step = STEP / Math.max(0.55, Math.min(1.7, lod));
  const [X0, X1, Y0, Y1, Z0, Z1] = BOUNDS;
  const nx = Math.ceil((X1 - X0) / step) + 1;
  const ny = Math.ceil((Y1 - Y0) / step) + 1;
  const nz = Math.ceil((Z1 - Z0) / step) + 1;
  const f = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) {
    const z = Z0 + k * step;
    for (let j = 0; j < ny; j++) {
      const y = Y0 + j * step;
      const base = nx * (j + ny * k);
      for (let i = 0; i < nx; i++) f[base + i] = evalParts(X0 + i * step, y, z, S, P).cut;
    }
  }

  const cxn = nx - 1;
  const cyn = ny - 1;
  const czn = nz - 1;
  const cellVert = new Int32Array(cxn * cyn * czn).fill(-1);
  const vx: number[] = [];
  const vy: number[] = [];
  const vz: number[] = [];
  const gi = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const ci = (i: number, j: number, k: number) => i + cxn * (j + cyn * k);
  const corner = [0, 1, nx, nx + 1, nx * ny, nx * ny + 1, nx * ny + nx, nx * ny + nx + 1];
  const edges: [number, number][] = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7]
  ];
  const off: V3[] = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];

  for (let k = 0; k < czn; k++)
    for (let j = 0; j < cyn; j++)
      for (let i = 0; i < cxn; i++) {
        const b = gi(i, j, k);
        let mask = 0;
        for (let q = 0; q < 8; q++) if (f[b + corner[q]] < 0) mask |= 1 << q;
        if (mask === 0 || mask === 255) continue;
        let ax = 0;
        let ay = 0;
        let az = 0;
        let n = 0;
        for (const [a, c2] of edges) {
          const va = f[b + corner[a]];
          const vb = f[b + corner[c2]];
          if (va < 0 === vb < 0) continue;
          const t = va / (va - vb);
          const pa = off[a];
          const pb = off[c2];
          ax += pa[0] + (pb[0] - pa[0]) * t;
          ay += pa[1] + (pb[1] - pa[1]) * t;
          az += pa[2] + (pb[2] - pa[2]) * t;
          n++;
        }
        cellVert[ci(i, j, k)] = vx.length;
        vx.push(X0 + (i + ax / n) * step);
        vy.push(Y0 + (j + ay / n) * step);
        vz.push(Z0 + (k + az / n) * step);
      }

  const count = vx.length;
  const pos = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    pos[v * 3] = vx[v];
    pos[v * 3 + 1] = vy[v];
    pos[v * 3 + 2] = vz[v];
  }

  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < czn; k++)
    for (let j = 1; j < cyn; j++)
      for (let i = 0; i < cxn; i++) {
        const s0 = f[gi(i, j, k)] < 0;
        if (s0 === f[gi(i + 1, j, k)] < 0) continue;
        quad(cellVert[ci(i, j - 1, k - 1)], cellVert[ci(i, j, k - 1)], cellVert[ci(i, j, k)], cellVert[ci(i, j - 1, k)], !s0);
      }
  for (let k = 1; k < czn; k++)
    for (let j = 0; j < cyn; j++)
      for (let i = 1; i < cxn; i++) {
        const s0 = f[gi(i, j, k)] < 0;
        if (s0 === f[gi(i, j + 1, k)] < 0) continue;
        quad(cellVert[ci(i - 1, j, k - 1)], cellVert[ci(i - 1, j, k)], cellVert[ci(i, j, k)], cellVert[ci(i, j, k - 1)], !s0);
      }
  for (let k = 0; k < czn; k++)
    for (let j = 1; j < cyn; j++)
      for (let i = 1; i < cxn; i++) {
        const s0 = f[gi(i, j, k)] < 0;
        if (s0 === f[gi(i, j, k + 1)] < 0) continue;
        quad(cellVert[ci(i - 1, j - 1, k)], cellVert[ci(i, j - 1, k)], cellVert[ci(i, j, k)], cellVert[ci(i - 1, j, k)], !s0);
      }

  smooth(pos, idx, count, 2);

  const normals = new Float32Array(count * 3);
  const e = step * 0.5;
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    const gx = evalParts(x + e, y, z, S, P).cut - evalParts(x - e, y, z, S, P).cut;
    const gy = evalParts(x, y + e, z, S, P).cut - evalParts(x, y - e, z, S, P).cut;
    const gz = evalParts(x, y, z + e, S, P).cut - evalParts(x, y, z - e, S, P).cut;
    const len = Math.hypot(gx, gy, gz) || 1;
    normals[v * 3] = gx / len;
    normals[v * 3 + 1] = gy / len;
    normals[v * 3 + 2] = gz / len;
  }

  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    const ux = pos[b * 3] - pos[a * 3];
    const uy = pos[b * 3 + 1] - pos[a * 3 + 1];
    const uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const wx = pos[c * 3] - pos[a * 3];
    const wy = pos[c * 3 + 1] - pos[a * 3 + 1];
    const wz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const d =
      (uy * wz - uz * wy) * (normals[a * 3] + normals[b * 3] + normals[c * 3]) +
      (uz * wx - ux * wz) * (normals[a * 3 + 1] + normals[b * 3 + 1] + normals[c * 3 + 1]) +
      (ux * wy - uy * wx) * (normals[a * 3 + 2] + normals[b * 3 + 2] + normals[c * 3 + 2]);
    if (d < 0) {
      idx[t + 1] = c;
      idx[t + 2] = b;
    }
  }

  const chamber = new Int32Array(count);
  const region = new Uint8Array(count);
  const shade = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const ids: ChamberId[] = ['RA', 'LA', 'RV', 'LV'];
  const centers: Record<ChamberId, [number, number, number]> = { RA: [0, 0, 0], LA: [0, 0, 0], RV: [0, 0, 0], LV: [0, 0, 0] };
  const tally: Record<ChamberId, number> = { RA: 0, LA: 0, RV: 0, LV: 0 };
  const apexY = toWorld([S.lvO.c[0], S.lvO.c[1] - S.lvO.r[1], S.lvO.c[2]])[1];
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    evalParts(x, y, z, S, P);
    const r = regionOf(P);
    region[v] = r;
    const ch = [P.ra, P.la, P.rv, P.lv];
    let best = 0;
    for (let q = 1; q < 4; q++) if (ch[q] < ch[best]) best = q;
    chamber[v] = r === REGION_VESSEL ? -1 : best;

    const wOut = Math.exp(-Math.abs(P.outer) / 0.012);
    const wCav = Math.exp(-Math.abs(P.cav) / 0.012);
    const wCut = Math.exp(-Math.abs(z - CUT_Z) / 0.012);
    const sOut = r === REGION_A ? 1.0 : r === REGION_VESSEL ? 0.9 : 0.94;
    const sCav = r === REGION_A ? 0.56 : 0.46;
    const sCut = r === REGION_VESSEL ? 0.95 : 1.06;
    const wMem = Math.exp(-Math.abs(Math.abs(y - AV_Y0 - AV_SLOPE * x) - 0.013) / 0.012);
    let s = (wOut * sOut + wCav * sCav + wCut * sCut + wMem * 0.62 + 1e-4 * 0.8) / (wOut + wCav + wCut + wMem + 1e-4);
    if (r === REGION_V) s *= 0.9 + 0.1 * Math.max(0, Math.min(1, (y - apexY) / 0.45));
    shade[v] = s;
    colors[v * 3] = 0.86 * s;
    colors[v * 3 + 1] = 0.78 * s;
    colors[v * 3 + 2] = 0.7 * s;

    if (r !== REGION_VESSEL) {
      const id = ids[best];
      tally[id]++;
      centers[id][0] += x;
      centers[id][1] += y;
      centers[id][2] += z;
    }
  }
  ids.forEach((id) => {
    const n = tally[id] || 1;
    centers[id] = [centers[id][0] / n, centers[id][1] / n, centers[id][2] / n];
  });

  const onCut = (c: V3, dx = 0, dy = 0): [number, number, number] => [c[0] + dx, c[1] + dy, CUT_Z + 0.03];
  const labels: HeartLabel[] = [
    { id: 'RA', label: 'PP', pos: onCut(S.raC.c, -0.03, 0.02) },
    { id: 'LA', label: 'LP', pos: onCut(S.laC.c, 0.04, 0.02) },
    { id: 'RV', label: 'PK', pos: onCut(toWorld(S.rvC.c), -0.1, -0.04) },
    { id: 'LV', label: 'LK', pos: onCut(toWorld(S.lvC.c), 0.02, -0.04) }
  ];

  const minP: V3 = [Infinity, Infinity, Infinity];
  const maxP: V3 = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < count; v++)
    for (let q = 0; q < 3; q++) {
      const val = pos[v * 3 + q];
      if (val < minP[q]) minP[q] = val;
      if (val > maxP[q]) maxP[q] = val;
    }
  const center: V3 = [(minP[0] + maxP[0]) / 2, (minP[1] + maxP[1]) / 2, (minP[2] + maxP[2]) / 2];
  const radius = Math.max(maxP[0] - minP[0], maxP[1] - minP[1], maxP[2] - minP[2]) * 0.5;

  const solid = buildSolid(S);
  const { vCell, vW } = bindVertices(pos, region, solid);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.setIndex(count > 65535 ? new BufferAttribute(Uint32Array.from(idx), 1) : new BufferAttribute(Uint16Array.from(idx), 1));

  return {
    geometry,
    pos,
    chamber,
    region,
    shade,
    count,
    radius,
    center,
    centers,
    labels,
    cut: CUT_Z,
    solid,
    vCell,
    vW,
    dispose() {
      geometry.dispose();
    }
  };
}

function smooth(pos: Float32Array, idx: number[], count: number, iters: number) {
  const deg = new Uint16Array(count);
  const seen = new Set<number>();
  const adjA: number[] = [];
  const adjB: number[] = [];
  const addEdge = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = lo * 4194304 + hi;
    if (seen.has(key)) return;
    seen.add(key);
    adjA.push(lo);
    adjB.push(hi);
    deg[lo]++;
    deg[hi]++;
  };
  for (let t = 0; t < idx.length; t += 3) {
    addEdge(idx[t], idx[t + 1]);
    addEdge(idx[t + 1], idx[t + 2]);
    addEdge(idx[t + 2], idx[t]);
  }
  const acc = new Float32Array(count * 3);
  for (let it = 0; it < iters; it++) {
    acc.fill(0);
    for (let e = 0; e < adjA.length; e++) {
      const a = adjA[e];
      const b = adjB[e];
      acc[a * 3] += pos[b * 3];
      acc[a * 3 + 1] += pos[b * 3 + 1];
      acc[a * 3 + 2] += pos[b * 3 + 2];
      acc[b * 3] += pos[a * 3];
      acc[b * 3 + 1] += pos[a * 3 + 1];
      acc[b * 3 + 2] += pos[a * 3 + 2];
    }
    const lam = it % 2 === 0 ? 0.5 : -0.52;
    for (let v = 0; v < count; v++) {
      const d = deg[v];
      if (!d) continue;
      for (let q = 0; q < 3; q++) pos[v * 3 + q] += lam * (acc[v * 3 + q] / d - pos[v * 3 + q]);
    }
  }
}
