import type { Computed } from '../compute';

export const SR = 500;
const BLK = 250;
const MAX = 900;

const caches = new WeakMap<Computed, Map<string, Float32Array>>();

function store(c: Computed): Map<string, Float32Array> {
  let m = caches.get(c);
  if (!m) {
    m = new Map<string, Float32Array>();
    caches.set(c, m);
  }
  return m;
}

export function bsearchT(arr: { t: number }[], t: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    if (arr[m].t <= t) {
      r = m;
      lo = m + 1;
    } else hi = m - 1;
  }
  return r;
}

export function sampleBlock(c: Computed, lead: string, blk: number): Float32Array {
  const cache = store(c);
  const key = lead + '|' + blk;
  const hit = cache.get(key);
  if (hit) return hit;
  const a = new Float32Array(BLK);
  const t0 = blk * 0.5;
  const S = c.S;
  const lo = bsearchT(S.ev, t0 - 1.2);
  const hi = bsearchT(S.ev, t0 + 0.7);
  const lo2 = bsearchT(S.atr, t0 - 0.7);
  const hi2 = bsearchT(S.atr, t0 + 0.6);
  const mini = {
    ...S,
    ev: S.ev.slice(Math.max(0, lo), hi + 1),
    atr: S.atr.slice(Math.max(0, lo2), hi2 + 1),
    sp: []
  };
  for (let i = 0; i < BLK; i++) a[i] = c.gen.lead(lead, t0 + i / SR, mini, {});
  cache.set(key, a);
  if (cache.size > MAX) {
    const first = cache.keys().next().value;
    if (first != null) cache.delete(first);
  }
  return a;
}

export function sampleAt(c: Computed, lead: string, i: number): number {
  if (i < 0) return 0;
  return sampleBlock(c, lead, Math.floor(i / BLK))[i % BLK];
}
