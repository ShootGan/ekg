import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Computed } from '../compute';
import type { HeartFlags } from '../../data/atlas';
import { GEO, GS, el, ptsD, polySamples, segStartLen } from './geometry';
import { nearest } from './grid';
import type { Grid } from './grid';
import { renderHeart } from './anim';

export interface Ov {
  el: SVGPathElement;
  L: number;
  f: number;
  op: number;
}

export interface Twig {
  name: string;
  s: number;
  pts: [number, number][];
  el: SVGPathElement;
}

export interface HeartHandles {
  cellEls: SVGRectElement[];
  cellCol: string[];
  OV: Record<string, Ov>;
  twigs: Twig[];
  sa: SVGCircleElement;
  avn: SVGEllipseElement;
  avBar: SVGRectElement;
  x: SVGGElement;
  ring: SVGCircleElement;
  inj: SVGLineElement | null;
  fl: SVGEllipseElement | null;
}

export interface Heart2DHandle {
  svg: SVGSVGElement | null;
  handles: HeartHandles | null;
  grid: Grid | null;
  setTime(t: number): void;
}

function ann(svg: SVGSVGElement, x: number, y: number, t: string, c: string, a?: string) {
  const e = el('text', {
    x,
    y,
    'font-size': 11,
    'font-weight': 700,
    fill: c,
    'text-anchor': a || 'middle',
    'paint-order': 'stroke',
    stroke: '#fff',
    'stroke-width': 3
  });
  e.textContent = t;
  svg.appendChild(e);
}

function glowPath(svg: SVGSVGElement, d: string, stroke: string, w: number): Ov {
  const o = el('path', {
    d,
    fill: 'none',
    stroke,
    'stroke-width': w,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    filter: 'url(#glow)',
    opacity: 0
  });
  svg.appendChild(o);
  const L = o.getTotalLength();
  o.setAttribute('stroke-dasharray', L + ' ' + L);
  o.setAttribute('stroke-dashoffset', String(L));
  return { el: o, L, f: -1, op: -1 };
}

