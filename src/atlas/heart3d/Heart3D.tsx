import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  BufferAttribute,
  CanvasTexture,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer
} from 'three';
import type { Computed } from '../compute';
import type { Clock } from '../clock';
import { bsearch, ventState } from '../clock';
import { COL, REP } from '../../data/phases';
import { buildHeart } from './mesh';
import type { HeartMesh } from './mesh';
import { computeWave } from './wave';
import type { WaveData } from './wave';
import { buildConduction } from './conduction';
import type { Conduction } from './conduction';

export interface Heart3DProps {
  caseData: Computed;
  clock: Clock;
  height?: number;
}

const SLOT = { REST: 0, FRONT: 1, DEP: 2, INJ: 3, WEAK: 4, INREST: 5, REP0: 6 };
const NSLOT = 12;

function srgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [f((n >> 16) & 255), f((n >> 8) & 255), f(n & 255)];
}

function palette(): Float32Array {
  const out = new Float32Array(NSLOT * 3);
  const put = (slot: number, hex: string) => {
    const c = srgb(hex);
    out[slot * 3] = c[0];
    out[slot * 3 + 1] = c[1];
    out[slot * 3 + 2] = c[2];
  };
  put(SLOT.REST, COL.rest);
  put(SLOT.FRONT, COL.front);
  put(SLOT.DEP, COL.dep);
  put(SLOT.INJ, COL.inj);
  put(SLOT.WEAK, COL.weak);
  put(SLOT.INREST, COL.injRest);
  REP.forEach((h, i) => put(SLOT.REP0 + i, h));
  return out;
}

function cellSlot(t: number, act: number, rep: number, inj: boolean, weak: boolean): number {
  if (t < act) return -1;
  if (t < act + 0.012) return SLOT.FRONT;
  if (t < rep) return inj ? SLOT.INJ : weak ? SLOT.WEAK : SLOT.DEP;
  const k = Math.floor((t - rep) / 0.012);
  return k < REP.length ? SLOT.REP0 + k : -1;
}

class Orbit {
  theta = 0.42;
  phi = 1.24;
  radius: number;
  target = new Vector3(0, 0, 0);
  gTheta = 0.42;
  gPhi = 1.24;
  gRadius: number;
  dragging = 0;
  px = 0;
  py = 0;
  private el: HTMLCanvasElement;
  private cam: PerspectiveCamera;
  private onChange: () => void;
  private opts: { min: number; max: number };
  private cleanup: (() => void)[] = [];

  constructor(el: HTMLCanvasElement, cam: PerspectiveCamera, radius: number, onChange: () => void) {
    this.el = el;
    this.cam = cam;
    this.radius = radius;
    this.gRadius = radius;
    this.onChange = onChange;
    this.opts = { min: radius * 0.42, max: radius * 2.6 };
    this.bind();
    this.update(0);
  }

  private on = <K extends keyof HTMLElementEventMap>(k: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    this.el.addEventListener(k, fn as EventListener, { passive: false });
    this.cleanup.push(() => this.el.removeEventListener(k, fn as EventListener));
  };

  private bind() {
    this.on('pointerdown', (e) => {
      this.dragging = e.button === 2 ? 2 : 1;
      this.px = e.clientX;
      this.py = e.clientY;
      this.el.setPointerCapture(e.pointerId);
    });
    this.on('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.px;
      const dy = e.clientY - this.py;
      this.px = e.clientX;
      this.py = e.clientY;
      if (this.dragging === 1) {
        this.gTheta -= dx * 0.0075;
        this.gPhi = Math.max(0.16, Math.min(Math.PI - 0.16, this.gPhi - dy * 0.0075));
      } else {
        const k = this.radius * 0.0016;
        const right = new Vector3().setFromArray([Math.cos(this.theta), 0, -Math.sin(this.theta)]);
        this.target.addScaledVector(right, -dx * k);
        this.target.y += dy * k;
      }
      this.onChange();
    });
    const up = () => {
      this.dragging = 0;
    };
    this.on('pointerup', up);
    this.on('pointercancel', up);
    this.on('contextmenu', (e) => e.preventDefault());
    this.on('wheel', (e) => {
      e.preventDefault();
      this.gRadius = Math.max(this.opts.min, Math.min(this.opts.max, this.gRadius * Math.exp(e.deltaY * 0.0011)));
      this.onChange();
    });
  }

  update(dt: number) {
    const s = dt > 0 ? Math.min(1, dt * 12) : 1;
    this.theta += (this.gTheta - this.theta) * s;
    this.phi += (this.gPhi - this.phi) * s;
    this.radius += (this.gRadius - this.radius) * s;
    const sp = Math.sin(this.phi);
    this.cam.position.set(
      this.target.x + this.radius * sp * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * sp * Math.cos(this.theta)
    );
    this.cam.lookAt(this.target.x, this.target.y, this.target.z);
  }

  dispose() {
    this.cleanup.forEach((f) => f());
    this.cleanup = [];
  }
}

