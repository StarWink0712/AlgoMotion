import { describe, expect, it } from 'vitest';
import { recorder } from '../src/engine/recorder';
import { runProblem } from '../src/engine/run';

describe('preset snapshot zero normalization', () => {
  it('normalizes nested input, state and output without changing live data', () => {
    const input = { nums: [-0, 2], nested: { value: -0 } };
    const { state, emit, finish } = recorder('maximum-subarray', input);
    state.values = input.nums;
    state.variables = { view: { cells: [{ value: -0 }], tuple: ['-0', -0, false, null] }, total: -0 };
    state.pointers = { i: -0 };
    emit('init', 'init', 'snapshot');
    const result = { value: -0, items: [-0, '-0'] }, trace = finish(result, 'return');
    expect(trace.input).toEqual({ nums: [0, 2], nested: { value: 0 } });
    expect(trace.frames[0].values).toEqual([0, 2]);
    expect(trace.frames[0].pointers.i).toBe(0);
    expect(trace.frames[0].variables).toEqual({ view: { cells: [{ value: 0 }], tuple: ['-0', 0, false, null] }, total: 0 });
    expect(trace.result).toEqual({ value: 0, items: [0, '-0'] });
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    expect(Object.is(input.nums[0], -0)).toBe(true);
    expect(Object.is(input.nested.value, -0)).toBe(true);
    expect(Object.is(state.variables.total, -0)).toBe(true);
    expect(Object.is(result.value, -0)).toBe(true);
    trace.frames.at(-1)!.values[1] = 99;
    expect(trace.frames[0].values[1]).toBe(2);
  });

  it('handles a scalar negative-zero input and return value', () => {
    const { finish } = recorder('maximum-subarray', -0), trace = finish(-0, 'return');
    expect(trace.input).toBe(0); expect(trace.result).toBe(0); expect(trace.frames[0].result).toBe(0);
  });

  it('preserves nonzero numbers and literal text', () => {
    const input = { values: [-1, 0, 1.25, '-0', '0', false, null] };
    const trace = recorder('maximum-subarray', input).finish(input, 'return');
    expect(trace.input).toEqual(input); expect(trace.result).toEqual(input);
  });

  for (const [id, input] of [
    ['min-stack', JSON.parse('{"operations":[{"op":"push","value":-0},{"op":"top"},{"op":"getMin"}]}')],
    ['maximum-subarray', { nums: [-0] }],
    ['maximum-product-subarray', { nums: [-0, -1] }],
  ] as const) it(`keeps ${id} round-trip stable for negative zero`, () => {
    const before = structuredClone(input), trace = runProblem(id, input);
    expect(JSON.parse(JSON.stringify(trace))).toEqual(trace);
    expect(input).toEqual(before);
  });
});
