import { CatmullRomCurve3, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3 } from 'three';
import type { Computed } from '../compute';
import type { HeartFlags } from '../../data/atlas';

export const V_M = 1.05;
export const V_P = 3.4;

export type V3 = [number, number, number];

const F = 0.024;

export const SITES = {
  sa: [-0.46, 0.63, F] as V3,
  av: [-0.2, 0.29, F] as V3,
  his: [-0.17, 0.12, F] as V3,
  rbEnd: [-0.46, -0.35, F] as V3,
  lbSplit: [-0.12, -0.04, F] as V3,
  lafEnd: [0.42, -0.07, F] as V3,
  lpfEnd: [0.15, -0.66, F] as V3,
  kentIn: [-0.53, 0.3, F] as V3,
  kentOut: [-0.49, 0.04, F] as V3,
  vt: [0.43, -0.57, F] as V3,
  bachEnd: [0.32, 0.6, -0.06] as V3,
  atFocus: [-0.545, 0.32, F] as V3,
  lsfEnd: [-0.16, -0.28, F] as V3
};

export type BranchGroup = 'A' | 'V' | 'B' | 'P';

export interface Branch {
  name: string;
  group: BranchGroup;
  pts: V3[];
  t0: number;
  radius: number;
  color: string;
}

export interface Pulse {
  name: string;
  group: BranchGroup;
  curve: CatmullRomCurve3;
  node: Group;
  core: Mesh;
  halo: Mesh;
  t0: number;
  dur: number;
}

export interface Twig {
  parent: string;
  mesh: Mesh;
}

export interface Conduction {
  group: Group;
  pulses: Pulse[];
  twigs: Twig[];
  sa: Mesh;
  avn: Mesh;
  avHalo: Mesh;
  focusRing: Mesh | null;
  blocks: Group[];
  arrows: Group[];
  spanV: number;
  spanA: number;
  dispose(): void;
}

export function pathLength(pts: V3[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
  return L;
}

export function branchSchedule(heart: HeartFlags): Branch[] {
  const split = -0.03 + pathLength([SITES.av, SITES.his]) / V_P;
  const tLb = split + pathLength([SITES.his, SITES.lbSplit]) / V_P;
  const list: Branch[] = [
    { name: 'bach', group: 'A', pts: [SITES.sa, [-0.3, 0.66, 0.0], [-0.05, 0.58, -0.1], [0.15, 0.64, -0.08], SITES.bachEnd], t0: 0, radius: 0.014, color: '#2f6f6a' },
    { name: 'inter', group: 'A', pts: [SITES.sa, [-0.56, 0.495, F], [-0.55, 0.34, F], [-0.425, 0.205, F], [-0.3, 0.23, F], SITES.av], t0: 0, radius: 0.012, color: '#2f6f6a' },
    { name: 'interA', group: 'A', pts: [SITES.sa, [-0.3, 0.64, F], [-0.185, 0.55, F], [-0.15, 0.42, F], [-0.17, 0.33, F], SITES.av], t0: 0, radius: 0.012, color: '#2f6f6a' },
    { name: 'interM', group: 'A', pts: [SITES.sa, [-0.4, 0.55, -0.146], [-0.32, 0.44, -0.188], [-0.25, 0.34, -0.138], SITES.av], t0: 0, radius: 0.012, color: '#2f6f6a' },
    { name: 'his', group: 'V', pts: [SITES.av, [-0.18, 0.2, F], SITES.his], t0: -0.03, radius: 0.022, color: '#25605c' },
    { name: 'rb', group: 'V', pts: [SITES.his, [-0.24, -0.1, F], [-0.22, -0.3, F], [-0.19, -0.42, F], [-0.33, -0.39, F], SITES.rbEnd], t0: split, radius: 0.015, color: '#25605c' },
    { name: 'lbTrunk', group: 'V', pts: [SITES.his, [-0.13, 0.05, F], SITES.lbSplit], t0: split, radius: 0.019, color: '#25605c' },
    { name: 'laf', group: 'V', pts: [SITES.lbSplit, [0.02, -0.1, -0.25], [0.17, -0.07, -0.275], [0.32, -0.07, -0.19], [0.42, -0.07, F]], t0: tLb, radius: 0.014, color: '#25605c' },
    { name: 'lsf', group: 'V', pts: [SITES.lbSplit, [-0.15, -0.13, F], SITES.lsfEnd], t0: tLb, radius: 0.012, color: '#25605c' },
    { name: 'lpf', group: 'V', pts: [SITES.lbSplit, [-0.1, -0.2, F], [-0.03, -0.4, F], [0.07, -0.55, F], SITES.lpfEnd], t0: tLb, radius: 0.014, color: '#25605c' }
  ];
  if (heart.type === 'wpw' || heart.svt === 'avrt') list.push({ name: 'kent', group: 'B', pts: [SITES.kentIn, [-0.53, 0.17, F], SITES.kentOut], t0: 0, radius: 0.021, color: '#7b4fd0' });
  const twig = (parent: string, from: V3, to: [number, number][]) => {
    for (const q of to) list.push({ name: 'tw:' + parent, group: 'P', pts: [from, mid(from, [q[0], q[1], F]), [q[0], q[1], F]], t0: 0, radius: 0.0075, color: '#3f7f7a' });
  };
  twig('rb', SITES.rbEnd, [[-0.49, -0.2], [-0.5, -0.06], [-0.38, -0.4]]);
  twig('rb', [-0.19, -0.42, F], [[-0.255, -0.445]]);
  twig('lpf', SITES.lpfEnd, [[0.29, -0.79], [0.08, -0.68], [0.44, -0.55]]);
  twig('laf', SITES.lafEnd, [[0.41, 0.02], [0.48, -0.22]]);
  twig('lsf', SITES.lsfEnd, [[-0.05, -0.35], [-0.2, -0.4]]);
  return list;
}

function mid(a: V3, b: V3): V3 {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function curveOf(pts: V3[], tension = 0.4): CatmullRomCurve3 {
  return new CatmullRomCurve3(pts.map((p) => new Vector3(p[0], p[1], p[2])), false, 'catmullrom', tension);
}

export function rodBetween(a: V3, b: V3, radius: number, color: string): Group {
  const g = new Group();
  const geo = new TubeGeometry(curveOf([a, mid(a, b), b], 0), 12, radius, 7, false);
  const mat = new MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 });
  g.add(new Mesh(geo, mat));
  return g;
}

