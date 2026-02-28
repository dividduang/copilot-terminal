import { Window } from '../types/window';

export type SortBy = 'createdAt' | 'lastActiveAt';

/**
 * 对窗口数组排序
 * 默认按 lastActiveAt 降序（最近活跃的在前）
 */
export function sortWindows(windows: Window[], sortBy: SortBy = 'lastActiveAt'): Window[] {
  return [...windows].sort((a, b) => {
    return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
  });
}
