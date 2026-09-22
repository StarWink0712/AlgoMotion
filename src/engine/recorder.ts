import type { Frame, ProblemId, Trace } from './types';

function snapshot<T>(value: T): T {
  const copy = structuredClone(value);
  // Integer traces use one zero representation in memory and in exported JSON.
  const normalize = (item: unknown): unknown => {
    if (Object.is(item, -0)) return 0;
    if (item !== null && typeof item === 'object') {
      for (const key of Object.keys(item)) {
        const fields = item as Record<string, unknown>;
        fields[key] = normalize(fields[key]);
      }
    }
    return item;
  };
  return normalize(copy) as T;
}

export function recorder(id: ProblemId, input: unknown) {
  const trace: Trace = { version: 2, problemId: id, input: snapshot(input), frames: [], result: null };
  const state: Omit<Frame, 'step' | 'location' | 'action' | 'explanation'> = {
    values: [], active: [], settled: [], pointers: {}, variables: {},
  };
  const emit = (location: string, action: string, explanation: string) => {
    if (trace.frames.length >= 1000) throw new Error('轨迹超过安全步数上限。');
    trace.frames.push(snapshot({ ...state, step: trace.frames.length, location, action, explanation }));
  };
  const finish = (result: unknown, location: string) => {
    state.result = result;
    emit(location, '完成', `执行结束，返回 ${JSON.stringify(result)}。`);
    trace.result = snapshot(result);
    return trace;
  };
  return { state, emit, finish };
}
