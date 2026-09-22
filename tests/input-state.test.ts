import { describe, expect, it } from 'vitest';
import { inputMatchesExecution } from '../src/engine/input-state';

describe('draft input versus executed input', () => {
  it.each([
    [' { "target": 6, "nums": [3, 3] } ', { nums: [3, 3], target: 6 }, true],
    ['{"s":"中文"}', { s: '中文' }, true],
    ['{"nums":[]}', { nums: [] }, true],
    ['{"grid":[[0,null],[false,""]]}', { grid: [[0, null], [false, '']] }, true],
    ['{"value":1.0}', { value: 1 }, true],
    ['{"value":0}', { value: false }, false],
    ['{"nums":[2,1]}', { nums: [1, 2] }, false],
    ['{"nums":[]}', { nums: [1] }, false],
    ['{}', { value: null }, false],
    ['{"value":0,"extra":1}', { value: 0 }, false],
    ['{"value":{"nested":1}}', { value: 1 }, false],
    ['{"__proto__":{"polluted":true}}', {}, false],
    ['{"nums":', { nums: [] }, false],
    ['', {}, false],
  ])('compares %s without executing code', (draft, executed, expected) => {
    expect(inputMatchesExecution(draft, executed)).toBe(expected);
  });
});
