import { Window } from '../../shared/types/window';

/**
 * IDE 配置
 */
export interface IDEConfig {
  id: string;              // 唯一标识符
  name: string;            // 显示名称（如 "VS Code", "IntelliJ IDEA"）
  command: string;         // 命令行命令（如 "code", "idea"）
  path?: string;           // 可执行文件路径（可选，如果在 PATH 中则不需要）
  enabled: boolean;        // 是否启用
  icon?: string;           // 图标名称（可选）
}

/**
 * 工作区设置
 */
export interface Settings {
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';
  autoSave: boolean;
  autoSaveInterval: number;  // 自动保存间隔（分钟）
  ides: IDEConfig[];         // IDE 配置列表
}

/**
 * 工作区配置
 * 包含所有窗口状态和应用设置
 */
export interface Workspace {
  version: string;           // 数据格式版本
  windows: Window[];         // 所有窗口配置
  settings: Settings;        // 应用设置
  lastSavedAt: string;       // 最后保存时间（ISO 8601）
}