export function buildConduction(c: Computed): Conduction {
  const group = new Group();
  const pulses: Pulse[] = [];
  const twigs: Twig[] = [];
  const schedule = branchSchedule(c.heart);
  let spanV = 0;
  let spanA = 0;

  for (const br of schedule) {
    const curve = curveOf(br.pts);
    const len = pathLength(br.pts);
    if (br.group === 'P') {
      const tm = new Mesh(new TubeGeometry(curve, 10, br.radius, 5, false), new MeshStandardMaterial({ color: br.color, emissive: '#ffd400', emissiveIntensity: 0, roughness: 0.55 }));
      group.add(tm);
      twigs.push({ parent: br.name.slice(3), mesh: tm });
      continue;
    }
    const geo = new TubeGeometry(curve, 44, br.radius, 7, false);
    const mat = new MeshStandardMaterial({ color: br.color, roughness: 0.55, metalness: 0.08 });
    group.add(new Mesh(geo, mat));

    const dur = len / V_P;
    if (br.group === 'V') spanV = Math.max(spanV, br.t0 + dur);
    if (br.group === 'A') spanA = Math.max(spanA, br.t0 + dur);

    const node = new Group();
    const core = new Mesh(new SphereGeometry(0.032, 10, 8), new MeshStandardMaterial({ color: '#ffe066', emissive: '#ffd400', emissiveIntensity: 2.6, roughness: 0.3 }));
    const halo = new Mesh(
      new SphereGeometry(0.075, 10, 8),
      new MeshStandardMaterial({ color: '#ffef9e', emissive: '#ffcc00', emissiveIntensity: 1.2, transparent: true, opacity: 0.34, roughness: 0.5 })
    );
    node.add(core, halo);
    node.visible = false;
    group.add(node);
    pulses.push({ name: br.name, group: br.group, curve, node, core, halo, t0: br.t0, dur });
  }

  const sa = new Mesh(new SphereGeometry(0.058, 14, 10), new MeshStandardMaterial({ color: '#2f6f6a', emissive: '#2f6f6a', emissiveIntensity: 0.45, roughness: 0.5 }));
  sa.position.set(SITES.sa[0], SITES.sa[1], SITES.sa[2]);
  group.add(sa);

  const avCol = c.heart.avSlow ? '#c98a2b' : '#2f6f6a';
  const avn = new Mesh(new SphereGeometry(0.082, 14, 10), new MeshStandardMaterial({ color: avCol, emissive: avCol, emissiveIntensity: 0.45, roughness: 0.5 }));
  avn.scale.set(1, 0.7, 0.82);
  avn.position.set(SITES.av[0], SITES.av[1], SITES.av[2]);
  group.add(avn);

  const avHalo = new Mesh(
    new TorusGeometry(0.115, 0.013, 8, 24),
    new MeshStandardMaterial({ color: '#ffd400', emissive: '#ffd400', emissiveIntensity: 1.7, transparent: true, opacity: 0, roughness: 0.4 })
  );
  avHalo.position.copy(avn.position);
  group.add(avHalo);

  const blocks: Group[] = [];
  const addBlock = (a: V3, b: V3) => {
    const g = rodBetween(a, b, 0.03, '#d62828');
    group.add(g);
    blocks.push(g);
  };
  if (c.cfg.av === 3) addBlock([SITES.av[0] - 0.1, SITES.av[1] - 0.08, F + 0.03], [SITES.av[0] + 0.08, SITES.av[1] - 0.02, F + 0.03]);
  if (c.heart.type === 'lbbb') addBlock([-0.22, 0.02, F + 0.03], [-0.05, 0.11, F + 0.03]);
  if (c.heart.type === 'rbbb') addBlock([-0.32, -0.22, F + 0.03], [-0.16, -0.15, F + 0.03]);

  const arrows: Group[] = [];
  const dirArrow = (from: V3, to: V3) => {
    const g = new Group();
    const shaft = new TubeGeometry(curveOf([from, mid(from, to), to], 0), 10, 0.022, 6, false);
    g.add(new Mesh(shaft, new MeshStandardMaterial({ color: '#9d2a8a', emissive: '#9d2a8a', emissiveIntensity: 0.7, roughness: 0.4 })));
    const cone = new ConeGeometry(0.06, 0.15, 16);
    cone.rotateX(Math.PI / 2);
    const tip = new Mesh(cone, new MeshStandardMaterial({ color: '#9d2a8a', emissive: '#9d2a8a', emissiveIntensity: 0.9, roughness: 0.4 }));
    tip.position.set(to[0], to[1], to[2]);
    tip.lookAt(2 * to[0] - from[0], 2 * to[1] - from[1], 2 * to[2] - from[2]);
    g.add(tip);
    g.visible = false;
    group.add(g);
    arrows.push(g);
    return g;
  };
  if (c.heart.stemi === 'anterior') dirArrow([0.12, -0.38, 0.06], [0.12, -0.38, 0.5]);
  if (c.heart.stemi === 'inferior') dirArrow([0.2, -0.6, 0.0], [0.2, -0.98, 0.0]);

  let focusRing: Mesh | null = null;
  if (c.heart.type === 'vt') {
    focusRing = new Mesh(new TorusGeometry(0.19, 0.02, 8, 28), new MeshStandardMaterial({ color: '#1a9e5c', emissive: '#1a9e5c', emissiveIntensity: 1, roughness: 0.5 }));
    focusRing.position.set(SITES.vt[0], SITES.vt[1], SITES.vt[2]);
    focusRing.rotation.set(0, 0, 0);
    group.add(focusRing);
  } else if (c.heart.svt === 'at' || c.heart.svt === 'avnrt') {
    const col = c.heart.svt === 'at' ? '#1a9e5c' : '#e07a12';
    focusRing = new Mesh(new TorusGeometry(c.heart.svt === 'at' ? 0.09 : 0.13, 0.016, 8, 26), new MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1, roughness: 0.5 }));
    const at = c.heart.svt === 'at' ? SITES.atFocus : SITES.av;
    focusRing.position.set(at[0], at[1], at[2] + 0.01);
    group.add(focusRing);
  } else if (c.heart.escape) {
    focusRing = new Mesh(new TorusGeometry(0.15, 0.016, 8, 26), new MeshStandardMaterial({ color: '#1a9e5c', emissive: '#1a9e5c', emissiveIntensity: 1, roughness: 0.5 }));
    focusRing.position.set(SITES.his[0], SITES.his[1], SITES.his[2]);
    group.add(focusRing);
  }

  return {
    group,
    pulses,
    twigs,
    sa,
    avn,
    avHalo,
    focusRing,
    blocks,
    arrows,
    spanV,
    spanA,
    dispose() {
      group.traverse((o) => {
        const m = o as unknown as { geometry?: { dispose(): void }; material?: { dispose(): void } };
        m.geometry?.dispose();
        m.material?.dispose();
      });
    }
  };
}
