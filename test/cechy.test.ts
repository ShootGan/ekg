import { describe, expect, it } from 'vitest';
import { PRZYPADKI } from '../src/data/przypadki';
import { generateCase } from '../src/lib/generate';
import { cechyZapisu, quizCech } from '../src/lib/cechy';

const has = (id: string, seed = 11) => cechyZapisu(generateCase({ seed, id })).jest.map((c) => c.id);
const ZLOSLIWE = ['vt', 'tdp', 'vf', 'asystolia'];

describe('cechy zapisu', () => {
  it('rozpoznaje współistniejące zmiany', () => {
    expect(has('real-af-lbbb')).toEqual(expect.arrayContaining(['af', 'LBBB', 'szerQRS']));
    expect(has('real-stemi-dolny-wenck')).toEqual(expect.arrayContaining(['wenck', 'stUp', 'zatokowy']));
    expect(has('real-lvh-lafb-av1')).toEqual(expect.arrayContaining(['av1', 'LAFB', 'osL', 'lvh']));
    expect(has('real-pochp')).toEqual(expect.arrayContaining(['pulm', 'osP', 'iRBBB', 'niski', 'tachykardia']));
    expect(has('real-hiperk-dializa')).toEqual(expect.arrayContaining(['pPlaskie', 'szerQRS', 'szpicz', 'av1', 'bradykardia']));
    expect(has('real-tamponada-alternans')).toEqual(expect.arrayContaining(['niski', 'alternans', 'tachykardia']));
    expect(has('zatorowosc-subtelna')).toContain('s1q3t3');
  });

  it('zapis prawidłowy to „bez patologii”, a nie pusty quiz', () => {
    expect(has('sinus-norma')).toEqual(['norma', 'zatokowy']);
    expect(has('af-normo')).not.toContain('zatokowy');
    expect(has('lbbb')).not.toContain('stUp');
    expect(has('stemi-dolny')).not.toContain('norma');
  });

  for (const p of PRZYPADKI) {
    it(`${p.id}: wszystkie patologie w quizie, fałszywe pewnie nieobecne`, () => {
      for (const seed of [11, 4242, 90210]) {
        const g = generateCase({ seed, id: p.id });
        const z = cechyZapisu(g);
        const q = quizCech(g, seed);
        const jest = new Set(z.jest.map((c) => c.id));
        const patol = z.jest.filter((c) => c.id !== 'zatokowy').map((c) => c.id);
        expect(patol.length).toBeGreaterThan(0);
        for (const id of patol) expect(q.some((c) => c.id === id && c.jest)).toBe(true);
        expect(q.length).toBeGreaterThanOrEqual(5);
        expect(q.filter((c) => !c.jest).length).toBeGreaterThanOrEqual(2);
        expect(new Set(q.map((c) => c.id)).size).toBe(q.length);
        for (const c of q) {
          expect(jest.has(c.id)).toBe(c.jest);
          if (!c.jest) expect(z.niepewne.has(c.id)).toBe(false);
        }
        if (!['tachykardia', 'szerQRS', 'vt', 'vf', 'asystolia'].some((x) => jest.has(x))) for (const c of q) expect(ZLOSLIWE.includes(c.id) && !c.jest).toBe(false);
      }
    });
  }
});

it('nie pyta o tachykardię przy bradykardii i odwrotnie', () => {
  for (const id of ['hiperkaliemia', 'tachykardia-zatokowa', 'bradykardia-zatokowa']) {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const q = quizCech(generateCase({ seed, id }), seed);
      const ids = q.map((c) => c.id);
      expect(ids.includes('bradykardia') && ids.includes('tachykardia')).toBe(false);
    }
  }
});