function labelSprite(text: string, color: string): Sprite {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 64;
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 64);
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.strokeText(text, 64, 34);
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 34);
  }
  const tex = new CanvasTexture(cv);
  const mat = new SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const sp = new Sprite(mat);
  sp.scale.set(0.3, 0.15, 1);
  return sp;
}

function supportsWebGL(): boolean {
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    if (!gl) return false;
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function Heart3D({ caseData, clock, height = 430 }: Heart3DProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFallback('Animacja 3D wyłączona – system prosi o ograniczenie ruchu. Schemat 2D pokazuje ten sam przebieg.');
      return;
    }
    if (!supportsWebGL()) {
      setFallback('Ta przeglądarka nie udostępnia WebGL – schemat 2D pokazuje ten sam przebieg.');
      return;
    }
    setFallback(null);

    const c = caseData;
    const H = c.heart;
    const HM = c.HM;
    const w = host.clientWidth || 520;
    const h = height;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFallback('Nie udało się uruchomić renderera 3D – schemat 2D pokazuje ten sam przebieg.');
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.setAttribute('aria-label', 'Serce 3D z falą depolaryzacji i układem bodźcoprzewodzącym');
    host.appendChild(canvas);

    const scene = new Scene();
    const camera = new PerspectiveCamera(38, w / h, 0.1, 40);
    scene.add(new AmbientLight(0xffffff, 1.25));
    const d1 = new DirectionalLight(0xffffff, 1.35);
    d1.position.set(2.4, 3.2, 3.6);
    const d2 = new DirectionalLight(0xffffff, 0.45);
    d2.position.set(-3.2, -1.4, -2.6);
    scene.add(d1, d2);

    const heart = new Group();
    scene.add(heart);

    const mesh: HeartMesh = buildHeart(!!H.lvh, 1);
    const wave: WaveData = computeWave(mesh, c);
    const pal = palette();
    const disposables: { dispose(): void }[] = [];

    const heartMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.0, side: DoubleSide });
    disposables.push(heartMat);
    const heartMesh = new Mesh(mesh.geometry, heartMat);
    heart.add(heartMesh);
    const colorAttr = mesh.geometry.getAttribute('color') as BufferAttribute;

    const cond: Conduction = buildConduction(c);
    heart.add(cond.group);

    const labels: Sprite[] = [];
    for (const ch of mesh.labels) {
      const sp = labelSprite(ch.label, '#7a6a5f');
      sp.position.set(ch.pos[0], ch.pos[1], ch.pos[2]);
      heart.add(sp);
      labels.push(sp);
    }

    heart.position.set(-mesh.center[0], -mesh.center[1], -mesh.center[2]);

    const af = H.atria === 'af';
    const fl = H.atria === 'flutter';
    const weakA = !!H.hyperK;
    const weakV = !!H.hyperK;
    const afP = new Float32Array(mesh.count * 3);
    const flP = new Float32Array(mesh.count);
    for (let i = 0; i < mesh.count; i++) {
      const x = mesh.pos[i * 3];
      const y = mesh.pos[i * 3 + 1];
      const z = mesh.pos[i * 3 + 2];
      afP[i * 3] = 11 * x + 4 * z;
      afP[i * 3 + 1] = 13 * y - 5 * z + 1;
      afP[i * 3 + 2] = 9 * (x - y) + 6 * z + 2;
      flP[i] = Math.atan2((y - 0.38) * 1.3, x + 0.3) / (2 * Math.PI);
    }

    const repWin = (b: { stEnd: number; tEnd: number }): [number, number] => {
      const narrow = !!H.hyperK;
      return [b.stEnd + (narrow ? 0.02 : 0.03), b.tEnd - (narrow ? 0.015 : 0.03)];
    };

    const VESSEL_RGB = srgb('#d9c3b4');
    const slots = new Uint8Array(mesh.count).fill(255);
    const shade = mesh.shade;
    const buf = colorAttr.array as Float32Array;
    for (let i = 0; i < mesh.count; i++) {
      if (mesh.region[i] !== 2) continue;
      buf[i * 3] = VESSEL_RGB[0] * shade[i];
      buf[i * 3 + 1] = VESSEL_RGB[1] * shade[i];
      buf[i * 3 + 2] = VESSEL_RGB[2] * shade[i];
    }
    colorAttr.needsUpdate = true;

    const paint = (t: number) => {
      const ai = c.ATR.length ? bsearch(c.ATR, t) : -1;
      const vi = bsearch(c.BEATS, t);
      const w8 = [2 * Math.PI * 5.3 * t, 2 * Math.PI * 6.7 * t, 2 * Math.PI * 4.1 * t];
      const flFr = 5 * t;
      const region = mesh.region;
      let dirty = false;
      for (let i = 0; i < mesh.count; i++) {
        const r = region[i];
        if (r === 2) continue;
        let slot = -1;
        if (r === 0) {
          if (af) {
            const p = Math.sin(afP[i * 3] + w8[0]) + Math.sin(afP[i * 3 + 1] - w8[1]) + Math.sin(afP[i * 3 + 2] + w8[2]);
            slot = p > 1.45 ? SLOT.FRONT : p > 0.95 ? SLOT.DEP : p > 0.6 ? SLOT.REP0 + 1 : -1;
          } else if (fl) {
            const ph = (((flP[i] + flFr) % 1) + 1) % 1;
            slot = ph < 0.05 ? SLOT.FRONT : ph < 0.42 ? SLOT.DEP : ph < 0.55 ? SLOT.REP0 + 1 : -1;
          } else {
            for (let k = ai; k >= 0 && k >= ai - 1; k--) {
              const a = c.ATR[k];
              const act = a.t + wave.aAct[i];
              const s = cellSlot(t, act, act + 0.22, false, weakA);
              if (s >= 0) {
                slot = s;
                break;
              }
            }
          }
        } else {
          for (let k = vi; k >= 0 && k >= vi - 1; k--) {
            const b = c.BEATS[k];
            const act = b.t + wave.vAct[i];
            const rw = repWin(b);
            const fr = wave.secondary ? wave.vFrac[i] : 1 - wave.vFrac[i];
            const rep = b.t + rw[0] + fr * (rw[1] - rw[0]);
            const inj = !!wave.inj[i] && t - b.t > b.D * 0.6;
            const s = cellSlot(t, act, rep, inj, weakV);
            if (s >= 0) {
              slot = s;
              break;
            }
          }
          if (slot < 0 && wave.inj[i]) slot = SLOT.INREST;
        }
        if (slot < 0) slot = SLOT.REST;
        if (slots[i] === slot) continue;
        slots[i] = slot;
        dirty = true;
        const o = i * 3;
        const p = slot * 3;
        const k = shade[i];
        buf[o] = pal[p] * k;
        buf[o + 1] = pal[p + 1] * k;
        buf[o + 2] = pal[p + 2] * k;
      }
      if (dirty) colorAttr.needsUpdate = true;
    };

    const relWin = (t: number): number | null => {
      const vi = bsearch(c.BEATS, t);
      let b = c.BEATS[vi + 1] && c.BEATS[vi + 1].t - t < 0.25 ? c.BEATS[vi + 1] : c.BEATS[vi];
      if (vi >= 0 && t - c.BEATS[vi].t < c.BEATS[vi].D + 0.08) b = c.BEATS[vi];
      if (!b) return null;
      return t - b.t;
    };

    const hisR = HM.hisRel ?? [-0.035, 0];
    const vTiming: Record<string, [number, number]> = {};
    const clipV: Record<string, number> = {};
    {
      const k = wave.scale > 0 ? wave.scale : 0.2;
      const durOf = (n: string) => {
        const p = cond.pulses.find((q) => q.name === n);
        return p ? Math.max(0.006, p.dur * k) : 0.02;
      };
      vTiming.his = [hisR[0], Math.max(0.01, hisR[1] - hisR[0])];
      vTiming.rb = [hisR[1], durOf('rb')];
      vTiming.lbTrunk = [hisR[1], durOf('lbTrunk')];
      const lb = hisR[1] + durOf('lbTrunk');
      vTiming.laf = [lb, durOf('laf')];
      vTiming.lpf = [lb, durOf('lpf')];
      vTiming.lsf = [lb, durOf('lsf')];
      if (H.type === 'lbbb') {
        delete vTiming.laf;
        delete vTiming.lpf;
        delete vTiming.lsf;
      }
      if (H.type === 'rbbb') clipV.rb = 0.3;
      if (H.type === 'lbbb') clipV.lbTrunk = 0.45;
    }

    const pulseAt = (t: number) => {
      const vt = H.type === 'vt';
      const ai = c.ATR.length ? bsearch(c.ATR, t) : -1;
      const A = ai >= 0 ? c.ATR[ai] : null;
      const aRel = A ? t - A.t : null;
      let vRel = vt ? null : relWin(t);
      let virt = false;
      if (A && !A.beat && H.block === 'odnogi' && t - A.t < 0.5 && vRel == null) {
        vRel = t - (A.t + (c.cfg.pr ?? 160) / 1000);
        virt = true;
      }

      for (const p of cond.pulses) {
        let f = -1;
        if (p.group === 'A') {
          if (aRel != null && !af && !fl && !H.svt) f = aRel / (p.name === 'bach' ? HM.Pdur * 0.4 : Math.max(0.02, HM.avArr));
        } else if (p.group === 'V') {
          if (vRel != null) {
            const tm = vTiming[p.name];
            if (tm) f = Math.min((vRel - tm[0]) / tm[1], clipV[p.name] ?? 9);
          }
        } else if (p.name === 'kent') {
          if (aRel != null && A && A.beat && H.type === 'wpw') f = (t - A.t) / Math.max(0.04, A.beat.t - A.t);
          else if (H.svt === 'avrt') {
            const r = relWin(t);
            if (r != null && r >= 0.03 && r <= 0.12) f = 1 - (r - 0.03) / 0.09;
          }
        }
        const on = f >= 0 && f <= (virt ? 0.5 : 1.04);
        p.node.visible = on && !(virt && p.name !== 'his' && p.name !== 'lbTrunk');
        if (on) {
          const clipped = Math.max(0, Math.min(1, virt ? Math.min(f, 0.5) : f));
          const pt = p.curve.getPoint(clipped);
          p.node.position.set(pt.x, pt.y, pt.z);
          const pulse = 1 + 0.22 * Math.sin(t * 30);
          p.halo.scale.setScalar(pulse);
        }
      }

      let avOp = 0;
      let avF = 0;
      if (af || fl) {
        const vi = bsearch(c.BEATS, t);
        const b = c.BEATS[vi];
        if (b) {
          const s0 = b.t - 0.12;
          const s1 = b.t - 0.03;
          if (t > s0 && t < s1 + 0.04) {
            avF = (t - s0) / (s1 - s0);
            avOp = 1;
          }
        }
        if (!avOp) avOp = af ? (Math.sin(t * 2 * Math.PI * 7.3) > 0.6 ? 0.35 : 0) : (t * 5 + 0.15) % 1 < 0.15 ? 0.35 : 0;
      } else if (A && !H.dissoc) {
        const s0 = A.t + HM.avArr;
        if (A.beat) {
          const s1 = A.beat.t - 0.03;
          if (t >= s0 && t < s1 + 0.03 && s1 > s0) {
            avF = (t - s0) / (s1 - s0);
            avOp = 1;
          }
        } else if (H.block === 'odnogi') {
          const s1 = A.t + (c.cfg.pr ?? 160) / 1000 - 0.03;
          if (t >= s0 && t < s1 + 0.03 && s1 > s0) {
            avF = (t - s0) / (s1 - s0);
            avOp = 1;
          }
        } else if (H.block === 'avn') {
          if (t >= s0 && t < s0 + 0.45) {
            avF = Math.min(0.55, (t - s0) / 0.25);
            avOp = t < s0 + 0.12 ? 1 : 0.5;
          }
        }
      }
      if (H.svt === 'avnrt') {
        avOp = 1;
        avF = (((t * (c.cfg.hr ?? 180)) / 60) % 1 + 1) % 1;
      }
      const vr = H.type === 'vt' ? null : relWin(t);
      for (const tw of cond.twigs) {
        const tm = vTiming[tw.parent];
        const on = !!tm && !(tw.parent in clipV) && vr != null && vr >= tm[0] + tm[1] && vr < c.HM.D + 0.06;
        tw.mesh.material.emissiveIntensity = on ? 1.6 : 0;
      }
      cond.avHalo.material.opacity = avOp * (0.35 + 0.5 * Math.max(0, Math.min(1, avF)));
      cond.avn.material.emissiveIntensity = 0.35 + 1.6 * avOp;

      const saOn = A != null && t - A.t < 0.035 && !H.svt;
      cond.sa.material.emissiveIntensity = saOn ? 2.4 : 0.4;
      cond.sa.scale.setScalar(saOn ? 1.25 : 1);

      const v = ventState(c, t);
      const shot = !!v && (v.ph === 'ST' || v.ph === 'T');
      for (const a of cond.arrows) a.visible = shot;

      if (cond.focusRing && H.svt) {
        const on = H.svt === 'avnrt' ? true : !!A && t - A.t > -0.02 && t - A.t < 0.06;
        const k = H.svt === 'avnrt' ? 1.1 + 0.12 * Math.sin(t * 2 * Math.PI * ((c.cfg.hr ?? 180) / 60)) : on ? 1.3 : 1;
        cond.focusRing.scale.setScalar(k);
        cond.focusRing.material.emissiveIntensity = on ? 2.2 : 0.7;
      } else if (cond.focusRing) {
        const vi = bsearch(c.BEATS, t);
        const bb = c.BEATS[vi];
        const on = bb ? t - bb.t > -0.05 && t - bb.t < 0.09 : false;
        cond.focusRing.scale.setScalar(on ? 1.22 : 1);
        cond.focusRing.material.emissiveIntensity = on ? 2.2 : 0.7;
      }
    };

    let raf = 0;
    let last = performance.now();
    const render = () => {
      renderer.render(scene, camera);
    };
    const controls = new Orbit(canvas, camera, mesh.radius * 3.35, () => {
      controls.update(0);
      render();
    });

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      controls.update(dt);
      render();
    };

    const off = clock.onFrame((t) => {
      paint(t);
      pulseAt(t);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    });

    const ro = new ResizeObserver(() => {
      const nw = host.clientWidth || w;
      const nh = height;
      if (nw < 8) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(nw, nh, false);
      render();
    });
    ro.observe(host);

    paint(clock.tRef.current);
      pulseAt(clock.tRef.current);
    render();

    return () => {
      off();
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      cond.dispose();
      mesh.dispose();
      disposables.forEach((d) => d.dispose());
      labels.forEach((sp) => {
        sp.material.map?.dispose();
        sp.material.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
  }, [caseData, clock, height]);

  if (fallback)
    return (
      <div className="atlas-3d-fallback" style={{ minHeight: height }} role="status">
        <b>Widok 3D niedostępny</b>
        <span>{fallback}</span>
      </div>
    );

  return <div className="atlas-3d" ref={hostRef} style={{ height }} />;
}
