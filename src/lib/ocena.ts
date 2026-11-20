import { GR, LEADMODES, NAMES, POLA, arr, lab, leadList } from '../data/slownik';
import type { Answer } from '../data/slownik';
import type { KeyJson, Klucz, Multi } from './generate';

export type St = 'ok' | 'brak' | 'zle' | 'czesc' | null;

export interface Single {
  st: St;
  pkt: number;
  key: string[];
}

export interface MultiRes {
  bledy: number;
  opcje: Record<string, 'ok' | 'zle' | 'brak'>;
  brak: string[];
  zle: string[];
}

export interface LiczbaRes {
  st: St;
  key: number | null;
}

export interface PolaRes {
  pkt: number | null;
  max: number;
  st: St;
}

export interface Review {
  auto: number;
  autoMax: 8;
  pola: Record<string, PolaRes>;
  grupy: Record<string, Single | MultiRes>;
  liczby: Record<string, LiczbaRes>;
  leads: Record<string, MultiRes>;
  el: Record<string, 'ok' | 'brak' | 'zle'>;
}

type AnyKey = string[] | Multi | number | null | undefined;

function single(key: AnyKey, val: unknown): Single {
  const k = arr(key as string | string[] | null | undefined);
  if (!k.length) return { st: val ? 'ok' : null, pkt: 1, key: k };
  if (!val) return { st: 'brak', pkt: 0, key: k };
  return { st: k.includes(val as string) ? 'ok' : 'zle', pkt: k.includes(val as string) ? 1 : 0, key: k };
}

function multi(key: Multi | undefined, val: unknown): MultiRes {
  const k = key || { req: [], ok: [] };
  const vals = arr(val as string | string[] | null | undefined);
  const req = arr(k.req), ok = req.concat(arr(k.ok)), opcje: Record<string, 'ok' | 'zle' | 'brak'> = {};
  const brak: string[] = [], zle: string[] = [];
  for (const v of vals) {
    opcje[v] = ok.includes(v) ? 'ok' : 'zle';
    if (opcje[v] === 'zle') zle.push(v);
  }
  for (const v of req)
    if (!vals.includes(v)) {
      opcje[v] = 'brak';
      brak.push(v);
    }
  return { bledy: brak.length + zle.length, opcje, brak, zle };
}

function liczba(key: number | null | undefined, val: unknown, tol: (k: number) => number): LiczbaRes {
  if (key == null) return { st: null, key: null };
  if (val == null || val === '' || isNaN(+(val as number))) return { st: 'brak', key };
  return { st: Math.abs(+(val as number) - key) <= tol(key) ? 'ok' : 'zle', key };
}

export const pts = (b: number): number => (b === 0 ? 1 : b === 1 ? 0.5 : 0);

