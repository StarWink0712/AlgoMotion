import type { ReferenceCode } from './types';

// Inline authoring markers bind semantic steps to code without fragile line offsets.
export function reference(source: string, note?: string): ReferenceCode {
  const locations: Record<string, number> = {};
  const lines = source.trim().split('\n').map((raw, index) => {
    const match = raw.match(/\s*(?:\/\/|#) @trace ([\w-]+)\s*$/);
    if (!match) return raw;
    if (locations[match[1]]) throw new Error(`Duplicate reference location: ${match[1]}`);
    locations[match[1]] = index + 1;
    return raw.slice(0, match.index).trimEnd();
  });
  return { lines, locations, ...(note ? { note } : {}) };
}
