import type { Computed } from '../compute';
import type { HeartHandles, Ov } from './Heart2D';
import { bsearch, ventState } from '../clock';
import { COL, REP } from '../../data/phases';

export function setOv(o: Ov | undefined | null, f: number, op: number) {
  if (!o) return;
  f = Math.max(0, Math.min(1, f));
  if (Math.abs(f - o.f) > 0.002) {
    o.el.setAttribute('stroke-dashoffset', String(o.L * (1 - f)));
    o.f = f;
  }
  if (Math.abs(op - o.op) > 0.01) {
    o.el.setAttribute('opacity', String(op));
    o.op = op;
  }
}

export function fadeOp(t: number, tEnd: number): number {
  return t < tEnd ? 1 : Math.max(0, 1 - (t - tEnd) / 0.12);
}

export function cellColor(t: number, act: number, rep: number, inj: boolean, weak: boolean): string | null {
  if (t < act) return null;
  if (t < act + 0.012) return COL.front;
  if (t < rep) return inj ? COL.inj : weak ? COL.weak : COL.dep;
  const k = Math.floor((t - rep) / 0.012);
  return k < REP.length ? REP[k] : null;
}

export function renderHeart(c: Computed, h: HeartHandles, t: number) {
  const H = c.heart;
  const HM = c.HM;
  const G = HM.G;
  const cells = G.cells;
  const OV = h.OV;
  const af = H.atria === 'af';
  const fl = H.atria === 'flutter';
  const ai = c.ATR.length ? bsearch(c.ATR, t) : -1;
  const vi = bsearch(c.BEATS, t);
  const repWin = (b: { stEnd: number; tEnd: number }): [number, number] => {
    const narrow = H.hyperK;
    const a0 = b.stEnd + (narrow ? 0.02 : 0.03);
    const a1 = b.tEnd - (narrow ? 0.015 : 0.03);
    return [a0, a1];
  };

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    let col: string | null = null;
    if (cell.r === 'A') {
      if (af) {
        const p =
          Math.sin(0.09 * cell.x + 2 * Math.PI * 5.3 * t) +
          Math.sin(0.11 * cell.y - 2 * Math.PI * 6.7 * t + 1) +
          Math.sin(0.07 * (cell.x - cell.y) + 2 * Math.PI * 4.1 * t + 2);
        col = p > 1.45 ? COL.front : p > 0.95 ? COL.dep : p > 0.6 ? REP[1] : null;
      } else if (fl) {
        const fr = 300 / 60;
        let ph: number;
        if (!cell.la) {
          const th = Math.atan2((cell.y - 150) / 30, (cell.x - 150) / 44);
          ph = (((th / (2 * Math.PI) + fr * t) % 1) + 1) % 1;
        } else ph = (((fr * t - 0.35 - ((cell.x - 206) / 140) * 0.3) % 1) + 1) % 1;
        col = ph < 0.05 ? COL.front : ph < 0.42 ? COL.dep : ph < 0.55 ? REP[1] : null;
      } else {
        for (let k = ai; k >= 0 && k >= ai - 1; k--) {
          const a = c.ATR[k];
          const act = a.t + HM.aAct[i];
          const cc = cellColor(t, act, act + 0.22, false, !!H.hyperK);
          if (cc) {
            col = cc;
            break;
          }
        }
      }
    } else {
      for (let k = vi; k >= 0 && k >= vi - 1; k--) {
        const b = c.BEATS[k];
        const act = b.t + HM.vAct[i];
        const [r0, r1] = repWin(b);
        const fr = HM.secondary ? HM.vFrac[i] : 1 - HM.vFrac[i];
        const rep = b.t + r0 + fr * (r1 - r0);
        const inj = HM.inj[i] && t - b.t > b.D * 0.6;
        const cc = cellColor(t, act, rep, !!inj, false);
        if (cc) {
          col = cc;
          break;
        }
      }
      if (!col && HM.inj[i]) col = COL.injRest;
    }
    col = col || COL.rest;
    if (h.cellCol[i] !== col) {
      h.cellEls[i].setAttribute('fill', col);
      h.cellCol[i] = col;
    }
  }

  const A = ai >= 0 ? c.ATR[ai] : null;

  const saOn = A && t - A.t < 0.035 && !H.svt;
  h.sa.setAttribute('fill', saOn ? '#ffd400' : '#2f6f6a');
  h.sa.setAttribute('filter', saOn ? 'url(#glow)' : '');
  if (A && !af && !fl && !H.svt) {
    setOv(OV.bach, (t - A.t) / (HM.Pdur * 0.4), fadeOp(t, A.t + HM.Pdur * 0.6));
    setOv(OV.inter, (t - A.t) / HM.avArr, fadeOp(t, A.t + HM.Pdur * 0.6));
  } else {
    setOv(OV.bach, 0, 0);
    setOv(OV.inter, 0, 0);
  }

  let b = c.BEATS[vi + 1] && c.BEATS[vi + 1].t - t < 0.25 ? c.BEATS[vi + 1] : c.BEATS[vi];
  if (vi >= 0 && t - c.BEATS[vi].t < c.BEATS[vi].D + 0.08) b = c.BEATS[vi];

  let virt: { t: number } | null = null;
  if (A && !A.beat && H.block === 'odnogi' && t - A.t < 0.5) virt = { t: A.t + (c.cfg.pr ?? 160) / 1000 };
  const rel = virt ? t - virt.t : b ? t - b.t : 99;
  const hisR = HM.hisRel;
  let xPos: [number, number] | null = null;
  let xOn = false;
  const vt = H.type === 'vt';
  if (hisR && !vt && rel > hisR[0] - 0.01 && rel < 0.45) {
    const fH = (rel - hisR[0]) / (hisR[1] - hisR[0]);
    const endT = virt ? hisR[1] + 0.08 : b.D;
    setOv(OV.his, fH, fadeOp(rel, endT));
    for (const br of HM.vm.branches) {
      const t0 = ((br.t0 - HM.vm.mn) * HM.k) / 1000;
      const dur = (br.L / br.v) * HM.k / 1000;
      let f = (rel - t0) / dur;
      let op = fadeOp(rel, b ? b.D : 0.1);
      if (virt) {
        f = br.name === 'lbTrunk' ? Math.min(f, 0.45) : 0;
        op = fadeOp(rel, hisR[1] + 0.12);
        if (br.name === 'lbTrunk' && rel > hisR[1]) {
          xPos = [218, 228];
          xOn = rel < hisR[1] + 0.35;
        }
      }
      setOv(OV[br.name], f, op);
    }
    for (const tw of h.twigs) {
      const br = HM.vm.branches.find((x) => x.name === tw.name);
      let on = 0;
      if (br && !virt) {
        const tt = ((br.t0 + tw.s / br.v - HM.vm.mn) * HM.k) / 1000;
        on = rel > tt && rel < b.D + 0.1 ? 1 : 0;
      }
      tw.el.setAttribute('opacity', String(on));
    }
  } else {
    setOv(OV.his, 0, 0);
    for (const n of ['rb', 'lbTrunk', 'laf', 'lpf']) setOv(OV[n], 0, 0);
    for (const tw of h.twigs) tw.el.setAttribute('opacity', '0');
  }

  let avF = 0;
  let avOp = 0;
  if (af || fl) {
    if (b && hisR) {
      const s0 = b.t + hisR[0] - 0.09;
      const s1 = b.t + hisR[0];
      if (t > s0 && t < s1 + 0.04) {
        avF = (t - s0) / (s1 - s0);
        avOp = 1;
      }
    }
    if (!avOp) avOp = af ? (Math.sin(t * 2 * Math.PI * 7.3) > 0.6 ? 0.35 : 0) : (t * 5 + 0.15) % 1 < 0.15 ? 0.35 : 0;
  } else if (H.svt === 'avnrt') {
    const ph = b ? (t - b.t) * 60 / Math.max(60, c.cfg.hr ?? 180) : 0;
    avF = ((((t * (c.cfg.hr ?? 180)) / 60) % 1) + 1) % 1;
    avOp = 0.75 + 0.25 * Math.cos(ph * 6.283);
  } else if (A && !H.dissoc) {
    const s0 = A.t + HM.avArr;
    if (A.beat && hisR) {
      const s1 = A.beat.t + hisR[0];
      if (t >= s0 && t < s1 + 0.03) {
        avF = (t - s0) / (s1 - s0);
        avOp = 1;
      }
    } else if (!A.beat && H.block === 'odnogi') {
      const s1 = A.t + (c.cfg.pr ?? 160) / 1000 + (hisR ? hisR[0] : 0);
      if (t >= s0 && t < s1 + 0.03) {
        avF = (t - s0) / (s1 - s0);
        avOp = 1;
      }
    } else if (!A.beat && H.block === 'avn') {
      if (t >= s0 && t < s0 + 0.45) {
        avF = Math.min(0.55, (t - s0) / 0.25);
        avOp = t < s0 + 0.12 ? 1 : 0.5;
        if (t > s0 + 0.12) {
          xPos = [200, 157];
          xOn = true;
        }
      }
    }
  }

  if (H.svt === 'avrt' && b) {
    setOv(OV.kent, (t - b.t - 0.03) / 0.09, fadeOp(t, b.t + 0.18));
  } else if (H.type === 'wpw' && A && A.beat) {
    const s0 = A.t + HM.kentArr;
    setOv(OV.kent, (t - s0) / (A.beat.t - s0), fadeOp(t, A.beat.t + 0.06));
  } else if (OV.kent) setOv(OV.kent, 0, 0);

  h.avn.setAttribute('opacity', String(avOp));
  h.avBar.setAttribute('width', String(18 * Math.max(0, Math.min(1, avF)) * (avOp ? 1 : 0)));
  if (xOn && xPos) {
    h.x.setAttribute('transform', `translate(${xPos[0]},${xPos[1]})`);
    h.x.setAttribute('opacity', '1');
  } else h.x.setAttribute('opacity', '0');

  if (H.svt === 'at') {
    const on = !!A && t - A.t > -0.02 && t - A.t < 0.06;
    h.ring.setAttribute('opacity', on ? '1' : '0.35');
    h.ring.setAttribute('r', on ? '13' : '10');
  }
  if (H.svt === 'avnrt') {
    h.ring.setAttribute('opacity', '1');
    h.ring.setAttribute('r', String(13 + 2 * Math.sin(t * 2 * Math.PI * ((c.cfg.hr ?? 180) / 60))));
  }
    if (H.escape || vt) {
    const bb = c.BEATS[vi + 1] && c.BEATS[vi + 1].t - t < 0.06 ? c.BEATS[vi + 1] : c.BEATS[vi];
    const r = bb ? t - bb.t : 9;
    const st = vt || !hisR ? 0 : hisR[0];
    const on = r > st - 0.04 && r < st + 0.06;
    h.ring.setAttribute('opacity', on ? '1' : '0.35');
    h.ring.setAttribute('r', on ? '13' : '10');
  }

  if (h.fl) h.fl.setAttribute('stroke-dashoffset', String(((t * 5) % 1) * 276));

  if (h.inj) {
    const v = ventState(c, t);
    h.inj.setAttribute('opacity', v && (v.ph === 'ST' || v.ph === 'T') ? '1' : '0.15');
  }
}
