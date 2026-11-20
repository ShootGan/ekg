import { useCallback, useEffect, useMemo, useState } from 'react';
import { opis as autoOpis } from '../data/slownik';
import type { Answer } from '../data/slownik';
import type { TrainerAnswer } from '../lib/wniosek';

export interface Stored {
  A: TrainerAnswer;
  reczny: boolean;
  oddane: boolean;
  krok: number;
  opis: string;
}

export const EMPTY: TrainerAnswer = { leads: { stUp: [], stDn: [], tNeg: [], q: [] } };

const storeKey = (seed: number) => 'ekg-trener-odp-' + seed;

const num = (v: number | string | null | undefined): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

export function bazett(a: TrainerAnswer): number | null {
  const qt = num(a.qt), hr = num(a.hr);
  if (!qt || !hr) return null;
  return Math.round(qt / Math.sqrt(60 / hr));
}

function fresh(): Stored {
  return { A: { leads: { stUp: [], stDn: [], tNeg: [], q: [] } }, reczny: false, oddane: false, krok: 0, opis: '' };
}

function read(seed: number): Stored {
  try {
    const raw = localStorage.getItem(storeKey(seed));
    if (!raw) return fresh();
    const s = JSON.parse(raw) as Partial<Stored>;
    const A = (s.A || {}) as TrainerAnswer;
    return {
      A: { ...A, leads: { stUp: [], stDn: [], tNeg: [], q: [], ...(A.leads || {}) } },
      reczny: !!s.reczny,
      oddane: !!s.oddane,
      krok: s.krok || 0,
      opis: s.opis || '',
    };
  } catch {
    return fresh();
  }
}

function write(seed: number, s: Stored): void {
  try {
    localStorage.setItem(storeKey(seed), JSON.stringify(s));
  } catch {
    /* brak miejsca */
  }
}

export function clearSeed(seed: number): void {
  try {
    localStorage.removeItem(storeKey(seed));
  } catch {
    /* nic */
  }
}

export interface UseAnswer {
  A: TrainerAnswer;
  patch: (p: Partial<TrainerAnswer>) => void;
  toggle: (gk: string, v: string) => void;
  setOne: (gk: string, v: string) => void;
  setNum: (k: string, v: number | null) => void;
  toggleLead: (kind: string, n: string) => void;
  reset: () => void;
  oddane: boolean;
  setOddane: (v: boolean) => void;
  krok: number;
  setKrok: (v: number) => void;
  opis: string;
  setOpis: (v: string) => void;
  reczny: boolean;
  odnow: () => void;
  qtc: number | null;
}

export function useAnswer(seed: number): UseAnswer {
  const [S, setS] = useState<Stored>(() => read(seed));

  useEffect(() => {
    setS(read(seed));
  }, [seed]);

  const update = useCallback(
    (fn: (s: Stored) => Stored) => {
      setS((prev) => {
        const next = fn(prev);
        next.A = { ...next.A, qtc: bazett(next.A) };
        write(seed, next);
        return next;
      });
    },
    [seed]
  );

  const A = S.A;
  const qtc = useMemo(() => bazett(A), [A]);
  const auto = useMemo(() => autoOpis(A as Answer), [A]);
  const opis = S.reczny ? S.opis : auto;

  const patch = useCallback(
    (p: Partial<TrainerAnswer>) =>
      update((s) => ({ ...s, A: { ...s.A, ...p } as TrainerAnswer, oddane: false })),
    [update]
  );

  const toggle = useCallback(
    (gk: string, v: string) =>
      update((s) => {
        const cur = (s.A as Record<string, unknown>)[gk];
        const list = Array.isArray(cur) ? (cur as string[]).slice() : [];
        const i = list.indexOf(v);
        if (i >= 0) list.splice(i, 1);
        else list.push(v);
        return { ...s, A: { ...s.A, [gk]: list } as TrainerAnswer, oddane: false };
      }),
    [update]
  );

  const setOne = useCallback(
    (gk: string, v: string) =>
      update((s) => {
        const cur = (s.A as Record<string, unknown>)[gk];
        return { ...s, A: { ...s.A, [gk]: cur === v ? null : v } as TrainerAnswer, oddane: false };
      }),
    [update]
  );

  const setNum = useCallback(
    (k: string, v: number | null) =>
      update((s) => {
        const next = { ...s.A, [k]: v } as TrainerAnswer;
        if (k === 'qt' || k === 'hr') next.qtc = bazett(next);
        return { ...s, A: next, oddane: false };
      }),
    [update]
  );

  const toggleLead = useCallback(
    (kind: string, n: string) =>
      update((s) => {
        const L: Record<string, string[]> = { stUp: [], stDn: [], tNeg: [], q: [], ...(s.A.leads || {}) };
        const del = (m: string) => {
          L[m] = (L[m] || []).filter((x) => x !== n);
        };
        if (kind === 'st') {
          if ((L.stUp || []).indexOf(n) >= 0) {
            del('stUp');
            L.stDn = [...(L.stDn || []), n];
          } else if ((L.stDn || []).indexOf(n) >= 0) del('stDn');
          else L.stUp = [...(L.stUp || []), n];
        } else if ((L[kind] || []).indexOf(n) >= 0) del(kind);
        else L[kind] = [...(L[kind] || []), n];
        return { ...s, A: { ...s.A, leads: L as TrainerAnswer['leads'] }, oddane: false };
      }),
    [update]
  );

  const reset = useCallback(
    () => update(() => ({ ...fresh(), krok: 0 })),
    [update]
  );

  const setOpis = useCallback(
    (v: string) => update((s) => ({ ...s, opis: v, reczny: true })),
    [update]
  );

  const odnow = useCallback(() => update((s) => ({ ...s, reczny: false, opis: '' })), [update]);
  const setKrok = useCallback((v: number) => update((s) => ({ ...s, krok: v })), [update]);
  const setOddane = useCallback((v: boolean) => update((s) => ({ ...s, oddane: v })), [update]);

  return {
    A,
    patch,
    toggle,
    setOne,
    setNum,
    toggleLead,
    reset,
    oddane: S.oddane,
    setOddane,
    krok: S.krok,
    setKrok,
    opis,
    setOpis,
    reczny: S.reczny,
    odnow,
    qtc,
  };
}
