import { describe, expect, it } from 'vitest';
import { PRZYPADKI } from '../src/data/przypadki';
import { ZAB } from '../src/data/atlas';
import { ATLAS_LINK, WYJASNIENIA } from '../src/data/wyjasnienia';

describe('wyjaśnienia przypadków', () => {
  it('każdy przypadek z banku ma wyjaśnienie', () => {
    const brak = PRZYPADKI.filter((p) => !(WYJASNIENIA[p.id] && WYJASNIENIA[p.id].length > 120)).map((p) => p.id);
    expect(brak).toEqual([]);
  });

  it('nie ma wyjaśnień do nieistniejących przypadków', () => {
    const ids = new Set(PRZYPADKI.map((p) => p.id));
    expect(Object.keys(WYJASNIENIA).filter((k) => !ids.has(k))).toEqual([]);
  });

  it('odnośniki do atlasu prowadzą do istniejących wzorców', () => {
    const atlas = new Set(ZAB.map((z) => z.id));
    const ids = new Set(PRZYPADKI.map((p) => p.id));
    for (const [k, v] of Object.entries(ATLAS_LINK)) {
      expect(ids.has(k)).toBe(true);
      expect(atlas.has(v)).toBe(true);
    }
  });
});
