/**
 * 项目配置文件类型定义
 * 用于 copilot.json 配置文件
 */

/**
 * 项目链接接口
 */
export interface ProjectLink {
  name: string;  // 显示名称（必须全局唯一，用作标识符和图标名称）
  url: string;   // 跳转地址
}

/**
 * 项目配置接口（copilot.json 的完整结构）
 */
export interface ProjectConfig {
  version: string;       // 配置文件版本
  links: ProjectLink[];  // 链接列表
}
