import { describe, expect, it } from 'vitest';
import { problems } from '../src/engine/catalog';
import { reference } from '../src/engine/references';
import { codeLanguages } from '../src/engine/types';
import { runProblem } from '../src/engine/run';
import { cases } from './reference-cases';

describe('reference source contracts', () => {
  it.each(problems)('$id has exactly three languages with identical semantic locations', (problem) => {
    expect(Object.keys(problem.code).sort()).toEqual([...codeLanguages].sort());
    const expected = Object.keys(problem.code.java.locations).sort();
    const emitted = new Set<string>();
    for (const [id, input] of cases.filter(([id]) => id === problem.id)) {
      runProblem(id, input).frames.forEach((frame) => emitted.add(frame.location));
    }
    for (const language of codeLanguages) {
      const code = problem.code[language];
      expect(Object.keys(code.locations).sort()).toEqual(expected);
      expect(code.lines.join('\n')).not.toContain('@trace');
      for (const location of emitted) expect(code.locations[location], `${language}/${location}`).toBeGreaterThan(0);
      for (const line of Object.values(code.locations)) expect(code.lines[line - 1]?.trim()).not.toBe('');
    }
  });

  it('derives line mappings after removing authoring markers', () => {
    expect(reference('first\n    second # @trace inspect')).toEqual({ lines: ['first', '    second'], locations: { inspect: 2 } });
  });
  it('rejects duplicate semantic locations', () => {
    expect(() => reference('first // @trace inspect\nsecond // @trace inspect')).toThrow('Duplicate');
  });
});
