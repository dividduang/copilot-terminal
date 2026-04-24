import { readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface ScannedFolder {
  name: string;
  path: string;
}

/**
 * 扫描指定目录下的所有一级子文件夹
 * @param parentPath 父目录路径
 * @param maxEntries 最大扫描条目数，防止目录遍历攻击（默认 1000）
 * @returns 子文件夹列表
 */
export function scanSubfolders(parentPath: string, maxEntries: number = 1000): ScannedFolder[] {
  try {
    const entries = readdirSync(parentPath, { withFileTypes: true });

    const folders: ScannedFolder[] = [];
    let entryCount = 0;

    for (const entry of entries) {
      // 防止扫描过多条目导致性能问题
      if (entryCount >= maxEntries) {
        console.warn(`[FolderScanner] Reached maximum entry limit (${maxEntries}), stopping scan`);
        break;
      }

      // 跳过非目录项
      if (!entry.isDirectory()) {
        continue;
      }

      // 跳过以.开头的文件夹
      if (entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = join(parentPath, entry.name);

      // 验证路径是否可访问
      try {
        statSync(fullPath);
        folders.push({
          name: entry.name,
          path: fullPath,
        });
        entryCount++;
      } catch {
        // 跳过无法访问的文件夹
        continue;
      }
    }

    // 按名称排序
    folders.sort((a, b) => a.name.localeCompare(b.name));

    return folders;
  } catch (error) {
    console.error('[FolderScanner] Failed to scan subfolders:', error);
    return [];
  }
}
