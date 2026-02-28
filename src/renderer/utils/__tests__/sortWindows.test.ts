import { describe, it, expect } from 'vitest';
import { sortWindows } from '../sortWindows';
import { Window, WindowStatus } from '../../types/window';

const makeWindow = (id: string, lastActiveAt: string, createdAt?: string): Window => ({
  id,
  name: `Window ${id}`,
  workingDirectory: `/path/${id}`,
  command: 'claude',
  status: WindowStatus.Running,
  pid: 1000,
  createdAt: createdAt ?? '2024-01-01T10:00:00Z',
  lastActiveAt,
});

describe('sortWindows', () => {
  it('sorts by lastActiveAt descending by default', () => {
    const windows = [
      makeWindow('old', '2024-01-01T08:00:00Z'),
      makeWindow('new', '2024-01-01T12:00:00Z'),
      makeWindow('mid', '2024-01-01T10:00:00Z'),
    ];

    const result = sortWindows(windows);
    expect(result[0].id).toBe('new');
    expect(result[1].id).toBe('mid');
    expect(result[2].id).toBe('old');
  });

  it('sorts by lastActiveAt descending when explicitly specified', () => {
    const windows = [
      makeWindow('a', '2024-01-01T09:00:00Z'),
      makeWindow('b', '2024-01-01T11:00:00Z'),
    ];

    const result = sortWindows(windows, 'lastActiveAt');
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });

  it('sorts by createdAt descending when specified', () => {
    const windows = [
      makeWindow('a', '2024-01-01T10:00:00Z', '2024-01-01T07:00:00Z'),
      makeWindow('b', '2024-01-01T10:00:00Z', '2024-01-01T09:00:00Z'),
    ];

    const result = sortWindows(windows, 'createdAt');
    expect(result[0].id).toBe('b');
    expect(result[1].id).toBe('a');
  });

  it('does not mutate the original array', () => {
    const windows = [
      makeWindow('a', '2024-01-01T08:00:00Z'),
      makeWindow('b', '2024-01-01T12:00:00Z'),
    ];
    const original = [...windows];

    sortWindows(windows);

    expect(windows[0].id).toBe(original[0].id);
    expect(windows[1].id).toBe(original[1].id);
  });

  it('returns empty array when input is empty', () => {
    expect(sortWindows([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    const windows = [makeWindow('only', '2024-01-01T10:00:00Z')];
    const result = sortWindows(windows);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('only');
  });
});
