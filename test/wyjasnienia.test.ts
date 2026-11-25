import { describe, expect, it } from 'vitest';
import { PRZYPADKI } from '../src/data/przypadki';
import { WYJASNIENIA } from '../src/data/wyjasnienia';

describe('wyjaśnienia przypadków', () => {
  it('każdy przypadek z banku ma wyjaśnienie', () => {
    const brak = PRZYPADKI.filter((p) => !(WYJASNIENIA[p.id] && WYJASNIENIA[p.id].length > 120)).map((p) => p.id);
    expect(brak).toEqual([]);
  });

  it('nie ma wyjaśnień do nieistniejących przypadków', () => {
    const ids = new Set(PRZYPADKI.map((p) => p.id));
    expect(Object.keys(WYJASNIENIA).filter((k) => !ids.has(k))).toEqual([]);
  });

});
