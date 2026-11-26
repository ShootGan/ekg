import { describe, expect, it } from 'vitest';
import { PRZYPADKI } from '../src/data/przypadki';
import { generateCase } from '../src/lib/generate';
import { quizCech } from '../src/lib/cechy';

const SEEDS = [11, 4242, 90210, 7, 99];

describe('spójność kryteriów z wydrukiem', () => {
  it('tachykardia i bradykardia w kryteriach zgadzają się z pomiarem', () => {
    for (const p of PRZYPADKI)
      for (const seed of SEEDS) {
        const g = generateCase({ seed, id: p.id });
        const hr = g.key.klucz.hr ?? 0;
        for (const el of p.elementy) {
          if (/tachykardi/i.test(el)) expect(hr, `${p.id}/${seed}: ${el}`).toBeGreaterThan(100);
          if (/bradykardi/i.test(el)) expect(hr, `${p.id}/${seed}: ${el}`).toBeLessThan(60);
        }
      }
  });

  it('każde pobudzenie przedwczesne w opcjach ma znacznik na wydruku', () => {
    for (const p of PRZYPADKI)
      for (const seed of SEEDS) {
        const g = generateCase({ seed, id: p.id });
        for (const c of quizCech(g, seed).filter((x) => x.jest && (x.id === 'pvc' || x.id === 'pac')))
          expect(g.key.zaznaczenia.some((m) => (m.c ?? []).includes(c.id)), `${p.id}/${seed}: ${c.id}`).toBe(true);
      }
  });

  it('Sokolow-Lyon >35 mm jest widoczny, gdy kryterium go cytuje', () => {
    for (const p of PRZYPADKI) {
      if (!p.elementy.some((e) => /Sokolow-Lyon\s*>\s*35/.test(e))) continue;
      for (const seed of SEEDS) {
        const g = generateCase({ seed, id: p.id });
        expect(g.key.zaznaczenia.some((m) => m.txt.includes('SV1+RV5')), `${p.id}/${seed}`).toBe(true);
      }
    }
  });

  it('stopka nie podaje QTc, gdy klucz uznaje pomiar za nieoceniany', () => {
    for (const id of ['vt-mono', 'tdp', 'af-rvr', 'af-normo', 'af-wolne'])
      for (const seed of SEEDS) {
        const g = generateCase({ seed, id });
        expect(g.key.klucz.qtc, `${id}/${seed}`).toBeNull();
        expect(g.key.pomiary, `${id}/${seed}`).toMatch(/QT\/QTc ---\/---/);
      }
  });

  it('T spłaszczone nie jest rysowane, gdy klucz uznaje T za prawidłowe', () => {
    const g = generateCase({ seed: 11, id: 'real-tamponada-alternans' });
    expect(g.key.klucz.T.req).not.toContain('plaskie');
    expect(g.key.zaznaczenia.some((m) => m.txt === 'T spłaszczone')).toBe(false);
  });
});