export function ocen(K: Klucz, A: Answer): Review {
  const a = A || {};
  const L = a.leads || {}, KL = K.leads || {};
  const g: Record<string, Single | MultiRes> = {};
  const pola: Record<string, { pkt: number | null }> = {};
  const liczby: Record<string, LiczbaRes> = {};
  const leads: Record<string, MultiRes> = {};

  g.rytm = single(K.rytm, a.rytm);
  g.miar = single(K.miar, a.miar);
  g.dod = multi(K.dod, a.dod);
  const bMiar = ((g.miar as Single).st === 'ok' || (g.miar as Single).st === null ? 0 : 1) + (g.dod as MultiRes).bledy;
  pola.rytm = { pkt: (g.rytm as Single).pkt + pts(bMiar) };

  liczby.hr = liczba(K.hr, a.hr, (k) => Math.max(6, k * 0.1));
  liczby.ha = K.ha != null && a.ha != null && a.ha !== '' ? liczba(K.ha, a.ha, (k) => Math.max(8, k * 0.12)) : { st: null, key: K.ha };
  pola.czest = { pkt: (liczby.hr.st === 'ok' || (K.hr == null && liczby.hr.st == null)) && liczby.ha.st !== 'zle' ? 1 : 0 };

  g.os = single(K.os, a.os);
  pola.os = { pkt: (g.os as Single).pkt };

  g.sa = single(K.sa, a.sa || 'brak');
  g.av = single(K.av, a.av || 'brak');
  g.iv = multi(K.iv, a.iv);
  pola.odst = { pkt: pts(((g.sa as Single).st === 'zle' ? 1 : 0) + ((g.av as Single).st === 'zle' ? 1 : 0) + (g.iv as MultiRes).bledy) };
  liczby.pr = liczba(K.pr, a.pr, () => 30);
  liczby.qrs = liczba(K.qrs, a.qrs, (k) => Math.max(20, k * 0.15));
  liczby.qt = liczba(K.qt, a.qt, () => 40);
  liczby.qtc = liczba(K.qtc, a.qtc, () => 40);
  if (K.pr == null && a.pr != null && (a.pr as number | string) !== '') liczby.pr.st = 'zle';
  g.qtK = single(K.qtK, a.qtK);
  const qtOk = (g.qtK as Single).st === 'ok' || liczby.qtc.st === 'ok' || ((g.qtK as Single).st === null && liczby.qtc.st !== 'zle');
  const bPom = (liczby.pr.st === 'zle' || liczby.pr.st === 'brak' ? 1 : 0) + (liczby.qrs.st === 'zle' || liczby.qrs.st === 'brak' ? 1 : 0) + (K.qt != null && !qtOk ? 1 : 0);
  pola.odst.pkt = (pola.odst.pkt as number) + pts(bPom);

  for (const [m] of LEADMODES) leads[m] = multi(KL[m], L[m as keyof typeof L]);
  g.stF = multi(K.stF, a.stF);
  const wtorne = arr(a.stF).includes('wtorne') && arr(K.stF.ok).concat(arr(K.stF.req)).includes('wtorne');
  if (wtorne)
    for (const m of ['stUp', 'stDn']) {
      leads[m].bledy -= leads[m].brak.length;
      leads[m].brak.forEach((v) => delete leads[m].opcje[v]);
      leads[m].brak = [];
    }
  pola.stt = { pkt: pts(leads.stUp.bledy + leads.stDn.bledy + (g.stF as MultiRes).bledy) };
  g.P = multi(K.P, a.P);
  g.morf = multi(K.morf, a.morf);
  g.T = multi(K.T, a.T);
  if (arr(a.T).includes('wtorne') && (arr(K.T.req).includes('wtorne') || arr(K.T.ok).includes('wtorne'))) {
    leads.tNeg.bledy -= leads.tNeg.brak.length;
    leads.tNeg.brak.forEach((v) => delete leads.tNeg.opcje[v]);
    leads.tNeg.brak = [];
  }
  pola.stt.pkt = (pola.stt.pkt as number) + pts((g.P as MultiRes).bledy + (g.morf as MultiRes).bledy + (g.T as MultiRes).bledy + leads.tNeg.bledy + leads.q.bledy);
  pola.wniosek = { pkt: null };

  const polaRes: Record<string, PolaRes> = {};
  for (const k in pola) {
    const p = pola[k], max = POLA[k].max;
    polaRes[k] = { pkt: p.pkt, max, st: p.pkt == null ? null : p.pkt >= max ? 'ok' : p.pkt > 0 ? 'czesc' : 'zle' };
  }
  const auto = Object.values(polaRes).reduce((acc, p) => acc + (p.pkt || 0), 0);

  const stOf = (...xs: St[]): 'ok' | 'brak' | 'zle' =>
    xs.some((x) => x === 'zle') ? 'zle' : xs.some((x) => x === 'brak') ? 'brak' : 'ok';
  const setSt = (m: MultiRes): 'ok' | 'brak' | 'zle' => (m.zle.length ? 'zle' : m.brak.length ? 'brak' : 'ok');
  const el = {
    rytm: stOf((g.rytm as Single).st, (g.miar as Single).st, setSt(g.dod as MultiRes)),
    czest: stOf(liczby.hr.st, liczby.ha.st),
    os: stOf((g.os as Single).st),
    P: setSt(g.P as MultiRes),
    PR: stOf(liczby.pr.st),
    QRS: stOf(liczby.qrs.st),
    QT: qtOk ? 'ok' : stOf(liczby.qt.st, (g.qtK as Single).st),
    prz: stOf((g.sa as Single).st, (g.av as Single).st, setSt(g.iv as MultiRes)),
    ST: stOf(setSt(leads.stUp), setSt(leads.stDn), setSt(g.stF as MultiRes)),
    T: stOf(setSt(g.T as MultiRes), setSt(leads.tNeg)),
    Q: setSt(leads.q),
    morf: setSt(g.morf as MultiRes),
  } as Record<string, 'ok' | 'brak' | 'zle'>;

  return { auto, autoMax: 8, pola: polaRes, grupy: g, liczby, leads, el };
}

export function raport(K: Klucz, A: Answer, R: Review): string[] {
  const out: string[] = [];
  const attr = (g: string) => (A as Record<string, unknown>)[g];
  const sg = (g: string, nazwa: string) => {
    const x = R.grupy[g] as Single;
    if (x.st === 'zle' || x.st === 'brak') out.push(`${nazwa}: zaznaczono ${attr(g) ? lab(g, String(attr(g))) : '—'}, klucz ${arr((K as unknown as Record<string, AnyKey>)[g] as string[]).map((v) => lab(g, v)).join(' / ')}`);
  };
  const mg = (g: string, nazwa: string, x?: MultiRes) => {
    const m = x || (R.grupy[g] as MultiRes);
    if (m.brak.length) out.push(`${nazwa} – pominięte: ${m.brak.map((v) => lab(g, v)).join(', ')}`);
    if (m.zle.length) out.push(`${nazwa} – błędnie zaznaczone: ${m.zle.map((v) => lab(g, v)).join(', ')}`);
  };
  sg('rytm', 'Rytm');
  sg('miar', 'Miarowość');
  mg('dod', 'Dodatki');
  sg('os', 'Oś');
  mg('P', 'P');
  sg('sa', 'SA');
  sg('av', 'AV');
  mg('iv', 'Śródkomorowe');
  for (const [k, n] of [['hr', 'HR'], ['ha', 'Przedsionki'], ['pr', 'PR'], ['qrs', 'QRS'], ['qt', 'QT'], ['qtc', 'QTc']] as [string, string][]) {
    const x = R.liczby[k];
    if (x.st === 'zle' || x.st === 'brak') out.push(`${n}: podano ${(A as Record<string, unknown>)[k] ?? '—'}, klucz ${x.key ?? 'nie mierzy się'}`);
  }
  sg('qtK', 'QT kategoria');
  mg('morf', 'Morfologia QRS');
  mg('stF', 'ST charakter');
  mg('T', 'T');
  for (const [m, n] of LEADMODES) {
    const x = R.leads[m];
    if (x.brak.length) out.push(`${n} – pominięte odpr.: ${leadList(x.brak)}`);
    if (x.zle.length) out.push(`${n} – nadmiarowe odpr.: ${leadList(x.zle)}`);
  }
  return out;
}

export const LEAD_NAMES = NAMES;

export type { KeyJson, Answer };
export { GR };
