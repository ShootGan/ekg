import { PRZYPADKI } from '../data/przypadki';
import { listaRozpoznan, type Rozp } from './generate';
import { mulberry32 } from './rng';
import { dxKeyFor } from './wniosek';

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface QuizQ {
  options: QuizOption[];
  correctId: string;
  correctText: string;
}

const CONFUSABLE: string[][] = [
  ['lvh', 'nadcisnienie-lvh-pm'],
  ['p-pulmonale', 'rvh'],
  ['stemi-dolny', 'stemi-dolny-pk', 'stemi-dolno-tylny'],
  ['stemi-tylny', 'stemi-dolno-tylny'],
  ['af-normo', 'af-rvr', 'af-wolne'],
  ['av-2-1', 'mobitz2'],
  ['av-2-1', 'wenckebach']
];

function confusable(a: string, b: string): boolean {
  return CONFUSABLE.some((g) => g.includes(a) && g.includes(b));
}

function take(pool: Rozp[], n: number, rnd: () => number): Rozp[] {
  const copy = pool.slice();
  const out: Rozp[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}

export function buildQuiz(caseId: string, seed: number, count = 4): QuizQ {
  const all = listaRozpoznan();
  const correctId = dxKeyFor(caseId);
  const correct = all.find((r) => r.id === correctId) || all[0];
  const kat = PRZYPADKI.find((p) => p.id === caseId)?.kat;
  const real = correctId.startsWith('real-');
  const others = all.filter((r) => r.id !== correctId && !confusable(r.id, correctId) && r.id.startsWith('real-') === real);
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const same = real ? others : others.filter((r) => r.kat === kat);
  const rest = others.filter((r) => r.kat !== kat);

  const picks = take(same, count - 1, rnd);
  if (picks.length < count - 1) picks.push(...take(rest, count - 1 - picks.length, rnd));

  const options: QuizOption[] = picks.map((p) => ({ id: p.id, text: p.t, correct: false }));
  options.push({ id: correct.id, text: correct.t, correct: true });
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = options[i];
    options[i] = options[j];
    options[j] = t;
  }
  return { options, correctId: correct.id, correctText: correct.t };
}
