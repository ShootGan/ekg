import { CECHY, cechyZapisu, type Cecha } from './cechy';
import type { GenerateResult } from './generate';
import { PRZYPADKI } from '../data/przypadki';

export interface Krok {
  t: string;
  q: string;
  grupy: string[];
  pomiar?: Pomiar;
}

export type Pomiar = 'hr' | 'pr' | 'qrs' | 'qt';

export const POMIARY: Record<Pomiar, { t: string; unit: string; tol: (k: number) => number }> = {
  hr: { t: 'Częstość komór', unit: '/min', tol: (k) => Math.max(6, k * 0.1) },
  pr: { t: 'PR', unit: 'ms', tol: () => 30 },
  qrs: { t: 'QRS', unit: 'ms', tol: (k) => Math.max(20, k * 0.15) },
  qt: { t: 'QT', unit: 'ms', tol: () => 40 },
};

export const KROKI: Krok[] = [
  { t: 'Rytm i częstość', q: 'Co jest przed QRS, czy RR są równe, ile jest zespołów na minutę?', grupy: ['rytm', 'czest', 'dod'], pomiar: 'hr' },
  { t: 'P, PR i przewodzenie', q: 'Kształt P w II i V1, długość PR, czy każde P przechodzi do komór?', grupy: ['P', 'sa', 'av'], pomiar: 'pr' },
  { t: 'Oś i QRS', q: 'QRS w I i aVF, szerokość, woltaż, patologiczne Q.', grupy: ['os', 'iv', 'morf'], pomiar: 'qrs' },
  { t: 'ST, T i QT', q: 'Uniesienia i obniżenia ST, kształt i kierunek T, długość QT.', grupy: ['st', 't', 'qt'], pomiar: 'qt' },
  { t: 'Wniosek', q: 'Rozpoznanie i co z tym robisz.', grupy: [] },
];

export const CECHY_KROKU: Cecha[][] = KROKI.map((k) => CECHY.filter((c) => k.grupy.includes(c.grupa)));

export const KRYTYCZNE = new Set(['stUp', 'av3', 'mob2', '21', 'vt', 'tdp', 'vf', 'asystolia', 'WPW', 'brugada', 'szpicz', 'hiper', 'qtDl', 'alternans']);

export type Post = 'nzk' | 'pci' | 'elektro' | 'sor' | 'brak';

export const POSTEPOWANIE: [Post, string][] = [
  ['nzk', 'NZK: resuscytacja, defibrylacja przy rytmie do defibrylacji'],
  ['pci', 'STEMI: teletransmisja i pracownia hemodynamiki z pominięciem SOR'],
  ['elektro', 'Groźna arytmia: kardiowersja, stymulacja albo leki'],
  ['sor', 'Transport na SOR z monitorowaniem'],
  ['brak', 'Bez pilnej interwencji'],
];

export function oczekiwanePost(ids: Set<string>, kat: string): Post[] {
  if (kat === 'nzk' || ids.has('vf') || ids.has('asystolia')) return ['nzk'];
  if (ids.has('stUp') && !ids.has('perikard') && !ids.has('brugada')) return ['pci'];
  if (ids.has('vt') || ids.has('tdp')) return ['elektro'];
  if (ids.has('av3') || ids.has('mob2') || ids.has('21')) return ['elektro', 'sor'];
  if (ids.has('tachykardia') && (ids.has('svt') || ids.has('flutter') || ids.has('af'))) return ['elektro', 'sor'];
  if ([...ids].some((x) => KRYTYCZNE.has(x)) || ids.has('stDn')) return ['sor'];
  if (ids.has('norma')) return ['brak'];
  return ['sor', 'brak'];
}

export interface OdpowiedzOpisu {
  sel: string[];
  pomiary: Partial<Record<Pomiar, number | null>>;
  dx: string;
  post: Post | '';
}

export type Werdykt = 'ok' | 'miss' | 'zle';

export interface PozycjaWyniku {
  c: Cecha;
  w: Werdykt;
  krytyczna: boolean;
}

export interface PomiarWyniku {
  m: Pomiar;
  klucz: number | null;
  podano: number | null;
  ok: boolean | null;
}

export interface WynikOpisu {
  pozycje: PozycjaWyniku[];
  przeoczoneKrytyczne: Cecha[];
  zmiany: number;
  pomiary: PomiarWyniku[];
  dx: { pkt: 0 | 1 | 2; klucz: string };
  post: { ok: boolean; oczekiwane: Post[] };
  wynik: number;
}

export function dxKeyFor(id: string): string {
  const kase = PRZYPADKI.find((p) => p.id === id);
  if (!kase) return id;
  return PRZYPADKI.find((p) => p.rozpoznanie && p.rozpoznanie === kase.rozpoznanie)?.id || kase.id;
}

export function ocenDx(id: string, dx: string): 0 | 1 | 2 {
  if (!dx) return 0;
  const kase = PRZYPADKI.find((p) => p.id === id);
  const wyb = PRZYPADKI.find((p) => p.id === dx);
  if (dx === dxKeyFor(id) || (wyb && kase && wyb.rozpoznanie === kase.rozpoznanie)) return 2;
  return wyb && kase && wyb.kat === kase.kat ? 1 : 0;
}

export function ocenOpis(g: GenerateResult, A: OdpowiedzOpisu): WynikOpisu {
  const { jest, niepewne } = cechyZapisu(g);
  const ids = new Set(jest.map((c) => c.id));
  const sel = new Set(A.sel);
  const pozycje: PozycjaWyniku[] = [];
  let maks = 0;
  let traf = 0;
  for (const c of jest) {
    const krytyczna = KRYTYCZNE.has(c.id);
    const w = krytyczna ? 3 : 1;
    maks += w;
    if (sel.has(c.id)) traf += w;
    pozycje.push({ c, w: sel.has(c.id) ? 'ok' : 'miss', krytyczna });
  }
  for (const c of CECHY) {
    if (!sel.has(c.id) || ids.has(c.id) || niepewne.has(c.id)) continue;
    maks += 1;
    pozycje.push({ c, w: 'zle', krytyczna: false });
  }
  const zmiany = maks ? traf / maks : 1;

  const K = g.key.klucz;
  const pomiary: PomiarWyniku[] = (Object.keys(POMIARY) as Pomiar[]).map((m) => {
    const klucz = K[m] ?? null;
    const podano = A.pomiary[m] ?? null;
    const ok = klucz == null || podano == null ? null : Math.abs(podano - klucz) <= POMIARY[m].tol(klucz);
    return { m, klucz, podano, ok };
  });

  const dxPkt = ocenDx(g.key.id, A.dx);
  const kat = PRZYPADKI.find((p) => p.id === g.key.id)?.kat ?? '';
  const oczekiwane = oczekiwanePost(ids, kat);
  const postOk = !!A.post && oczekiwane.includes(A.post);

  const wynik = Math.round(100 * (0.6 * zmiany + 0.25 * (dxPkt / 2) + 0.15 * (postOk ? 1 : 0)));
  return {
    pozycje,
    przeoczoneKrytyczne: pozycje.filter((p) => p.w === 'miss' && p.krytyczna).map((p) => p.c),
    zmiany: Math.round(zmiany * 100),
    pomiary,
    dx: { pkt: dxPkt, klucz: dxKeyFor(g.key.id) },
    post: { ok: postOk, oczekiwane },
    wynik,
  };
}
