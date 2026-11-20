import { GEO, GS, NS, inEll, inPoly, polyLen, polySamples, samplePath, segStartLen } from './geometry';

export interface Cell {
  x: number;
  y: number;
  r: 'A' | 'V';
  ix: number;
  iy: number;
  la: boolean;
  nb: [number, number][];
}

export interface Grid {
  cells: Cell[];
  A: number[];
  V: number[];
}

const GRID: { [k: string]: Grid } = {};

let probe: SVGSVGElement | null = null;

function probeSvg(): SVGSVGElement {
  if (probe && probe.isConnected) return probe;
  probe = document.createElementNS(NS, 'svg') as SVGSVGElement;
  probe.setAttribute('viewBox', '0 0 420 450');
  probe.setAttribute('aria-hidden', 'true');
  probe.setAttribute('width', '0');
  probe.setAttribute('height', '0');
  probe.style.position = 'absolute';
  probe.style.left = '-9999px';
  probe.style.top = '-9999px';
  document.body.appendChild(probe);
  return probe;
}

export function getGrid(lvh: boolean, svg?: SVGSVGElement | null): Grid {
  const key = lvh ? 'lvh' : 'std';
  return GRID[key] || buildGrid(svg || probeSvg(), lvh);
}

export function buildGrid(svg: SVGSVGElement, lvh: boolean): Grid {
  const key = lvh ? 'lvh' : 'std';
  const hit = GRID[key];
  if (hit) return hit;
  const outer = samplePath(svg, GEO.outer, 240);
  const rv = samplePath(svg, GEO.rv, 160);
  const lv = samplePath(svg, lvh ? GEO.lvLVH : GEO.lv, 160);
  const cells: Cell[] = [];
  const idx: Record<string, number> = {};
  for (let y = GS / 2; y < 450; y += GS) {
    for (let x = GS / 2; x < 420; x += GS) {
      let r: 'A' | 'V' | null = null;
      if (y < 188 && (inEll(x, y, GEO.ra) || inEll(x, y, GEO.la))) r = 'A';
      else if (inPoly(x, y, outer) && !inPoly(x, y, rv) && !inPoly(x, y, lv)) r = 'V';
      if (!r) continue;
      const ix = Math.round((x - GS / 2) / GS);
      const iy = Math.round((y - GS / 2) / GS);
      idx[ix + ',' + iy] = cells.length;
      cells.push({ x, y, r, ix, iy, la: r === 'A' && x > 206, nb: [] });
    }
  }
  cells.forEach((c) => {
    c.nb = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const j = idx[c.ix + dx + ',' + (c.iy + dy)];
        if (j != null && cells[j].r === c.r) c.nb.push([j, GS * Math.hypot(dx, dy)]);
      }
  });
  return (GRID[key] = {
    cells,
    A: cells.map((c, i) => (c.r === 'A' ? i : -1)).filter((i) => i >= 0),
    V: cells.map((c, i) => (c.r === 'V' ? i : -1)).filter((i) => i >= 0)
  });
}

export function nearest(G: Grid, region: 'A' | 'V', x: number, y: number): number {
  let b = -1;
  let bd = 1e9;
  G.cells.forEach((c, i) => {
    if (c.r !== region) return;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < bd) {
      bd = d;
      b = i;
    }
  });
  return b;
}

export function dijkstra(G: Grid, src: Map<number, number>, v: number): Float64Array {
  const n = G.cells.length;
  const T = new Float64Array(n).fill(Infinity);
  const H: [number, number][] = [];
  const push = (i: number, t: number) => {
    H.push([t, i]);
    let k = H.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (H[p][0] <= H[k][0]) break;
      [H[p], H[k]] = [H[k], H[p]];
      k = p;
    }
  };
  const pop = (): [number, number] => {
    const top = H[0];
    const last = H.pop() as [number, number];
    if (H.length) {
      H[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < H.length && H[l][0] < H[m][0]) m = l;
        if (r < H.length && H[r][0] < H[m][0]) m = r;
        if (m === k) break;
        [H[m], H[k]] = [H[k], H[m]];
        k = m;
      }
    }
    return top;
  };
  src.forEach((t, i) => {
    if (t < T[i]) {
      T[i] = t;
      push(i, t);
    }
  });
  while (H.length) {
    const [t, i] = pop();
    if (t > T[i]) continue;
    for (const [j, d] of G.cells[i].nb) {
      const nt = t + d / v;
      if (nt < T[j]) {
        T[j] = nt;
        push(j, nt);
      }
    }
  }
  return T;
}

