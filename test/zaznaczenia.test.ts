import { describe, expect, it } from 'vitest';
import { PRZYPADKI } from '../src/data/przypadki';
import { generateCase } from '../src/lib/generate';
import { diagnosticMarks, kryterium, marksFor } from '../src/lib/kryteria';

const SEEDS = [11, 4242, 90210, 777001];
const STOCHASTIC = ['pvc', 'pac'];

describe('kryterium', () => {
  it('rozpoznaje kryteria kliniczne i nieobecne', () => {
    expect(kryterium('wniosek: przebyty zawał dolny').wizualne).toBe(false);
    expect(kryterium('przyczyna polekowa').wizualne).toBe(false);
    expect(kryterium('brak uniesień ST – zmiana stara').wizualne).toBe(false);
    const n = kryterium('naprzemienność elektryczna – na tym zapisie nieobecna');
    expect(n.wizualne).toBe(false);
    expect(n.nieobecne).toBe(true);
  });

  it('kryteria wizualne dostają odprowadzenia lub cechy', () => {
    const k = kryterium('uniesienie ST w II, III, aVF');
    expect(k.wizualne).toBe(true);
    expect(k.leads).toEqual(['II', 'III', 'aVF']);
    expect(k.tags).toContain('ST');
    expect(kryterium('fale U (najlepiej V2–V3)').tags).toContain('U');
  });
});

describe('znaczniki kryteriów', () => {
  for (const p of PRZYPADKI) {
    it(`${p.id}: każde kryterium wizualne ma znacznik`, () => {
      for (const seed of SEEDS) {
        const g = generateCase({ seed, id: p.id });
        const all = g.key.zaznaczenia;
        for (const el of p.elementy) {
          const k = kryterium(el);
          if (!k.wizualne) continue;
          if (k.tags.some((t) => STOCHASTIC.includes(t)) && !all.some((m) => (m.c ?? []).some((t) => STOCHASTIC.includes(t)))) continue;
          const ms = marksFor(k, all);
          expect(ms.length, `${p.id} seed ${seed}: „${el}”`).toBeGreaterThan(0);
          for (const m of ms) {
            expect(m.t1).toBeGreaterThan(m.t0);
            expect(m.txt.length).toBeGreaterThan(0);
          }
        }
      }
    });
  }

  it('naprzemienność w tamponadzie jest narysowana i oznaczona', () => {
    const g = generateCase({ seed: 5, id: 'niski-woltaz-tamponada' });
    expect(g.EX.ecg.alternans).toBeGreaterThan(0);
    expect(g.key.zaznaczenia.some((m) => (m.c ?? []).includes('alternans'))).toBe(true);
    expect(g.key.zaznaczenia.some((m) => (m.c ?? []).includes('niski'))).toBe(true);
  });

  it('znaczniki PVC i PAC pojawiają się przynajmniej w części seedów', () => {
    for (const [id, tag] of [['pvc-czeste', 'pvc'], ['pac', 'pac']] as const) {
      const n = SEEDS.filter((seed) => generateCase({ seed, id }).key.zaznaczenia.some((m) => (m.c ?? []).includes(tag))).length;
      expect(n).toBeGreaterThan(0);
    }
  });

  it('diagnosticMarks nie usuwa znaczników diagnostycznych', () => {
    const g = generateCase({ seed: 11, id: 'wenckebach' });
    const d = diagnosticMarks(g.key.zaznaczenia, 'wenckebach');
    expect(d.some((m) => m.txt === 'P bez QRS')).toBe(true);
    expect(d.some((m) => (m.c ?? []).includes('grupy'))).toBe(true);
  });
});
