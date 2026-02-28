import { Window } from '../../renderer/types/window';

/**
 * 工作区设置
 */
export interface Settings {
  notificationsEnabled: boolean;
  theme: 'dark' | 'light';
  autoSave: boolean;
  autoSaveInterval: number;  // 自动保存间隔（分钟）
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
