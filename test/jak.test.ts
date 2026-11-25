import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/lib/generate';
import { CECHY, quizCech } from '../src/lib/cechy';
import { JAK, nieTu } from '../src/data/jak';
import { PRZYPADKI } from '../src/data/przypadki';

describe('wyjaśnienia pułapek', () => {
  it('każda cecha z katalogu ma kryterium', () => {
    expect(CECHY.filter((c) => !JAK[c.id]).map((c) => c.id)).toEqual([]);
  });

  it('liczby w wyjaśnieniu nie przeczą zapisowi', () => {
    for (const p of PRZYPADKI)
      for (const seed of [3, 7]) {
        const g = generateCase({ seed, id: p.id });
        const qrs = g.M.qrs ?? 0;
        const pr = g.key.klucz.pr;
        const hr = g.key.klucz.hr;
        for (const c of quizCech(g, seed).filter((x) => !x.jest)) {
          const t = nieTu(c.id, g);
          const ctx = `${p.id}/${c.id}: ${t}`;
          if (t.includes('potrzeba co najmniej 120 ms')) expect(qrs, ctx).toBeLessThan(120);
          if (t.includes('zaczyna się powyżej 200 ms')) expect(pr ?? 0, ctx).toBeLessThanOrEqual(200);
          if (t.includes('bradykardia to mniej')) expect(hr ?? 0, ctx).toBeGreaterThanOrEqual(60);
          if (t.includes('tachykardia to więcej')) expect(hr ?? 999, ctx).toBeLessThanOrEqual(100);
          if (t.includes('odstępy RR są równe')) expect(['wenck', 'mob2', '21', 'av3', 'sa'].includes(c.id), ctx).toBe(false);
        }
      }
  });
});
