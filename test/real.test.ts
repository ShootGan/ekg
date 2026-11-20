import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/lib/generate';
import { buildQuiz } from '../src/lib/quiz';
import { PRZYPADKI } from '../src/data/przypadki';

const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 7919);
const NOISE = ['wander', 'emg', 'tremor', 'hum', 'badLead', 'artifact'];

describe('przełącznik Real', () => {
  it('bez Real losuje tylko przypadki podręcznikowe', () => {
    for (const seed of SEEDS) expect(generateCase({ seed }).key.id.startsWith('real-')).toBe(false);
  });

  it('z Real losuje tylko przypadki wielozmianowe', () => {
    for (const seed of SEEDS) expect(generateCase({ seed, real: true }).key.id.startsWith('real-')).toBe(true);
  });

  it('z Real i filtrem bez przypadków real-* wraca do podręcznikowych', () => {
    expect(generateCase({ seed: 3, real: true, kat: 'nzk' }).key.id.startsWith('real-')).toBe(false);
  });

  it('przypadki real-* nie mają sztucznego szumu i mają kilka zmian', () => {
    for (const p of PRZYPADKI.filter((x) => x.id.startsWith('real-'))) {
      for (const k of NOISE) expect(p.ecg[k], `${p.id}.${k}`).toBeUndefined();
      expect(p.rozpoznanie, p.id).toMatch(/\+/);
    }
  });

  it('w quizie dystraktory do real-* też są wielozmianowe', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const q = buildQuiz('real-af-lbbb', seed);
      for (const o of q.options) expect(o.id.startsWith('real-')).toBe(true);
      const b = buildQuiz('lbbb', seed);
      for (const o of b.options) expect(o.id.startsWith('real-')).toBe(false);
    }
  });

  it('konkretny przypadek po id działa niezależnie od przełącznika', () => {
    expect(generateCase({ seed: 1, id: 'real-tamponada-alternans' }).key.id).toBe('real-tamponada-alternans');
  });
});
