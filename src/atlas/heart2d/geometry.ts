export const NS = 'http://www.w3.org/2000/svg';

export const GEO = {
  ra: { cx: 140, cy: 125, rx: 74, ry: 58 },
  la: { cx: 272, cy: 108, rx: 72, ry: 46 },
  outer: 'M66,198 C50,290 120,380 238,428 C330,388 392,300 366,196 C300,186 140,186 66,198 Z',
  rv: 'M86,212 C82,280 130,340 196,372 L199,226 C165,214 120,210 86,212 Z',
  lv: 'M226,226 C220,292 232,350 250,392 C302,356 342,292 344,218 C306,208 262,210 226,226 Z',
  lvLVH: 'M236,236 C232,292 242,338 255,370 C290,344 318,292 324,230 C298,222 268,224 236,236 Z',
  sa: [112, 75] as [number, number],
  avn: [200, 171] as [number, number],
  avEntry: [194, 158] as [number, number],
  his: [[200, 177], [206, 198], [211, 218]] as Pt[],
  rb: [[211, 218], [205, 236], [201, 270], [198, 320], [194, 362], [160, 352], [122, 322], [98, 276], [89, 228]] as Pt[],
  rbTerm: 3,
  lbTrunk: [[211, 218], [224, 236]] as Pt[],
  laf: [[224, 236], [266, 256], [314, 254], [341, 238]] as Pt[],
  lafTerm: 2,
  lpf: [[224, 236], [229, 280], [236, 330], [251, 386], [292, 366], [322, 328], [341, 280]] as Pt[],
  lpfTerm: 1,
  bach: [[112, 75], [160, 64], [208, 76], [248, 70]] as Pt[],
  inter: [[112, 75], [146, 100], [178, 130], [194, 158]] as Pt[],
  kent: [[82, 156], [76, 208]] as Pt[],
  vtFocus: [244, 410] as [number, number],
  atFocus: [96, 150] as [number, number]
};

export type Pt = [number, number];

export const GS = 6;

export function el<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  parent?: Element | null
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(NS, tag) as SVGElementTagNameMap[K];
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

export function ptsD(p: Pt[]): string {
  return 'M' + p.map((q) => q[0] + ',' + q[1]).join(' L');
}

export function samplePath(svg: SVGSVGElement, d: string, n: number): Pt[] {
  const p = el('path', { d });
  svg.appendChild(p);
  const L = p.getTotalLength();
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const q = p.getPointAtLength((L * i) / n);
    out.push([q.x, q.y]);
  }
  p.remove();
  return out;
}

export function inPoly(x: number, y: number, P: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i];
    const [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function inEll(x: number, y: number, e: { cx: number; cy: number; rx: number; ry: number }): boolean {
  const a = (x - e.cx) / e.rx;
  const b = (y - e.cy) / e.ry;
  return a * a + b * b <= 1;
}

export interface Sample {
  x: number;
  y: number;
  s: number;
  seg: number;
}

export function polySamples(pts: Pt[], step: number): Sample[] {
  const out: Sample[] = [];
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push({ x: x0 + ((x1 - x0) * k) / n, y: y0 + ((y1 - y0) * k) / n, s: s + (L * k) / n, seg: i });
    s += L;
  }
  const l = pts[pts.length - 1];
  out.push({ x: l[0], y: l[1], s, seg: pts.length - 2 });
  return out;
}

export function polyLen(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) s += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  return s;
}

export function segStartLen(pts: Pt[], idx: number): number {
  return polyLen(pts.slice(0, idx + 1));
}