export function buildScene(svg: SVGSVGElement, c: Computed): HeartHandles {
  const H: HeartFlags = c.heart;
  svg.replaceChildren();
  const defs = el('defs');
  svg.appendChild(defs);
  defs.innerHTML =
    '<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#9d2a8a"/></marker>' +
    '<marker id="arrF" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#7b4fd0"/></marker>' +
    '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';

  const add = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
    const e = el(tag, attrs);
    svg.appendChild(e);
    return e;
  };

  add('path', { d: 'M96,8 L96,78 L130,78 L130,8', fill: '#dfe6ee', stroke: '#9fb0c2', 'stroke-width': 1.2 });
  add('text', { x: 113, y: 22, 'text-anchor': 'middle', 'font-size': 10, fill: '#5b636d' }).textContent = 'ŻGG';

  const g = add('g', {});
  const cellEls: SVGRectElement[] = [];
  const cellCol: string[] = [];
  const rest = '#efe4da';
  c.HM.G.cells.forEach((cell) => {
    const r = el('rect', { x: cell.x - GS / 2, y: cell.y - GS / 2, width: GS + 0.4, height: GS + 0.4, fill: rest });
    g.appendChild(r);
    cellEls.push(r);
    cellCol.push(rest);
  });

  const st = { fill: 'none', stroke: '#6b5a50', 'stroke-width': 1.6 };
  add('ellipse', { cx: GEO.ra.cx, cy: GEO.ra.cy, rx: GEO.ra.rx, ry: GEO.ra.ry, ...st });
  add('ellipse', { cx: GEO.la.cx, cy: GEO.la.cy, rx: GEO.la.rx, ry: GEO.la.ry, ...st });
  add('path', { d: GEO.outer, ...st });
  add('path', { d: GEO.rv, fill: '#fbf8f5', stroke: '#6b5a50', 'stroke-width': 1.3 });
  add('path', { d: H.lvh ? GEO.lvLVH : GEO.lv, fill: '#fbf8f5', stroke: '#6b5a50', 'stroke-width': 1.3 });
  add('path', { d: 'M60,190 C140,180 300,180 372,190', fill: 'none', stroke: '#b9aa9c', 'stroke-width': 3, 'stroke-dasharray': '2 4' });

  const lab = (x: number, y: number, t: string, s?: number) => {
    const e = add('text', { x, y, 'text-anchor': 'middle', 'font-size': s || 12, 'font-weight': 600, fill: '#7a6a5f' });
    e.textContent = t;
    return e;
  };
  lab(120, 140, 'PP');
  lab(290, 112, 'LP');
  lab(140, 280, 'PK');
  lab(H.lvh ? 282 : 287, 300, 'LK');
  add('text', { x: 6, y: 444, 'font-size': 9.5, fill: '#8a8f96' }).textContent = 'widok od przodu: prawa strona pacjenta po lewej';

  let inj: SVGLineElement | null = null;
  if (H.stemi) {
    inj = add('line', H.stemi === 'anterior' ? { x1: 250, y1: 280, x2: 222, y2: 336 } : { x1: 225, y1: 290, x2: 205, y2: 392 });
    inj.setAttribute('stroke', '#9d2a8a');
    inj.setAttribute('stroke-width', '4');
    inj.setAttribute('marker-end', 'url(#arr)');
    inj.setAttribute('opacity', '0');
    const tx = add('text', {
      x: 300,
      y: H.stemi === 'anterior' ? 412 : 432,
      'font-size': 11,
      fill: '#9d2a8a',
      'font-weight': 600,
      'text-anchor': 'middle'
    });
    tx.textContent = H.stemi === 'anterior' ? 'strefa uszkodzenia: LAD' : 'strefa uszkodzenia: RCA';
  }

  let fl: SVGEllipseElement | null = null;
  if (H.atria === 'flutter') {
    add('ellipse', { cx: 150, cy: 150, rx: 26, ry: 14, fill: '#fbf8f5', stroke: '#6b5a50', 'stroke-width': 1.2 });
    fl = add('ellipse', {
      cx: 150,
      cy: 150,
      rx: 44,
      ry: 30,
      fill: 'none',
      stroke: '#7b4fd0',
      'stroke-width': 3,
      'stroke-dasharray': '40 236',
      'marker-end': 'url(#arrF)'
    });
    lab(150, 154, 'ZT', 9);
  }

  const OV: Record<string, Ov> = {};
  const path = (name: string, pts: [number, number][], w?: number) => {
    const d = ptsD(pts);
    add('path', {
      d,
      fill: 'none',
      stroke: '#2f6f6a',
      'stroke-width': w || 3,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.85
    });
    OV[name] = glowPath(svg, d, '#ffd400', (w || 3) + 1.6);
  };

  const twigPts: { name: string; s: number; pts: [number, number][] }[] = [];
  const twigFrom = (pts: [number, number][], termIdx: number, name: string) => {
    const ss = polySamples(pts, 26);
    const termS = segStartLen(pts, termIdx);
    ss.forEach((p, k) => {
      if (p.s < termS + 8 || k === ss.length - 1) return;
      const cell = c.HM.G.cells[nearest(c.HM.G, 'V', p.x, p.y)];
      const dx = cell.x - p.x;
      const dy = cell.y - p.y;
      const l = Math.hypot(dx, dy) || 1;
      twigPts.push({ name, s: p.s, pts: [[p.x, p.y], [p.x + (dx / l) * 13, p.y + (dy / l) * 13]] });
    });
  };
  twigFrom(GEO.rb, GEO.rbTerm, 'rb');
  twigFrom(GEO.laf, GEO.lafTerm, 'laf');
  twigFrom(GEO.lpf, GEO.lpfTerm, 'lpf');
  const twigs: Twig[] = twigPts.map((tw) => {
    const d = ptsD(tw.pts);
    add('path', { d, stroke: '#2f6f6a', 'stroke-width': 1.4, opacity: 0.8, fill: 'none' });
    const o = add('path', { d, stroke: '#ffd400', 'stroke-width': 2.6, opacity: 0, filter: 'url(#glow)', fill: 'none' });
    return { name: tw.name, s: tw.s, pts: tw.pts, el: o };
  });

  path('bach', GEO.bach, 2.2);
  path('inter', GEO.inter, 2.2);
  path('his', GEO.his, 4.2);
  path('rb', GEO.rb, 3);
  path('lbTrunk', GEO.lbTrunk, 4);
  path('laf', GEO.laf, 2.8);
  path('lpf', GEO.lpf, 2.8);

  if (H.type === 'wpw' || H.svt === 'avrt') {
    const d = ptsD(H.svt === 'avrt' ? [...GEO.kent].reverse() : GEO.kent);
    add('path', { d, stroke: '#7b4fd0', 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' });
    OV.kent = glowPath(svg, d, '#ffd400', 6.5);
    ann(svg, 40, 182, 'pęczek Kenta', '#7b4fd0', 'start');
  }

  const sa = add('circle', { cx: GEO.sa[0], cy: GEO.sa[1], r: 7, fill: '#2f6f6a', stroke: '#fff', 'stroke-width': 1.5 });
  add('ellipse', {
    cx: GEO.avn[0],
    cy: GEO.avn[1],
    rx: 10,
    ry: 7,
    fill: H.avSlow ? '#c98a2b' : '#2f6f6a',
    stroke: '#fff',
    'stroke-width': 1.5
  });
  const avn = add('ellipse', { cx: GEO.avn[0], cy: GEO.avn[1], rx: 10, ry: 7, fill: '#ffd400', filter: 'url(#glow)', opacity: 0 });
  const avBar = add('rect', { x: GEO.avn[0] - 9, y: GEO.avn[1] + 9, width: 0, height: 3, fill: '#ffd400', rx: 1.5 });
  add('text', { x: 60, y: 62, 'font-size': 10.5, fill: '#2f6f6a', 'font-weight': 600 }).textContent = 'węzeł SA';
  add('text', { x: 214, y: 168, 'font-size': 10.5, fill: '#2f6f6a', 'font-weight': 600 }).textContent = 'węzeł AV';
  add('text', { x: 218, y: 205, 'font-size': 10, fill: '#2f6f6a' }).textContent = 'pęczek Hisa';
  add('text', { x: 130, y: 400, 'font-size': 10, fill: '#2f6f6a' }).textContent = 'prawa odnoga';
  add('text', { x: 272, y: 274, 'font-size': 10, fill: '#2f6f6a' }).textContent = 'lewa odnoga';
  add('text', { x: 316, y: 360, 'font-size': 9.5, fill: '#2f6f6a' }).textContent = 'włókna Purkinjego';

  const bar = (x: number, y: number, rot: number) => {
    const g2 = add('g', { transform: `translate(${x},${y}) rotate(${rot})` });
    el('rect', { x: -9, y: -3, width: 18, height: 6, fill: '#d62828', rx: 2, stroke: '#fff', 'stroke-width': 1 }, g2);
  };
  if (H.type === 'lbbb') {
    bar(219, 229, 40);
    ann(svg, 292, 246, 'blok lewej odnogi', '#d62828', 'middle');
  }
  if (H.type === 'rbbb') {
    bar(206, 240, 75);
    ann(svg, 120, 236, 'blok prawej odnogi', '#d62828', 'middle');
  }
  if (H.avSlow) ann(svg, 236, 186, 'wolne przewodzenie', '#c98a2b', 'start');
  if (H.lvh) ann(svg, 340, 420, 'gruba ściana LK', '#7a6a5f', 'middle');
  if (H.hyperK) ann(svg, 300, 30, 'K⁺ ↑ – wolne przewodzenie', '#b3261e', 'middle');
  if (H.atria === 'af') ann(svg, 300, 30, 'chaotyczne fale w przedsionkach', '#7b4fd0', 'middle');
  if (H.atria === 'flutter') ann(svg, 46, 180, 'makro-reentry', '#7b4fd0', 'start');

  const xg = add('g', { opacity: 0 });
  el('path', { d: 'M-8,-8 L8,8 M8,-8 L-8,8', stroke: '#d62828', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }, xg);
  if (H.block === 'avn' && c.cfg.av === 3) {
    const g3 = add('g', { transform: `translate(${GEO.avn[0]},${GEO.avn[1] + 1})` });
    el('path', { d: 'M-7,-7 L7,7 M7,-7 L-7,7', stroke: '#d62828', 'stroke-width': 3, 'stroke-linecap': 'round', fill: 'none' }, g3);
  }
  const ring = add('circle', { r: 11, fill: 'none', stroke: '#1a9e5c', 'stroke-width': 3, opacity: 0 });
  if (H.escape) {
    ring.setAttribute('cx', '208');
    ring.setAttribute('cy', '206');
    ann(svg, 120, 196, 'ośrodek zastępczy', '#1a9e5c', 'middle');
  }
  if (H.svt === 'at') {
    ring.setAttribute('cx', String(GEO.atFocus[0]));
    ring.setAttribute('cy', String(GEO.atFocus[1]));
    ann(svg, 40, 196, 'ognisko AT', '#1a9e5c', 'start');
  }
  if (H.svt === 'avnrt') {
    ring.setAttribute('cx', String(GEO.avn[0]));
    ring.setAttribute('cy', String(GEO.avn[1]));
    ring.setAttribute('stroke', '#e07a12');
    ann(svg, 236, 150, 'pętla w węźle AV', '#e07a12', 'start');
  }
  if (H.svt === 'avrt') ann(svg, 40, 236, 'wstecznie ↑', '#7b4fd0', 'start');
  if (H.type === 'vt') {
    ring.setAttribute('cx', String(GEO.vtFocus[0]));
    ring.setAttribute('cy', String(GEO.vtFocus[1]));
    ann(svg, 330, 430, 'ognisko VT', '#1a9e5c', 'middle');
  }

  return { cellEls, cellCol, OV, twigs, sa, avn, avBar, x: xg, ring, inj, fl };
}

export interface Heart2DProps {
  c: Computed;
}

export const Heart2D = forwardRef<Heart2DHandle, Heart2DProps>(function Heart2D({ c }, ref) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const handlesRef = useRef<HeartHandles | null>(null);
  const cRef = useRef<Computed>(c);
  cRef.current = c;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const h = buildScene(svg, c);
    handlesRef.current = h;
    renderHeart(c, h, 0);
  }, [c]);

  useImperativeHandle(
    ref,
    () => ({
      get svg() {
        return svgRef.current;
      },
      get handles() {
        return handlesRef.current;
      },
      get grid() {
        return cRef.current.HM.G;
      },
      setTime(t: number) {
        const h = handlesRef.current;
        if (h) renderHeart(cRef.current, h, t);
      }
    }),
    []
  );

  return <svg ref={svgRef} viewBox="0 0 420 450" role="img" aria-label="Schemat serca i układu bodźcoprzewodzącego" className="atlas-heart" />;
});
