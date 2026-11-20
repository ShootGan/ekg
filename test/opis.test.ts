import { describe, expect, it } from 'vitest';
import { generateCase } from '../src/lib/generate';
import { cechyZapisu } from '../src/lib/cechy';
import { CECHY_KROKU, KRYTYCZNE, KROKI, ocenOpis, oczekiwanePost, type OdpowiedzOpisu } from '../src/lib/opis';
import { PRZYPADKI } from '../src/data/przypadki';

const pusta: OdpowiedzOpisu = { sel: [], pomiary: {}, dx: '', post: '' };

describe('pełny opis', () => {
  it('ma 5 kroków, a każda cecha poza normą jest w dokładnie jednym kroku', () => {
    expect(KROKI).toHaveLength(5);
    const ids = CECHY_KROKU.flat().map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('norma');
  });

  it('komplet trafień, rozpoznanie i postępowanie dają 100%', () => {
    for (const p of PRZYPADKI) {
      const g = generateCase({ seed: 5, id: p.id });
      const jest = cechyZapisu(g).jest.map((c) => c.id);
      const post = oczekiwanePost(new Set(jest), p.kat)[0];
      const W = ocenOpis(g, { sel: jest, pomiary: {}, dx: g.key.id, post });
      expect(W.wynik, p.id).toBe(100);
      expect(W.przeoczoneKrytyczne, p.id).toHaveLength(0);
    }
  });

  it('pusty opis daje 0% i wylicza przeoczone krytyczne', () => {
    const g = generateCase({ seed: 5, id: 'stemi-dolny' });
    const W = ocenOpis(g, pusta);
    expect(W.wynik).toBe(0);
    expect(W.przeoczoneKrytyczne.map((c) => c.id)).toContain('stUp');
  });

  it('przeoczony STEMI kosztuje więcej niż przeoczona zmiana niekrytyczna', () => {
    const g = generateCase({ seed: 5, id: 'stemi-dolny' });
    const jest = cechyZapisu(g).jest.map((c) => c.id);
    const bezSt = ocenOpis(g, { ...pusta, sel: jest.filter((x) => x !== 'stUp') });
    const inna = jest.find((x) => x !== 'stUp' && !KRYTYCZNE.has(x));
    expect(inna).toBeTruthy();
    const bezInnej = ocenOpis(g, { ...pusta, sel: jest.filter((x) => x !== inna) });
    expect(bezSt.zmiany).toBeLessThan(bezInnej.zmiany);
  });

  it('nadmiarowa zmiana obniża wynik, a niepewna nie', () => {
    const g = generateCase({ seed: 5, id: 'stemi-dolny' });
    const { jest, niepewne } = cechyZapisu(g);
    const ids = jest.map((c) => c.id);
    const base = ocenOpis(g, { ...pusta, sel: ids }).zmiany;
    expect(ocenOpis(g, { ...pusta, sel: [...ids, 'LBBB'] }).zmiany).toBeLessThan(base);
    const n = [...niepewne][0];
    if (n) expect(ocenOpis(g, { ...pusta, sel: [...ids, n] }).zmiany).toBe(base);
  });

  it('pomiary są opcjonalne i sprawdzane z tolerancją', () => {
    const g = generateCase({ seed: 5, id: 'av1' });
    const W = ocenOpis(g, pusta);
    expect(W.pomiary.every((p) => p.ok === null)).toBe(true);
    const pr = g.key.klucz.pr as number;
    expect(ocenOpis(g, { ...pusta, pomiary: { pr: pr + 20 } }).pomiary.find((p) => p.m === 'pr')?.ok).toBe(true);
    expect(ocenOpis(g, { ...pusta, pomiary: { pr: pr + 80 } }).pomiary.find((p) => p.m === 'pr')?.ok).toBe(false);
  });

  it('postępowanie: STEMI → PCI, NZK → resuscytacja, norma → bez interwencji', () => {
    expect(oczekiwanePost(new Set(['zatokowy', 'stUp']), 'niedokrwienie')).toEqual(['pci']);
    expect(oczekiwanePost(new Set(['vf']), 'nzk')).toEqual(['nzk']);
    expect(oczekiwanePost(new Set(['zatokowy', 'norma']), 'inne')).toEqual(['brak']);
  });
});
