import { PRZYPADKI } from '../data/przypadki';

export interface Entry {
  seed: number;
  id: string;
  kat: string;
  poziom: number;
  data: string;
  wynik: number;
  uwaga: string;
  tryb?: 'quiz' | 'opis';
}

export interface KatStat {
  kat: string;
  avg: number;
  n: number;
}

const KEY = 'ekg-trener-historia';

function katOf(id: string): string {
  return PRZYPADKI.find((p) => p.id === id)?.kat || '?';
}

export function readAll(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? (data as Entry[]) : [];
  } catch {
    return [];
  }
}

export function saveEntry(e: Omit<Entry, 'kat' | 'data'> & { kat?: string; data?: string }): Entry {
  const all = readAll();
  const entry: Entry = {
    seed: e.seed,
    id: e.id,
    kat: e.kat || katOf(e.id),
    poziom: e.poziom,
    data: e.data || new Date().toISOString().slice(0, 10),
    wynik: Math.round(e.wynik),
    uwaga: e.uwaga || '',
    tryb: e.tryb,
  };
  const i = all.findIndex((x) => x.seed === entry.seed && (x.tryb ?? 'opis') === (entry.tryb ?? 'opis'));
  if (i >= 0) all[i] = entry;
  else all.push(entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* brak miejsca – zostaje tylko w pamięci */
  }
  return entry;
}

const avg = (a: number[]) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);

export function statsByKat(tryb?: 'quiz' | 'opis'): KatStat[] {
  const kat: Record<string, number[]> = {};
  for (const h of readAll()) {
    if (h.wynik == null) continue;
    if (tryb && (h.tryb ?? 'opis') !== tryb) continue;
    const k = h.kat || katOf(h.id);
    (kat[k] = kat[k] || []).push(h.wynik);
  }
  return Object.entries(kat)
    .map(([k, w]) => ({ kat: k, avg: avg(w), n: w.length }))
    .sort((a, b) => a.avg - b.avg);
}

export function weakEntries(limit = 10): Entry[] {
  return readAll().filter((h) => h.wynik != null && h.wynik < 70).slice(-limit);
}

export function lastIds(n = 12): string[] {
  return readAll().slice(-n).map((h) => h.id);
}

export function weakestKat(tryb?: 'quiz' | 'opis'): KatStat | null {
  const s = statsByKat(tryb);
  return s.length ? s[0] : null;
}

export function clearAll(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nic */
  }
}
