import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * GitDetector - Git 分支检测服务
 *
 * 检测指定目录是否为 git 仓库，并获取当前分支名称
 */
export class GitDetector {
  /**
   * 检测指定目录的 git 分支
   * @param cwd 工作目录
   * @returns 分支名称，如果不是 git 仓库则返回 undefined
   */
  detectBranch(cwd: string): string | undefined {
    try {
      // 检查是否存在 .git 目录
      const gitDir = join(cwd, '.git');
      if (!existsSync(gitDir)) {
        return undefined;
      }

      // 执行 git 命令获取当前分支
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd,
        encoding: 'utf-8',
        timeout: 1000, // 1秒超时
        stdio: ['ignore', 'pipe', 'ignore'], // 忽略 stderr
      }).trim();

      return branch || undefined;
    } catch {
      // 如果命令执行失败（不是 git 仓库或其他错误），返回 undefined
      return undefined;
    }
  }
}
