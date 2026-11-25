import { describe, expect, it } from 'vitest';
import { create } from '../src/model/ecg';
import { mulberry32 } from '../src/lib/rng';
import { generateCase } from '../src/lib/generate';

describe('zatrzymanie komór', () => {
  it('są załamki P, ale żaden nie przechodzi do komór', () => {
    const g = generateCase({ seed: 905413785, id: 'zatrzymanie-komor' });
    const gen = create();
    gen.config(g.EX.ecg);
    const S = gen.scheduler();
    gen.schedule(S, { t0: -1.5, rand: mulberry32(1) }, 11.5);
    expect(S.atr.length).toBeGreaterThan(5);
    expect(S.ev.length).toBe(0);
  });
});
