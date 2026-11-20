import { describe, expect, it } from 'vitest';
import { buildQuiz } from '../src/lib/quiz';
import { generateCase } from '../src/lib/generate';
import { PRZYPADKI } from '../src/data/przypadki';

describe('quiz: poprawna odpowiedź zawsze jest wśród opcji', () => {
  for (const c of PRZYPADKI) {
    it(c.id, () => {
      const { key } = generateCase({ seed: 31337, id: c.id });
      const q = buildQuiz(key.id, 31337);
      expect(q.options).toHaveLength(4);
      const correct = q.options.filter((o) => o.correct);
      expect(correct).toHaveLength(1);
      expect(correct[0].id).toBe(q.correctId);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
      expect(q.options.some((o) => o.id === q.correctId)).toBe(true);
    });
  }
});

describe('quiz: deterministyczny dla tego samego seeda', () => {
  it('te same opcje', () => {
    const a = buildQuiz('stemi-dolny', 987654);
    const b = buildQuiz('stemi-dolny', 987654);
    expect(a.options.map((o) => o.id)).toEqual(b.options.map((o) => o.id));
  });

  it('różne seedy dają różną kolejność', () => {
    const orders = new Set<string>();
    for (let s = 1; s <= 6; s++) orders.add(buildQuiz('stemi-dolny', s).options.map((o) => o.id).join(','));
    expect(orders.size).toBeGreaterThan(1);
  });
});
