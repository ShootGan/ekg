import { describe, expect, it } from 'vitest';
import { leadsIn } from '../src/lib/kryteria';
import { PRZYPADKI } from '../src/data/przypadki';

describe('leadsIn', () => {
  it('czyta zakresy i listy odprowadzeń', () => {
    expect(leadsIn('uniesienie ST w V1–V4')).toEqual(['V1', 'V2', 'V3', 'V4']);
    expect(leadsIn('uniesienie ST w II, III, aVF; obniżenie w aVL')).toEqual(['II', 'III', 'aVL', 'aVF']);
    expect(leadsIn('ujemny T w I i aVL')).toEqual(['I', 'aVL']);
    expect(leadsIn('oś > +90° (I ujemne, aVF dodatnie)')).toEqual(['I', 'aVF']);
    expect(leadsIn('obniżenie ST w aVL (± I)')).toEqual(['I', 'aVL']);
  });

  it('nie myli stopnia bloku z odprowadzeniem', () => {
    expect(leadsIn('blok AV I stopnia, PR > 200 ms')).toEqual([]);
    expect(leadsIn('blok AV II stopnia typu Mobitz II')).toEqual([]);
    expect(leadsIn('V4R uniesienie')).toEqual([]);
  });

  it('zwraca tylko prawidłowe nazwy dla wszystkich kryteriów z banku', () => {
    const ok = new Set(['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']);
    for (const p of PRZYPADKI) for (const e of p.elementy) for (const l of leadsIn(e)) expect(ok.has(l)).toBe(true);
  });
});
