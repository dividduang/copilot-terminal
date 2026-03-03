import { execSync } from 'child_process';

/**
 * 获取默认 shell，带回退逻辑
 *
 * Windows: pwsh.exe (PowerShell 7+) > cmd.exe
 * macOS: zsh
 * Linux: bash
 */
export function getDefaultShell(): string {
  if (process.platform === 'win32') {
    // 检查 pwsh.exe 是否存在（PowerShell 7+）
    try {
      execSync('where pwsh.exe', { stdio: 'ignore' });
      return 'pwsh.exe';
    } catch {
      // 直接回退到 cmd.exe，不使用旧版 powershell.exe
      return 'cmd.exe';
    }
  } else if (process.platform === 'darwin') {
    return 'zsh';
  } else {
    // Linux
    return 'bash';
  }
}
