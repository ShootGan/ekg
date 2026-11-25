import { create, NAMES } from '../model/ecg';
import type { Atr, ECGConfig, Ev, Measure, Morph } from '../model/ecg';
import { PRZYPADKI, type Case } from '../data/przypadki';
import { lcg, mulberry32 } from './rng';
import type { Mark } from '../components/EcgPrint';

export interface Rozp {
  id: string;
  kat: string;
  t: string;
}

export interface Envelope {
  nr: string;
  wiek: number;
  plec: 'K' | 'M';
  data: string;
  godz: string;
  kontekst: string;
  ecg: Record<string, unknown>;
  seed: number;
  wzorzec: string | null;
  rozp: Rozp[];
}

export interface Multi {
  req: string[];
  ok: string[];
}

export interface LeadsKey {
  stUp: Multi;
  stDn: Multi;
  tNeg: Multi;
  q: Multi;
  [k: string]: Multi;
}

export interface Klucz {
  leads: LeadsKey;
  rytm: string[];
  miar: string[];
  dod: Multi;
  hr: number | null;
  ha: number | null;
  os: string[];
  osDeg: number | null;
  P: Multi;
  sa: string[];
  av: string[];
  iv: Multi;
  pr: number | null;
  qrs: number | null;
  qt: number | null;
  qtc: number | null;
  qtK: string[];
  morf: Multi;
  stF: Multi;
  T: Multi;
}

export interface KeyJson {
  nr: string;
  id: string;
  rozpoznanie: string;
  elementy: string[];
  pulapki: string[];
  postepowanie: string;
  pomiary: string;
  klucz: Klucz;
  zaznaczenia: Mark[];
}

export interface GenerateResult {
  EX: Envelope;
  key: KeyJson;
  M: Measure;
  auto: string[];
  kroki: string;
}

export interface GenerateOpts {
  seed: number;
  poziom?: 1 | 2 | 3;
  kat?: string;
  id?: string;
  bezKontekstu?: boolean;
  excludeIds?: string[];
}

type Ecg = ECGConfig & { avN?: number };

const RYTM: Record<string, string> = {
  af: 'migotanie przedsionków – niemiarowość zupełna',
  flutter: 'trzepotanie przedsionków',
  junctional: 'rytm węzłowy (z łącza AV)',
  svt: 'częstoskurcz nadkomorowy – miarowy',
  vt: 'częstoskurcz komorowy – miarowy, szerokie QRS',
  tdp: 'polimorficzny częstoskurcz komorowy',
  vf: 'migotanie komór',
};

const AVLAB: Record<string, string> = {
  '1': 'blok AV I°',
  wenckebach: 'blok AV II° Mobitz I',
  mobitz2: 'blok AV II° Mobitz II',
  '2:1': 'blok AV II° 2:1',
  '3': 'blok AV III° (dysocjacja)',
};

const SALAB: Record<string, string> = {
  '2': 'blok zatokowo-przedsionkowy II° typu II – pauza dokładnie 2× PP, w pauzie brak P',
  wenckebach: 'blok zatokowo-przedsionkowy II° typu I – PP skraca się, potem pauza krótsza niż 2× PP',
  arrest: 'zahamowanie zatokowe – pauza bez P, niebędąca wielokrotnością PP',
};

const QLEADS: Record<string, string[]> = {
  inferior: ['II', 'III', 'aVF'],
  anterior: ['V1', 'V2', 'V3', 'V4'],
  anteroseptal: ['V1', 'V2', 'V3'],
  anterolateral: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'I', 'aVL'],
  lateral: ['I', 'aVL', 'V5', 'V6'],
  high_lateral: ['I', 'aVL'],
};

const RYTMK: Record<string, string> = { af: 'af', flutter: 'flutter', junctional: 'wezlowy', svt: 'svt', vt: 'vt', tdp: 'tdp', vf: 'vf' };
const SAK: Record<string, string> = { '2': 'sa2', wenckebach: 'sa1', arrest: 'zahamowanie' };
const AVK: Record<string, string> = { '1': 'av1', wenckebach: 'wenck', mobitz2: 'mob2', '2:1': '21', '3': 'av3' };
const COLS = [['I', 'II', 'III'], ['aVR', 'aVL', 'aVF'], ['V1', 'V2', 'V3'], ['V4', 'V5', 'V6']];

export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 2147483646);
}

export function listaRozpoznan(): Rozp[] {
  const seen = new Set<string>();
  const out: Rozp[] = [];
  for (const p of PRZYPADKI) {
    if (!p.rozpoznanie || seen.has(p.rozpoznanie)) continue;
    seen.add(p.rozpoznanie);
    out.push({ id: p.id, kat: p.kat, t: p.rozpoznanie });
  }
  return out;
}

