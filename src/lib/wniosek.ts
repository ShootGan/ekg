import { PRZYPADKI } from '../data/przypadki';
import type { Answer } from '../data/slownik';

export type TrainerAnswer = Answer & { dx?: string };

export interface WniosekResult {
  pkt: number | null;
  dxKey: string;
  powod: 'rozpoznanie' | 'dzial' | 'inne' | 'brak' | 'tekst';
}

export function dxKeyFor(id: string): string {
  const kase = PRZYPADKI.find((p) => p.id === id);
  if (!kase) return id;
  const same = PRZYPADKI.find((p) => p.rozpoznanie && p.rozpoznanie === kase.rozpoznanie);
  return same?.id || kase.id || id;
}

export function ocenWniosek(id: string, A: TrainerAnswer): WniosekResult {
  const kase = PRZYPADKI.find((p) => p.id === id);
  const dxKey = dxKeyFor(id);
  const dx = A.dx;
  const dxP = dx ? PRZYPADKI.find((p) => p.id === dx) : undefined;
  const pkt = dx
    ? dx === dxKey || (dxP && dxP.rozpoznanie === kase?.rozpoznanie)
      ? 2
      : dxP && dxP.kat === kase?.kat
        ? 1
        : 0
    : A.wniosek && String(A.wniosek).trim()
      ? null
      : 0;
  const powod: WniosekResult['powod'] =
    pkt === 2 ? 'rozpoznanie' : pkt === 1 ? 'dzial' : pkt === 0 ? (dx ? 'inne' : 'brak') : 'tekst';
  return { pkt, dxKey, powod };
}
