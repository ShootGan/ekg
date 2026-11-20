import type { Group } from '../data/slownik';
import { GR } from '../data/slownik';

export interface ChipDef {
  gk: string;
  label?: string;
  extra?: boolean;
}

export interface NumDef {
  key: string;
  label: string;
  unit: string;
  cal?: boolean;
  extra?: boolean;
}

export interface GridDef {
  kind: 'st' | 'tNeg' | 'q';
  hint?: string;
}

export interface StepDef {
  t: string;
  q: string;
  rev: string[];
  chips: ChipDef[];
  nums: NumDef[];
  grids: GridDef[];
}

export const MAIN: Record<string, string[]> = {
  rytm: ['zatokowy', 'af', 'flutter', 'vt'],
  P: ['norm', 'pulm', 'mitr', 'brak'],
  sa: ['sa1', 'sa2', 'zahamowanie'],
  av: ['av1', 'wenck', 'mob2', '21', 'av3'],
  iv: ['LBBB', 'RBBB', 'LAFB'],
  morf: ['lvh', 'niski'],
  T: ['norm', 'szpicz', 'hiper', 'plaskie'],
};

export const STEPS: StepDef[] = [
  {
    t: 'Rytm',
    q: 'Co jest przed QRS? Czy odstępy RR są równe?',
    rev: ['rytm'],
    chips: [{ gk: 'rytm' }, { gk: 'miar', label: 'Miarowość' }, { gk: 'dod', label: 'Dodatkowo', extra: true }],
    nums: [],
    grids: [],
  },
  {
    t: 'Częstość',
    q: 'Zmierz cyrklem RR (albo policz QRS na pasku 10 s × 6).',
    rev: ['czest'],
    chips: [],
    nums: [
      { key: 'hr', label: 'Komory', unit: '/min', cal: true },
      { key: 'ha', label: 'Przedsionki', unit: '/min', cal: true, extra: true },
    ],
    grids: [],
  },
  {
    t: 'Oś',
    q: 'Spójrz na QRS w I i aVF.',
    rev: ['os'],
    chips: [{ gk: 'os' }],
    nums: [{ key: 'osDeg', label: 'Stopnie', unit: '°', extra: true }],
    grids: [],
  },
  {
    t: 'Załamek P i PR',
    q: 'Kształt P w II i V1, odstęp PR na pasku.',
    rev: ['P', 'PR'],
    chips: [{ gk: 'P' }],
    nums: [{ key: 'pr', label: 'PR', unit: 'ms', cal: true }],
    grids: [],
  },
  {
    t: 'Przewodzenie',
    q: 'Zaznacz tylko, jeśli jest zaburzenie. Nic nie zaznaczone = przewodzenie prawidłowe.',
    rev: ['prz'],
    chips: [
      { gk: 'av', label: 'Przedsionkowo-komorowe (AV)' },
      { gk: 'iv', label: 'Śródkomorowe' },
      { gk: 'sa', label: 'Zatokowo-przedsionkowe (pauzy bez P)' },
    ],
    nums: [],
    grids: [],
  },
  {
    t: 'QRS',
    q: 'Szerokość QRS, woltaż, patologiczne Q.',
    rev: ['QRS', 'Q', 'morf'],
    chips: [{ gk: 'morf', label: 'Cechy' }],
    nums: [{ key: 'qrs', label: 'QRS', unit: 'ms', cal: true }],
    grids: [{ kind: 'q', hint: 'Kliknij odprowadzenia z patologicznym Q.' }],
  },
  {
    t: 'ST',
    q: 'Kliknij odprowadzenie: raz = uniesienie ↑, drugi raz = obniżenie ↓, trzeci = bez zmian.',
    rev: ['ST'],
    chips: [{ gk: 'stF', extra: true }],
    nums: [],
    grids: [{ kind: 'st' }],
  },
  {
    t: 'T i QT',
    q: 'Kierunek i kształt T; QT w II lub V5.',
    rev: ['T', 'QT'],
    chips: [{ gk: 'T' }, { gk: 'qtK', label: 'QT jest' }],
    nums: [{ key: 'qt', label: 'QT', unit: 'ms', cal: true }],
    grids: [{ kind: 'tNeg', hint: 'Kliknij odprowadzenia z tzw. ujemnym T (aVR pomiń – tam jest prawidłowo ujemny).' }],
  },
  {
    t: 'Wniosek',
    q: 'Wybierz rozpoznanie: najpierw dział, potem konkretne.',
    rev: ['wniosek'],
    chips: [],
    nums: [],
    grids: [],
  },
];

export function groupOf(gk: string): Group {
  return GR[gk];
}

export function isMain(gk: string, v: string): boolean {
  const m = MAIN[gk];
  return !m || m.indexOf(v) >= 0;
}

export function hasHidden(gk: string): boolean {
  const g = GR[gk];
  return g.o.some((o) => !isMain(gk, o[0]) && !(g.one && o[0] === 'brak'));
}

export const KATY: [string, string][] = [
  ['niedokrwienie', 'Niedokrwienie / zawał'],
  ['rytm', 'Zaburzenia rytmu'],
  ['przewodzenie', 'Przewodzenie'],
  ['elementy', 'P, Q, przerosty'],
  ['os', 'Oś'],
  ['elektrolity', 'Elektrolity'],
  ['inne', 'Inne'],
  ['nzk', 'NZK'],
];