export function generateCase(opts: GenerateOpts): GenerateResult {
  const SEED = Math.floor(opts.seed);
  const rnd = lcg(SEED);
  const jit = (v: number, f: number) => v * (1 + (rnd() * 2 - 1) * f);

  let pula: Case[] = PRZYPADKI.slice();
  if (opts.id) pula = pula.filter((p) => p.id === opts.id);
  else {
    if (opts.poziom) pula = pula.filter((p) => p.poziom === opts.poziom);
    if (opts.kat) pula = pula.filter((p) => p.kat === opts.kat);
    if (opts.excludeIds && opts.excludeIds.length) {
      const last = new Set(opts.excludeIds.slice(-12));
      const swieze = pula.filter((p) => !last.has(p.id));
      if (swieze.length) pula = swieze;
    }
  }
  if (!pula.length) throw new Error('Brak przypadków dla podanych filtrów.');

  const weight = (p: Case) =>
    (opts.poziom || opts.id ? 1 : { 1: 3, 2: 3, 3: 2 }[p.poziom]);
  let pick = rnd() * pula.reduce((a, p) => a + weight(p), 0);
  let P = pula[0];
  for (const p of pula) {
    pick -= weight(p);
    if (pick < 0) {
      P = p;
      break;
    }
  }

  const e = JSON.parse(JSON.stringify(P.ecg)) as Ecg;
  if (e.rhythm === 'flutter') {
    const ratio = (e.atrialRate ?? 0) / (e.hr ?? 1);
    e.atrialRate = Math.round(jit(e.atrialRate ?? 0, 0.06));
    e.hr = Math.round((e.atrialRate ?? 0) / ratio);
  } else if (e.av === 3) {
    e.atrialRate = Math.round(jit(e.atrialRate ?? 0, 0.08));
    e.hr = Math.round(jit(e.hr ?? 0, 0.08));
  } else if (e.atrialRate) e.atrialRate = Math.round(jit(e.atrialRate, 0.07));
  else if (e.hr && !['vf', 'asystole'].includes(e.rhythm ?? '')) e.hr = Math.round(jit(e.hr, 0.07));
  if (e.bbb !== 'L' && !['vt', 'tdp', 'vf', 'asystole'].includes(e.rhythm ?? ''))
    e.axis = Math.round((e.axis ?? 60) + (rnd() * 2 - 1) * (P.kat === 'os' ? 4 : 8));
  if (e.stAmp) e.stAmp = Math.max(0.1, Math.round(jit(e.stAmp, 0.18) * 100) / 100);
  const pageSeed = Math.floor(rnd() * 2147483647);

  const G = create();
  G.config(e);
  const S = G.scheduler();
  G.schedule(S, { t0: -1.5, rand: mulberry32(pageSeed) }, 11.5);
  const M = G.measure(S, [0, 10], null);
  const auto = G.interpret(M, null);

  const r = e.rhythm as string;
  const sinus = ['sinus', 'pea'].includes(r);
  const wide = ['vt', 'tdp', 'vf', 'asystole'].includes(r);
  const sec = !!(e.lvh || e.rvh || e.bbb === 'L' || e.bbb === 'R' || e.wpw);
  const mainKind = (RYTMK[r] === 'vt' ? 'vt' : RYTMK[r] === 'tdp' ? 'tdp' : null) as string | null;

  const evN = S.ev.filter((v) => v.t > 0.15 && v.t < 9.7);
  const beatIn = (t0: number, t1: number, kinds?: string[]) =>
    S.ev.find((v) => v.t >= t0 && v.t <= t1 && (!kinds || kinds.includes(v.k)));
  const morphOf = (v: Ev): Morph => G.morph(v.k, v.rr || 0.8);
  const colOf = (n: string) => COLS.findIndex((x) => x.includes(n));

  function tAmpIn(n: string): number {
    const c = colOf(n);
    const v = beatIn(c * 2.5 + 0.1, c * 2.5 + 1.9, mainKind ? [mainKind] : ['n', 'e']) || evN[1] || evN[0];
    if (!v) return 0;
    const m = morphOf(v);
    return G.lead(n, v.t + m.tp, S, { clean: true }) - G.lead(n, v.t - 0.015, S, { clean: true });
  }

  function qtBeat(): Ev | null {
    const sv = evN.filter((v) => v.t > 0.4 && v.t < 9.4);
    const ok = (v: Ev) => v.k === (mainKind ?? 'n') || v.k === 'e';
    const vq = sv.find(ok);
    if (!vq) return null;
    const vq2 = sv.filter((v) => v.t > vq.t + 2.4 && ok(v))[0] || vq;
    return sv.filter((v) => v.t > vq2.t + 1.6 && ok(v))[0] || vq2;
  }

  function kluczStrukt(): Klucz {
    const K: Klucz = {
      leads: { stUp: { req: [], ok: [] }, stDn: { req: [], ok: [] }, tNeg: { req: [], ok: [] }, q: { req: [], ok: [] } },
      rytm: [], miar: [], dod: { req: [], ok: [] }, hr: null, ha: null, os: [], osDeg: null,
      P: { req: [], ok: [] }, sa: [], av: [], iv: { req: [], ok: [] },
      pr: null, qrs: null, qt: null, qtc: null, qtK: [], morf: { req: [], ok: [] }, stF: { req: [], ok: [] }, T: { req: [], ok: [] },
    };
    K.rytm = r === 'asystole' ? (e.atrialRate ? ['zatrzymanie'] : ['asystolia']) : sinus ? ['zatokowy'] : [RYTMK[r] || r];
    if (r === 'tdp') K.rytm.push('vt');
    const drops = ['wenckebach', 'mobitz2'].includes(String(e.av ?? '')) || !!e.sa;
    K.miar = ['vf', 'asystole'].includes(r) ? [] : ['af', 'tdp'].includes(r) ? ['zupelnie'] : drops || e.pvc || e.pac || (e.sinArr || 0) >= 0.08 ? ['niemiarowy'] : ['miarowy'];
    if (e.pvc || e.pac) K.miar.push('miarowy');
    K.dod = { req: [e.pvc && 'pvc', e.pac && 'pac', (e.sinArr || 0) >= 0.08 && 'niemiar'].filter((x): x is string => !!x), ok: drops ? ['pauzy'] : [] };

    K.hr = M.hr ?? null;
    K.ha = (e.av && e.av !== 1) || r === 'flutter' || (r === 'asystole' && e.atrialRate)
      ? Math.round(e.atrialRate || (e.av === 3 ? 80 : (M.hr ?? 0) * (e.avN || 2) / ((e.avN || 2) - 1)))
      : null;
    if (e.av === 'wenckebach' || e.av === 'mobitz2' || e.av === '2:1')
      K.ha = Math.round(e.atrialRate || ((M.hr ?? 0) * (e.av === '2:1' ? 2 : (e.avRatio || (e.av === 'wenckebach' ? 4 : 3)) / ((e.avRatio || (e.av === 'wenckebach' ? 4 : 3)) - 1))));

    const ax = M.qrsAx;
    const cat = (a: number): string => (a < -30 ? 'L' : a <= 90 ? 'N' : a <= 180 ? 'P' : 'X');
    K.os = ax == null || ['vf', 'asystole'].includes(r) ? [] : [cat(ax)];
    if (ax != null && K.os.length) for (const d of [-8, 8]) if (!K.os.includes(cat(ax + d))) K.os.push(cat(ax + d));
    if (ax != null && (ax > 170 || ax < -150)) K.os.push('X', 'P');
    K.osDeg = ax;

    K.P = r === 'af'
      ? { req: ['f'], ok: ['brak'] }
      : r === 'flutter'
        ? { req: ['F'], ok: ['brak'] }
        : ['junctional', 'svt'].includes(r)
          ? { req: ['brak'], ok: [] }
          : ['vt', 'tdp', 'vf'].includes(r)
            ? { req: [], ok: ['brak', 'dysoc'] }
            : r === 'asystole'
              ? { req: e.atrialRate ? ['dysoc'] : ['brak'], ok: ['norm'] }
              : { req: [e.pType === 'pulmonale' ? 'pulm' : e.pType === 'mitrale' ? 'mitr' : (e.pAmp ?? 1) < 0.5 ? 'plaskie' : 'norm'], ok: [] };
    if (e.av === 3) K.P.req.push('dysoc');

    K.sa = sinus ? [SAK[String(e.sa)] || 'brak'] : [];
    if (e.sa === 'wenckebach') K.sa.push('zahamowanie');
    if (e.sa === 2) K.sa.push('sa1');
    K.av = sinus || (r === 'asystole' && e.atrialRate) ? [AVK[String(e.av)] || 'brak'] : [];
    if (e.av === '2:1') K.av.push('mob2', 'wenck');
    if (r === 'asystole' && e.atrialRate) K.av = ['av3', 'brak'];
    const iv: Multi = { req: [], ok: [] };
    if (e.bbb === 'L') iv.req.push('LBBB');
    if (e.bbb === 'R') iv.req.push('RBBB');
    if (e.bbb === 'iR') iv.req.push('iRBBB');
    if (e.wpw) iv.req.push('WPW');
    if (!e.bbb && !e.wpw && sinus && (M.qrs ?? 0) >= 120) iv.req.push('IVCD');
    if (e.av === 3 && (M.qrs ?? 0) >= 120) {
      iv.ok.push('IVCD', 'LBBB', 'RBBB');
      iv.req = [];
    }
    if (!wide && !e.bbb && ax != null && ax < -45) iv.ok.push('LAFB');
    if (!wide && !e.bbb && ax != null && ax > 100) iv.ok.push('LPFB');
    if (e.bbb === 'R' && ax != null && ax < -45) iv.req.push('LAFB');
    if (e.wpw) iv.ok.push('IVCD');
    K.iv = iv;

    K.pr = M.pr ?? null;
    K.qrs = wide && r !== 'vt' ? null : M.qrs ?? null;
    K.qt = wide ? null : M.qt ?? null;
    K.qtc = wide ? null : M.qtc ?? null;
    const qb = qtBeat();
    if (qb && K.qt != null) {
      const mq = morphOf(qb);
      K.qt = Math.round(mq.qt * 1000);
      K.qtc = Math.round(mq.qt * 1000 / Math.sqrt(qb.rr || 60 / (M.hr ?? 60)));
    }
    if (r === 'af' || (M.hr || 0) > 120) K.qt = K.qtc = null;
    K.qtK = K.qtc == null ? [] : [K.qtc > 460 ? 'dl' : K.qtc < 350 ? 'kr' : 'N'];
    if (K.qtc != null && K.qtc >= 445 && K.qtc <= 480) K.qtK.push(K.qtK[0] === 'dl' ? 'N' : 'dl');
    if ((M.qrs ?? 0) >= 120 && K.qtK[0] === 'dl') K.qtK.push('N');

    const mf: Multi = { req: [], ok: [] };
    if (e.lvh) mf.req.push('lvh');
    if (e.rvh) mf.req.push('rvh');
    if ((e.voltage ?? 1) < 0.5) mf.req.push('niski');
    if (e.jAmp) mf.req.push('fJ');
    if (e.s1q3t3) (e.s1q3t3 === true ? mf.req : mf.ok).push('s1q3t3');
    if (e.brugada) mf.req.push('brugada');
    if (e.helmet) mf.req.push('helmet');
    if (e.stemi === 'pericarditis' || e.pericarditis) mf.ok.push('prObn');
    if (['anterior', 'anteroseptal'].includes(e.qWave ?? '') || e.bbb === 'L') mf.ok.push('slabaR');
    if (e.bbb === 'R' && e.rvh == null) mf.ok.push('rvh');
    K.morf = mf;

    const up: Multi = { req: [], ok: [] };
    const dn: Multi = { req: [], ok: [] };
    for (const n of NAMES) {
      const v = (M.st || {})[n];
      if (v == null) continue;
      const th = n === 'V2' || n === 'V3' ? 0.2 : 0.1;
      if (v >= th) up.req.push(n);
      else if (v >= 0.05) up.ok.push(n);
      if (v <= -0.1) dn.req.push(n);
      else if (v <= -0.05) dn.ok.push(n);
    }
    if (e.hyperacute) up.ok.push('V2', 'V3', 'V4');
    if (e.bbb === 'L' || e.bbb === 'R' || e.lvh || e.rvh || e.wpw) {
      for (const n of NAMES) {
        if (!up.req.includes(n)) up.ok.push(n);
        if (!dn.req.includes(n)) dn.ok.push(n);
      }
    }
    K.leads.stUp = up;
    K.leads.stDn = dn;
    K.stF = { req: e.stemi === 'pericarditis' || e.pericarditis ? ['rozlane'] : [], ok: sec ? ['wtorne'] : [] };

    const tn: Multi = { req: [], ok: [] };
    if (!['vf', 'asystole'].includes(r))
      for (const n of NAMES) {
        const a = tAmpIn(n);
        if (a <= -0.1 && !['aVR', 'III', 'V1'].includes(n)) tn.req.push(n);
        else if (a <= -0.03 || ['aVR', 'III', 'V1'].includes(n)) tn.ok.push(n);
      }
    K.leads.tNeg = tn;
    const T: Multi = { req: [], ok: [] };
    if ((e.tAmp ?? 1) >= 1.5) T.req.push('szpicz');
    if (e.hyperacute) T.req.push('hiper');
    if (e.uAmp) T.req.push('U');
    if ((e.tAmp ?? 1) < 0.6) (e.uAmp ? T.ok : T.req).push('plaskie');
    if (sec) T.ok.push('wtorne');
    if (!T.req.length && !tn.req.length && !wide) T.ok.push('norm');
    if (wide) T.ok.push('wtorne', 'norm');
    K.T = T;
    K.leads.q = {
      req: e.qWave && QLEADS[e.qWave] ? QLEADS[e.qWave].slice() : [],
      ok: ['III', 'aVR', 'V1'].concat(e.bbb === 'L' ? ['V2', 'V3'] : []).concat(e.lvh ? ['V1', 'V2'] : []),
    };

    for (const k in P.klucz || {}) {
      if (k === 'leads') Object.assign(K.leads, P.klucz!.leads);
      else (K as unknown as Record<string, unknown>)[k] = P.klucz![k];
    }
    return K;
  }

  function zaznaczenia(K: Klucz): Mark[] {
    const Z: Mark[] = [];
    const add = (pole: string, n: string, t0: number, t1: number, txt: string, c: string[], m?: string) =>
      Z.push({ pole, n, t0: +t0.toFixed(3), t1: +t1.toFixed(3), txt, c, ...(m ? { m } : {}) });
    const typical = () => (mainKind ? [mainKind] : ['n', 'e']);
    const beatLead = (n: string, kinds?: string[]) => {
      const c = colOf(n);
      return beatIn(c * 2.5 + 0.08, c * 2.5 + 2.5 - 0.65, kinds || typical()) || beatIn(c * 2.5 + 0.05, c * 2.5 + 2.2);
    };
    const beatAfter = (n: string, off: number) => {
      const c = colOf(n);
      return beatIn(c * 2.5 + off, c * 2.5 + 2.5 - 0.65, typical());
    };
    const atr = S.atr.filter((a: Atr) => a.t > 0.05 && a.t < 9.8);
    const ms = (x: number) => Math.round(x * 1000);
    const mm = (mv: number) => Math.round(Math.abs(mv) * 10);
    const lvl = (n: string, t: number) => G.lead(n, t, S, { clean: true });
    const qrsRange = (n: string, v: Ev) => {
      const D = morphOf(v).D, b = lvl(n, v.t - 0.015);
      let hi = 0, lo = 0, ar = 0;
      for (let t = 0; t <= D; t += 0.002) {
        const d = lvl(n, v.t + t) - b;
        if (d > hi) hi = d;
        if (d < lo) lo = d;
        ar += d;
      }
      return { hi, lo, ar, D };
    };
    const tAmpAt = (n: string, v: Ev) => lvl(n, v.t + morphOf(v).tp) - lvl(n, v.t - 0.015);
    const isBlock = e.av === 'wenckebach' || e.av === 'mobitz2' || e.av === '2:1';
    const conducted = (a: Atr) => S.ev.find((v) => v.t - a.t > 0.06 && v.t - a.t < 0.5 && v.k === 'n');
    const rstr = (s: string) => s.replace('.', ',');

    const sv = evN.filter((v) => v.t > 0.4 && v.t < 9.4);
    if (sv.length >= 3 && !['vf', 'asystole'].includes(r)) {
      const a = sv[1], b = sv[2], c3 = sv[3];
      add('czest', 'pasek', a.t, b.t, `RR ${ms(b.t - a.t)} ms ≈ ${Math.round(60 / (b.t - a.t))}/min`, ['czest', 'rytm']);
      if (c3 && (r === 'af' || r === 'tdp' || e.pvc || e.pac || e.sa || (e.sinArr || 0) >= 0.08))
        add('rytm', 'pasek', b.t, c3.t, `RR ${ms(c3.t - b.t)} ms – ${Math.abs(c3.t - b.t - (b.t - a.t)) > 0.08 ? 'inny' : 'podobny'}`, ['rytm']);
    }
    if (r === 'af') {
      const v = sv[2];
      if (v) add('P', 'pasek', v.t - 0.5, v.t - 0.05, 'fale f, brak P', ['P', 'fF']);
      const vb = beatAfter('V1', 0.55);
      if (vb) add('P', 'V1', vb.t - 0.5, vb.t - 0.05, 'fale f', ['P', 'fF']);
    }
    if (r === 'flutter') {
      const v = sv[2];
      const rate = Math.round(e.atrialRate || 300);
      const ratio = Math.max(1, Math.round(rate / (M.hr || rate)));
      if (v) add('P', 'pasek', v.t - 0.6, v.t, `fale F (piła) ~${rate}/min`, ['P', 'fF', 'czest']);
      if (sv[1] && sv[2]) add('P', 'pasek', sv[1].t, sv[2].t, `${ratio}:1 – ${ratio} fale F na 1 QRS`, ['przew', 'fF']);
      for (const n of ['III', 'aVF']) {
        const vb = beatAfter(n, 0.7);
        if (vb) add('P', n, vb.t - 0.6, vb.t, 'fale F', ['P', 'fF']);
      }
    }
    if (['junctional', 'svt', 'vt', 'tdp'].includes(r)) {
      const v = sv[2];
      if (v) add('P', 'pasek', v.t - 0.24, v.t - 0.02, r === 'junctional' || r === 'svt' ? 'brak P przed QRS' : 'brak widocznych P', ['P', 'dysoc']);
    }
    if (r === 'vt' && sv[1] && sv[2]) add('rytm', 'pasek', sv[1].t, sv[2].t + morphOf(sv[2]).D, 'QRS jednakowe (monomorficzny)', ['QRS', 'mono']);
    if (r === 'tdp' && sv[0]) {
      const end = sv.filter((v) => v.t < sv[0].t + 3.2).pop() ?? sv[0];
      add('rytm', 'pasek', sv[0].t, end.t + morphOf(end).D, 'amplituda QRS narasta i maleje', ['tdp', 'QRS']);
    }

    if (e.pvc) {
      const i = S.ev.findIndex((x) => x.k === 'v' && x.t > 0.5 && x.t < 9.3);
      const v = S.ev[i];
      if (v) {
        add('rytm', 'pasek', v.t, v.t + 0.16, 'PVC – szerokie, bez P', ['rytm', 'pvc', 'QRS', 'mono']);
        add('T', 'pasek', v.t + 0.2, v.t + 0.42, 'T przeciwne do QRS', ['T', 'pvc']);
        const prev = S.ev[i - 1], next = S.ev[i + 1];
        if (prev && next) add('rytm', 'pasek', v.t, next.t, `${ms(next.t - prev.t)} ms ≈ 2× RR – pauza wyrównawcza`, ['pauza', 'pvc']);
      }
    }
    if (e.pac) {
      const a = S.atr.find((x) => x.k === 'pac' && x.t > 0.3 && x.t < 9.5);
      if (a) {
        add('rytm', 'pasek', a.t - 0.02, a.t + 0.1, 'PAC – P przedwczesny', ['rytm', 'P', 'pac']);
        const v = S.ev.find((x) => x.t > a.t && x.t - a.t < 0.5);
        const i = v ? S.ev.indexOf(v) : -1;
        const prev = S.ev[i - 1], next = S.ev[i + 1];
        if (v && prev && next) {
          const rrs = sv.slice(1).map((x, k) => x.t - sv[k].t).sort((x, y) => x - y);
          const rr0 = rrs.length ? rrs[Math.floor(rrs.length / 2)] : 0;
          const full = rr0 > 0 && next.t - prev.t > 1.9 * rr0;
          add('rytm', 'pasek', v.t, next.t, `${ms(next.t - prev.t)} ms – pauza ${full ? 'pełna' : 'niepełna'}`, ['pauza', 'pac']);
        }
      }
    }

    const sinusLike = ['sinus', 'pea'].includes(r) || (r === 'asystole' && !!e.atrialRate);
    const a1 = atr.find((a) => a.k === 'a' && a.t > 0.3 && conducted(a));
    if (a1 && ['sinus', 'pea'].includes(r)) {
      const v = conducted(a1)!;
      add('P', 'pasek', a1.t - 0.01, a1.t + (e.pType === 'mitrale' ? 0.13 : 0.1), e.pType === 'pulmonale' ? 'P > 2,5 mm' : e.pType === 'mitrale' ? 'P ≥120 ms, dwugarbny' : 'P', ['P', 'rytm']);
      if (e.av !== 3 && !e.av) add('PR', 'pasek', a1.t, v.t, `PR ${ms(v.t - a1.t)} ms`, ['PR']);
      if (e.pType) {
        const leadsP = e.pType === 'pulmonale' ? ['III', 'aVF', 'V1'] : ['V1'];
        for (const n of leadsP) {
          const vb = beatAfter(n, 0.3);
          const ap = vb ? S.atr.filter((x) => x.t < vb.t && vb.t - x.t < 0.4).pop() : null;
          if (ap) add('P', n, ap.t - 0.01, ap.t + 0.13, n === 'V1' && e.pType === 'mitrale' ? 'P dwufazowy, ujemna końcówka' : e.pType === 'pulmonale' ? 'P > 2,5 mm' : 'P w V1', ['P']);
        }
      }
    }
    if (a1 && ['sinus', 'pea'].includes(r) && !e.pType)
      for (const n of ['V1', 'V2', 'V3']) {
        const vb = beatAfter(n, 0.3);
        const ap = vb ? S.atr.filter((x) => x.t < vb.t && vb.t - x.t < 0.4).pop() : null;
        if (ap) add('P', n, ap.t - 0.01, ap.t + 0.1, 'P', ['P']);
      }
    if (sinusLike && !e.sa && r !== 'asystole') {
      const aa = atr.filter((a) => a.t > 0.4);
      for (let i = 0; i < 2 && aa[i + 1]; i++) add('czest', 'pasek', aa[i].t, aa[i + 1].t, `PP ${ms(aa[i + 1].t - aa[i].t)} ms`, ['pp', 'P', 'rytm']);
    }
    if (r === 'asystole' && e.atrialRate) {
      const aa = atr.filter((a) => a.t > 0.4);
      aa.slice(0, 3).forEach((a, i) => add('P', 'pasek', a.t - 0.01, a.t + 0.1, i ? 'P' : 'P bez QRS', ['P', 'pbez']));
      if (aa[1]) add('rytm', 'pasek', aa[0].t + 0.1, aa[1].t, 'brak QRS po P', ['QRS', 'pbez']);
    }
    if (e.pType !== 'mitrale' && (K.P.req.includes('plaskie') || ((e.pAmp ?? 1) < 0.5 && sinusLike))) {
      const v = sv[2];
      const ap = v ? S.atr.filter((x) => x.t < v.t && v.t - x.t < 0.4).pop() : null;
      if (ap) add('P', 'pasek', ap.t - 0.01, ap.t + 0.12, 'P spłaszczone', ['P']);
    }
    if (e.av === 1 && a1) {
      const v = conducted(a1)!;
      add('prz', 'pasek', a1.t, v.t, `PR ${ms(v.t - a1.t)} ms > 200`, ['PR']);
    }
    if (isBlock) {
      const blks = atr.filter((a) => a.t > 0.5 && a.t < 9.5 && !conducted(a));
      const blk = blks.find((a) => a.t > 1) ?? blks[0];
      if (blk) {
        blks.slice(0, e.av === '2:1' ? 3 : 1).forEach((b) => add('prz', 'pasek', b.t - 0.02, b.t + 0.12, 'P bez QRS', ['P', 'pbez']));
        if (e.av === '2:1' && atr.length >= 3) add('czest', 'pasek', atr[1].t, atr[3]?.t ?? atr[2].t, '2 P : 1 QRS', ['czest', 'P']);
        const prev = atr.filter((a) => a.t < blk.t && conducted(a)).slice(-2);
        prev.forEach((a, i) => add(i === prev.length - 1 ? 'PR' : 'prz', 'pasek', a.t, conducted(a)!.t, `PR ${ms(conducted(a)!.t - a.t)} ms`, ['PR']));
        const nxt = atr.find((a) => a.t > blk.t && conducted(a));
        if (nxt && e.av !== '2:1')
          add('prz', 'pasek', nxt.t, conducted(nxt)!.t, `PR ${ms(conducted(nxt)!.t - nxt.t)} ms${e.av === 'wenckebach' ? ' – najkrótszy po pauzie' : ' – bez zmiany'}`, ['PR', 'pauza']);
        const pb = blks.find((a) => a.t > blk.t);
        if (pb && e.av !== '2:1') {
          const nP = atr.filter((a) => a.t > blk.t && a.t <= pb.t).length;
          add('rytm', 'pasek', blk.t + 0.1, pb.t + 0.12, `grupa: ${nP} P → ${nP - 1} QRS`, ['grupy', 'rytm']);
        }
      }
    }
    if (e.av === 3) {
      atr.filter((a) => a.t > 0.5).slice(0, 3).forEach((a, i) => add('prz', 'pasek', a.t - 0.01, a.t + 0.1, i ? 'P' : 'P – niezależne od QRS', ['P', 'dysoc']));
      atr.filter((a) => a.t > 0.5).map((a) => ({ a, v: S.ev.find((x) => x.t > a.t + 0.04 && x.t - a.t < 0.62) })).filter((x) => x.v).slice(0, 2)
        .forEach((x) => add('prz', 'pasek', x.a.t, x.v!.t, `PR ${ms(x.v!.t - x.a.t)} ms`, ['PR']));
    }
    if (e.sa) {
      let best: [number, number, number, number] | null = null;
      for (let i = 1; i < atr.length; i++) {
        const d = atr[i].t - atr[i - 1].t;
        if (!best || d > best[2]) best = [atr[i - 1].t, atr[i].t, d, i];
      }
      const pp = atr.length > 2 ? Math.min(...atr.slice(1).map((a, i) => a.t - atr[i].t)) : 0;
      if (best) {
        add('prz', 'pasek', best[0], best[1], `PP ${ms(best[2])} ms = ${rstr((best[2] / pp).toFixed(1))}× krótszego PP`, ['pauza']);
        add('rytm', 'pasek', best[0] + 0.12, best[1] - 0.04, 'brak P i QRS', ['pauza', 'P']);
        const i = best[3];
        for (let k = i - 2; k >= Math.max(0, i - 4); k--) add('prz', 'pasek', atr[k].t, atr[k + 1].t, `PP ${ms(atr[k + 1].t - atr[k].t)} ms`, ['pp']);
        let s = i - 1;
        while (s > 0 && atr[s].t - atr[s - 1].t < 1.4 * pp) s--;
        if (i - s >= 2) add('rytm', 'pasek', atr[s].t, atr[i - 1].t + 0.1, `grupa ${i - s} P, potem pauza`, ['grupy', 'rytm']);
      }
    }

    const vq = sv.find((v) => v.k === (mainKind ?? 'n') || v.k === 'e');
    if (vq && !['vf', 'asystole'].includes(r)) {
      const m = morphOf(vq);
      const vq2 = sv.filter((v) => v.t > vq.t + 2.4 && (v.k === (mainKind ?? 'n') || v.k === 'e'))[0] || vq;
      const vq3 = sv.filter((v) => v.t > vq2.t + 1.6 && (v.k === (mainKind ?? 'n') || v.k === 'e'))[0] || vq2;
      add('QRS', 'pasek', vq2.t, vq2.t + morphOf(vq2).D, `QRS ${ms(morphOf(vq2).D)} ms`, ['QRS']);
      if (K.qt != null) add('QT', 'pasek', vq3.t, vq3.t + morphOf(vq3).qt, `QT ${K.qt} ms, QTc ${K.qtc}`, ['QT']);
      if (e.wpw) add('prz', 'pasek', vq.t - 0.01, vq.t + 0.05, 'fala delta', ['delta']);
      if (e.jAmp) {
        add('morf', 'pasek', vq.t + m.D - 0.03, vq.t + m.D + 0.04, 'fala J', ['J']);
        const vj = beatLead('V4');
        if (vj) add('morf', 'V4', vj.t + morphOf(vj).D - 0.03, vj.t + morphOf(vj).D + 0.04, 'fala J', ['J']);
      }
      if (K.qtc != null && K.qtc > 520 && !e.uAmp)
        add('T', 'pasek', vq3.t + morphOf(vq3).tp - 0.12, vq3.t + morphOf(vq3).tp + 0.12, 'T szerokie', ['T']);
    }
    const noise = e.tremor ? 'drżenie mięśniowe 4–6 Hz' : e.hum ? 'zakłócenia sieciowe 50 Hz' : e.emg ? 'szum mięśniowy' : e.artifact ? 'artefakty drżeniowe' : '';
    if (noise)
      for (const n of ['I', 'II', 'III', 'aVF']) {
        const v = beatLead(n);
        if (v) add('morf', n, v.t + 0.3, v.t + 0.6, noise, ['art']);
      }
    if (e.wander || noise) {
      const v = sv[1];
      if (v) add('morf', 'pasek', v.t + 0.3, v.t + 0.7, e.wander ? 'pływanie izolinii' : noise, ['art']);
    }
    for (const bl of ([] as string[]).concat((e.badLead as string | string[] | undefined) ?? [])) {
      const v = beatLead(bl);
      if (v) add('morf', bl, v.t - 0.1, v.t + 0.5, 'zły kontakt elektrody – nie do oceny', ['bad']);
    }
    if (e.alternans && e.alternans < 1) {
      const pair = (lead: string) => {
        const v = lead === 'pasek' ? sv[1] : beatLead('V4');
        const i = v ? S.ev.indexOf(v) : -1;
        const w = S.ev[i + 1];
        if (!v || !w || w.t - v.t > 1.2) return;
        const ln = lead === 'pasek' ? 'II' : lead;
        const a = qrsRange(ln, v), b = qrsRange(ln, w);
        add('morf', lead, v.t, w.t + morphOf(w).D, `QRS ${mm(a.hi - a.lo)} / ${mm(b.hi - b.lo)} mm – naprzemiennie`, ['alternans']);
      };
      pair('pasek');
      pair('V4');
    }

    if (K.os.length)
      for (const n of ['I', 'II', 'aVF']) {
        const v = beatLead(n);
        if (v) {
          const m = morphOf(v);
          const ar = qrsRange(n, v).ar;
          add('os', n, v.t, v.t + m.D, `QRS ${n} ${ar > 0.01 ? 'dodatni' : ar < -0.01 ? 'ujemny' : 'izoelektryczny'}`, ['os']);
        }
      }
    if (e.bbb || K.iv.req.includes('IVCD')) {
      const spec: [string, string, string[]][] =
        e.bbb === 'L'
          ? [['V1', 'QS / rS szerokie', ['prog', 'Q', 'rsr', 'QRS', 'bbb']], ['V5', 'szerokie R, bez q', ['QRS', 'bbb']], ['V6', 'szerokie R, bez q', ['QRS', 'bbb']], ['I', 'szerokie R', ['QRS', 'bbb']], ['aVL', 'szerokie R', ['QRS', 'bbb']]]
          : e.bbb === 'R'
            ? [['V1', "rSR'", ['rsr', 'QRS', 'bbb']], ['V2', "rSR'", ['rsr', 'QRS', 'bbb']], ['V6', 'szerokie S', ['szS', 'QRS', 'bbb']], ['I', 'szerokie S', ['szS', 'QRS', 'bbb']]]
            : e.bbb === 'iR'
              ? [['V1', "rSr'", ['rsr', 'bbb']], ['V6', 'małe s', ['szS']], ['I', 'małe s', ['szS']]]
              : [['V1', "szerokie QRS bez rSR' i bez LBBB", ['rsr', 'QRS', 'bbb']], ['V6', 'szerokie QRS', ['QRS', 'bbb']]];
      for (const [n, txt, c] of spec) {
        const v = beatLead(n);
        if (v) add('prz', n, v.t, v.t + morphOf(v).D + 0.02, txt, c);
      }
    }
    if (e.lvh) {
      const v1 = beatLead('V1'), v5 = beatLead('V5');
      const s1 = v1 ? qrsRange('V1', v1).lo : 0, r5 = v5 ? qrsRange('V5', v5).hi : 0;
      if (v1) add('morf', 'V1', v1.t, v1.t + morphOf(v1).D, `S ${mm(s1)} mm`, ['Sgl', 'wysoki']);
      if (v5) add('morf', 'V5', v5.t, v5.t + morphOf(v5).D, `R ${mm(r5)} mm${mm(s1) + mm(r5) > 35 ? ' (SV1+RV5 = ' + (mm(s1) + mm(r5)) + ' mm)' : ''}`, ['Rwys', 'wysoki']);
    }
    if (e.rvh) {
      const v = beatLead('V1');
      if (v) add('morf', 'V1', v.t, v.t + morphOf(v).D, 'R > S', ['Rwys']);
      for (const n of ['V5', 'V6']) {
        const vb = beatLead(n);
        if (vb && qrsRange(n, vb).lo <= -0.25) add('morf', n, vb.t, vb.t + morphOf(vb).D, `S ${mm(qrsRange(n, vb).lo)} mm`, ['Sgl']);
      }
    }
    if ((e.voltage ?? 1) <= 0.5)
      for (const n of ['I', 'II', 'V2', 'V5']) {
        const v = beatLead(n);
        if (v) {
          const q = qrsRange(n, v);
          add('morf', n, v.t, v.t + q.D, `QRS ${mm(q.hi - q.lo)} mm`, ['niski']);
        }
      }
    if (e.s1q3t3) {
      const v1 = beatLead('I'), v3 = beatLead('III');
      if (v1) add('morf', 'I', v1.t + morphOf(v1).D - 0.07, v1.t + morphOf(v1).D + 0.02, 'S w I', ['s1q3t3', 'Sgl']);
      if (v3) {
        add('Q', 'III', v3.t - 0.005, v3.t + 0.05, 'Q w III', ['s1q3t3', 'Q']);
        if (tAmpAt('III', v3) <= -0.03 && !K.leads.tNeg.req.includes('III')) add('T', 'III', v3.t + morphOf(v3).tp - 0.09, v3.t + morphOf(v3).tp + 0.09, 'T ujemny w III', ['s1q3t3', 'T']);
      }
    }
    if (e.brugada)
      for (const n of ['V1', 'V2']) {
        const v = beatLead(n);
        if (v) {
          const m = morphOf(v);
          add('morf', n, v.t + m.D - 0.02, v.t + m.tp + 0.05, 'coved ST', ['ST', 'J']);
        }
      }
    if (e.helmet)
      for (const n of ['II', 'III', 'aVF']) {
        const v = beatLead(n);
        if (v) {
          const m = morphOf(v);
          add('morf', n, v.t - 0.04, v.t + m.qt, 'hełm', ['helm', 'ST', 'T', 'J', 'Rwys']);
        }
      }

    const stMarked = new Set<string>();
    for (const n of K.leads.stUp.req.concat(K.leads.stDn.req)) {
      const v = beatLead(n);
      if (v) {
        const m = morphOf(v), s = (M.st || {})[n] ?? 0;
        stMarked.add(n);
        add('ST', n, v.t + m.D - 0.01, v.t + m.D + 0.11, `ST ${s > 0 ? '↑' : '↓'} ${rstr(Math.abs(s).toFixed(2))} mV`, ['ST'], s > 0 ? 'stUp' : 'stDn');
      }
    }
    if (e.stemi === 'pericarditis' || e.pericarditis || e.stemi === 'subendocardial') {
      const s = (M.st || {}).aVR ?? 0;
      const v = beatLead('aVR');
      if (v && !stMarked.has('aVR') && Math.abs(s) >= 0.03)
        add('ST', 'aVR', v.t + morphOf(v).D - 0.01, v.t + morphOf(v).D + 0.11, `ST ${s > 0 ? '↑' : '↓'} ${rstr(Math.abs(s).toFixed(2))} mV`, ['ST']);
    }
    if (e.stemi === 'pericarditis' || e.pericarditis)
      for (const n of ['II', 'V5', 'aVR']) {
        const v = beatLead(n);
        if (v) add('morf', n, v.t - 0.1, v.t - 0.01, n === 'aVR' ? 'PR ↑' : 'PR ↓', ['PRobn']);
      }

    const tMarked = new Set<string>();
    for (const n of K.leads.tNeg.req) {
      const v = beatLead(n);
      if (v) {
        const m = morphOf(v);
        tMarked.add(n);
        add('T', n, v.t + m.tp - 0.09, v.t + m.tp + 0.09, 'T ujemny', ['T'], 'tNeg');
      }
    }
    if ((e.tAnt != null && e.tAnt < 0) || e.s1q3t3 || e.tAxis != null || e.bbb === 'R' || e.rvh)
      for (const n of ['III', 'V1']) {
        const v = beatLead(n);
        if (v && !tMarked.has(n) && !Z.some((m) => m.pole === 'T' && m.n === n) && tAmpAt(n, v) <= -0.08) {
          tMarked.add(n);
          add('T', n, v.t + morphOf(v).tp - 0.09, v.t + morphOf(v).tp + 0.09, 'T ujemny', ['T']);
        }
      }
    if (sec) {
      const cand: { n: string; v: Ev; a: number }[] = [];
      for (const n of NAMES) {
        const v = beatLead(n);
        if (!v || tMarked.has(n) || n === 'aVR') continue;
        const ta = tAmpAt(n, v), qa = qrsRange(n, v).ar;
        if (Math.abs(ta) >= 0.1 && ta * qa < 0) cand.push({ n, v, a: Math.abs(ta) });
      }
      cand.sort((x, y) => y.a - x.a).slice(0, 4).forEach(({ n, v }) => {
        const m = morphOf(v);
        tMarked.add(n);
        add('T', n, v.t + m.D, v.t + m.tp + 0.1, 'ST-T wtórne', ['T', 'ST']);
      });
    }
    if (e.lvh)
      for (const n of ['V5', 'V6', 'I', 'aVL']) {
        const v = beatLead(n);
        if (v && !tMarked.has(n)) {
          const m = morphOf(v);
          tMarked.add(n);
          add('T', n, v.t + m.D, v.t + m.tp + 0.1, tAmpAt(n, v) <= -0.03 ? 'ST-T wtórne: T odwrócone' : 'ST-T wtórne: T spłaszczone', ['T', 'ST']);
        }
      }
    if (K.T.req.includes('szpicz') || K.T.req.includes('hiper'))
      for (const n of K.T.req.includes('hiper') ? ['V2', 'V3', 'V4'] : ['V2', 'V3']) {
        const v = beatLead(n);
        if (v) {
          const m = morphOf(v);
          add('T', n, v.t + m.tp - 0.1, v.t + m.tp + 0.08, K.T.req.includes('hiper') ? 'T hiperostry' : 'T szpiczasty', ['T']);
        }
      }
    if (K.T.req.includes('plaskie') || (e.tAmp ?? 1) <= 0.6)
      for (const n of ['II', 'V4', 'V5']) {
        const v = beatLead(n);
        if (v) add('T', n, v.t + morphOf(v).tp - 0.09, v.t + morphOf(v).tp + 0.09, 'T spłaszczone', ['T']);
      }
    if (K.T.req.includes('U'))
      for (const n of ['V2', 'V3']) {
        const v = beatLead(n);
        if (v) {
          const m = morphOf(v);
          add('T', n, v.t + m.tp + 0.1, v.t + m.tp + 0.24, 'fala U', ['U']);
        }
      }
    for (const n of K.leads.q.req) {
      const v = beatLead(n);
      if (!v) continue;
      const anterior = ['anterior', 'anteroseptal', 'anterolateral'].includes(e.qWave ?? '') && ['V1', 'V2', 'V3', 'V4'].includes(n);
      if (anterior) add('Q', n, v.t - 0.005, v.t + 0.07, qrsRange(n, v).hi < 0.1 ? 'QS' : 'Q, słabe R', ['Q', 'prog'], 'q');
      else add('Q', n, v.t - 0.005, v.t + 0.05, 'Q', ['Q'], 'q');
    }
    return Z;
  }

  function krokiOpis(): string {
    const k = P.kroki || {};
    const RY = RYTM[r] || r;
    let rytm = sinus ? 'zatokowy (P przed każdym QRS, dodatni w II, ujemny w aVR)' + (e.pvc ? ', z pobudzeniami komorowymi' : '') + (e.pac ? ', z pobudzeniami nadkomorowymi' : '') : RY;
    if (sinus && e.av) rytm = 'zatokowy rytm przedsionków, ' + (AVLAB[String(e.av)] || '');
    if (sinus && e.sa) rytm = 'zatokowy, ' + (SALAB[String(e.sa)] || '');
    if (sinus && (e.sinArr || 0) >= 0.08) rytm = 'zatokowy, niemiarowość zatokowa – PP zmienia się z oddechem, P bez zmian';
    const hr = M.hr == null ? '—' : M.hr + '/min' + (M.hr < 60 ? ' (bradykardia)' : M.hr > 100 ? ' (tachykardia)' : '');
    const czest = (e.av && e.av !== 1) || (r === 'asystole' && e.atrialRate)
      ? 'komory ' + hr + ', przedsionki ~' + Math.round(e.atrialRate || 80) + '/min'
      : hr;
    const ax = M.qrsAx;
    const os = ax == null ? '—' : `ok. ${ax}° – ${ax < -30 ? 'odchylona w lewo' : ax <= 90 ? 'prawidłowa' : ax <= 180 ? 'odchylona w prawo' : 'nieokreślona'}`;
    const Pt = r === 'af' ? 'brak P, fale f' : r === 'flutter' ? 'brak P, fale F (piła) ~' + Math.round(e.atrialRate || 300) + '/min' : ['junctional', 'svt'].includes(r) ? 'brak widocznych P przed QRS' : ['vt', 'tdp', 'vf'].includes(r) ? 'nieoceniane' : e.pType === 'pulmonale' ? 'wysokie, szpiczaste (P pulmonale)' : e.pType === 'mitrale' ? 'szerokie, dwugarbne (P mitrale)' : (e.pAmp ?? 1) < 0.5 ? 'spłaszczone, ledwo widoczne' : 'prawidłowe (≤2,5 mm, <120 ms)';
    const PR = M.pr == null ? (e.av === 'wenckebach' ? 'narastający aż do wypadnięcia QRS' : e.av === 3 ? 'zmienny – brak związku P–QRS' : 'nieoceniany') : M.pr + ' ms' + (M.pr > 200 ? ' – wydłużony' : M.pr < 120 ? ' – skrócony' : ' – prawidłowy');
    const q = [M.qrs == null ? '—' : M.qrs + ' ms' + (M.qrs >= 120 ? ' – szerokie' : M.qrs > 100 ? ' – graniczne' : ' – wąskie')];
    if (e.bbb) q.push(e.bbb === 'L' ? 'morfologia LBBB' : e.bbb === 'iR' ? "rSr' w V1 przy QRS <120 ms – niepełny RBBB" : "morfologia RBBB (rSR' w V1)");
    else if ((M.qrs ?? 0) >= 120 && !e.wpw && sinus) q.push('poszerzone bez typowej morfologii LBBB/RBBB – nieswoisty blok śródkomorowy');
    if (e.wpw) q.push('fala delta');
    if (e.lvh) q.push('wysoki woltaż – LVH');
    if (e.rvh) q.push('R > S w V1 – RVH');
    if (e.qWave) q.push('patologiczne Q');
    if ((e.voltage ?? 1) < 0.5) q.push('niski woltaż');
    if (e.jAmp) q.push('fale J (Osborna)');
    const up: string[] = [], dn: string[] = [];
    for (const [n, v] of Object.entries(M.st || {})) {
      if (v >= (n === 'V2' || n === 'V3' ? 0.2 : 0.1)) up.push(n);
      else if (v <= -0.1) dn.push(n);
    }
    const ST = e.stemi === 'pericarditis'
      ? 'rozlane wklęsłe uniesienia, obniżenie PR'
      : !Object.keys(M.st || {}).length
        ? 'nieoceniany'
        : up.length || dn.length
          ? [up.length ? 'uniesienie ' + up.join(', ') : '', dn.length ? 'obniżenie ' + dn.join(', ') : ''].filter(Boolean).join('; ')
          : e.lvh || e.rvh || e.bbb === 'L' ? 'zmiany wtórne do przerostu/bloku' : 'izoelektryczny';
    const T = (e.tAmp ?? 1) >= 1.5 ? 'wysokie, szpiczaste, wąskie u podstawy' : e.hyperacute ? 'hiperostre – wysokie, szerokie u podstawy w V2–V4' : (e.tAnt ?? 0.5) < -0.5 ? 'głęboko odwrócone w V1–V3' : (e.tAmp ?? 1) < 0.6 ? 'spłaszczone' + (e.uAmp ? ', widoczne fale U' : '') : e.lvh || e.rvh || e.bbb ? 'wtórnie odwrócone (przeciwnie do QRS)' : 'zgodne z kierunkiem QRS';
    const QT = M.qt == null ? '—' : `QT ${M.qt} ms, QTc ${M.qtc} ms${(M.qtc ?? 0) > 500 ? ' – znacznie wydłużony' : (M.qtc ?? 0) > 460 ? ' – wydłużony' : ' – prawidłowy'}`;
    const w: Record<string, string> = { rytm, czestosc: czest, os, P: Pt, PR, QRS: q.join(', '), ST, T, QT };
    for (const x in k) {
      const v = k[x as keyof typeof k];
      if (v != null) w[x] = v;
    }
    return [
      '1. Rytm: ' + w.rytm,
      '2. Częstość: ' + w.czestosc,
      '3. Oś: ' + w.os,
      '4. Załamek P: ' + w.P,
      '5. PR: ' + w.PR,
      '6. QRS: ' + w.QRS,
      '7. ST: ' + w.ST,
      '8. T: ' + w.T,
      '9. QT: ' + w.QT,
      '10. Wniosek: ' + P.rozpoznanie,
    ].join('\n');
  }

  const klucz = kluczStrukt();
  const nr = String(SEED);
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const data = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const wiek = Math.round(P.wiek[0] + rnd() * (P.wiek[1] - P.wiek[0]));
  const plec: 'K' | 'M' = P.plec || (rnd() < 0.5 ? 'K' : 'M');
  const godz = `${pad(Math.floor(rnd() * 24))}:${pad(Math.floor(rnd() * 60))}`;

  const EX: Envelope = {
    nr,
    wiek,
    plec,
    data,
    godz,
    kontekst: opts.bezKontekstu ? '' : P.kontekst,
    ecg: JSON.parse(JSON.stringify(e)) as Record<string, unknown>,
    seed: pageSeed,
    wzorzec: null,
    rozp: listaRozpoznan(),
  };

  const key: KeyJson = {
    nr,
    id: P.id,
    rozpoznanie: P.rozpoznanie,
    elementy: P.elementy,
    pulapki: P.pulapki,
    postepowanie: P.postepowanie,
    pomiary: G.measureStr(M),
    klucz,
    zaznaczenia: zaznaczenia(klucz),
  };

  return { EX, key, M, auto, kroki: krokiOpis() };
}
