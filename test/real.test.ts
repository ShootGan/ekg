import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/lib/generate';
import { buildQuiz } from '../src/lib/quiz';
import { PRZYPADKI } from '../src/data/przypadki';

const SEEDS = Array.from({ length: 400 }, (_, i) => 1000 + i * 7919);
const NOISE = ['wander', 'emg', 'tremor', 'hum', 'badLead', 'artifact'];
const REAL = PRZYPADKI.filter((x) => x.id.startsWith('real-'));

describe('zapisy z kilkoma zmianami', () => {
  it('są w zwykłej puli razem z podręcznikowymi', () => {
    const ids = SEEDS.map((seed) => generateCase({ seed }).key.id);
    expect(ids.some((id) => id.startsWith('real-'))).toBe(true);
    expect(ids.some((id) => !id.startsWith('real-'))).toBe(true);
  });

  it('wszystkie mają poziom trudny', () => {
    for (const p of REAL) expect(p.poziom, p.id).toBe(3);
  });

  it('nie mają sztucznego szumu i mają kilka zmian', () => {
    for (const p of REAL) {
      for (const k of NOISE) expect(p.ecg[k], `${p.id}.${k}`).toBeUndefined();
      expect(p.rozpoznanie, p.id).toMatch(/\+/);
    }
  });

  it('w quizie rozpoznań dystraktory do real-* też są wielozmianowe', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const q = buildQuiz('real-af-lbbb', seed);
      for (const o of q.options) expect(o.id.startsWith('real-')).toBe(true);
      const b = buildQuiz('lbbb', seed);
      for (const o of b.options) expect(o.id.startsWith('real-')).toBe(false);
    }
  });

  it('konkretny przypadek po id działa', () => {
    expect(generateCase({ seed: 1, id: 'real-tamponada-alternans' }).key.id).toBe('real-tamponada-alternans');
  });
});