export interface AtrialMap {
  T: Float64Array;
  mx: number;
}

export function atrialMap(G: Grid, origin?: [number, number]): AtrialMap {
  const vA = 0.95;
  const vB = 3.2;
  const src = new Map<number, number>();
  const o = origin ?? GEO.sa;
  src.set(nearest(G, 'A', o[0], o[1]), 0);
  const tracts = origin ? [] : polySamples(GEO.bach, 3).concat(polySamples(GEO.inter, 3));
  for (const p of tracts)
    if (p.seg >= 1)
      G.A.forEach((i) => {
        const c = G.cells[i];
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < 9) {
          const t = p.s / vB + d / vA;
          if (!((src.get(i) as number) <= t)) src.set(i, t);
        }
      });
  const T = dijkstra(G, src, vA);
  let mx = 0;
  G.A.forEach((i) => {
    if (T[i] < Infinity) mx = Math.max(mx, T[i]);
  });
  return { T, mx };
}

export interface Branch {
  name: string;
  pts: [number, number][];
  t0: number;
  L: number;
  v: number;
}

export interface VentOpts {
  lb?: boolean;
  rb?: boolean;
  kent?: boolean;
  focus?: boolean;
  off?: number;
}

export interface VentMap {
  T: Float64Array;
  mn: number;
  mx: number;
  his: { t0: number; t1: number } | null;
  branches: Branch[];
}

export function ventMap(G: Grid, o: VentOpts): VentMap {
  const vM = 0.85;
  const vP = 4.2;
  const R = 12;
  const src = new Map<number, number>();
  const branches: Branch[] = [];
  const off = o.off || 0;
  const addBranch = (name: string, pts: [number, number][], t0: number, termIdx: number) => {
    const L = polyLen(pts);
    const termS = segStartLen(pts, termIdx || 0);
    branches.push({ name, pts, t0, L, v: vP });
    for (const p of polySamples(pts, 3))
      if (p.s >= termS)
        G.V.forEach((i) => {
          const c = G.cells[i];
          const d = Math.hypot(c.x - p.x, c.y - p.y);
          if (d < R) {
            const t = t0 + p.s / vP + d / vM;
            if (!((src.get(i) as number) <= t)) src.set(i, t);
          }
        });
  };
  let his: { t0: number; t1: number } | null = null;
  if (!o.focus) {
    his = { t0: off - 40, t1: off - 15 };
    if (o.rb !== false) addBranch('rb', GEO.rb, off - 15, GEO.rbTerm);
    if (o.lb !== false) {
      addBranch('lbTrunk', GEO.lbTrunk, off - 15, 0);
      const tl = off - 15 + polyLen(GEO.lbTrunk) / vP;
      addBranch('laf', GEO.laf, tl, GEO.lafTerm);
      addBranch('lpf', GEO.lpf, tl, GEO.lpfTerm);
    }
  }
  if (o.kent) src.set(nearest(G, 'V', GEO.kent[1][0], GEO.kent[1][1]), 0);
  if (o.focus) src.set(nearest(G, 'V', GEO.vtFocus[0], GEO.vtFocus[1]), 0);
  const T = dijkstra(G, src, vM);
  let mn = Infinity;
  let mx = -Infinity;
  G.V.forEach((i) => {
    if (T[i] < Infinity) {
      mn = Math.min(mn, T[i]);
      mx = Math.max(mx, T[i]);
    }
  });
  return { T, mn, mx, his, branches };
}
