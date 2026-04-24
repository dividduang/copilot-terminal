import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig } from '../../shared/types/project-config';

/**
 * 验证 URL 是否为有效的 HTTP/HTTPS 协议
 * @param url 待验证的 URL
 * @returns 是否为有效 URL
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 从指定目录读取 copilot.json 配置文件
 * @param directory 项目根目录
 * @returns 项目配置对象，如果文件不存在或解析失败则返回 null
 */
export function readProjectConfig(directory: string): ProjectConfig | null {
  try {
    const configPath = path.join(directory, 'copilot.json');

    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
      return null;
    }

    // 读取并解析 JSON 文件
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as ProjectConfig;

    // 基本验证
    if (!config.version || !Array.isArray(config.links)) {
      console.warn(`Invalid copilot.json format in ${directory}`);
      return null;
    }

    // 验证 name 唯一性和 URL 有效性
    const names = new Set<string>();
    for (const link of config.links) {
      if (!link.name || !link.url) {
        console.warn(`Invalid link in copilot.json: missing name or url`);
        return null;
      }
      if (names.has(link.name)) {
        console.warn(`Duplicate link name in copilot.json: ${link.name}`);
        return null;
      }
      if (!isValidUrl(link.url)) {
        console.warn(`Invalid URL in copilot.json: ${link.url} (only http/https protocols are allowed)`);
        return null;
      }
      names.add(link.name);
    }

    return config;
  } catch (error) {
    console.error(`Failed to read copilot.json from ${directory}:`, error);
    return null;
  }
}

/**
 * 生成 copilot.json 模板文件
 * @param directory 目标目录
 * @returns 是否成功创建
 */
export function createProjectConfigTemplate(directory: string): boolean {
  try {
    const configPath = path.join(directory, 'copilot.json');

    // 如果文件已存在，不覆盖
    if (fs.existsSync(configPath)) {
      return false;
    }

    const template: ProjectConfig = {
      version: '1.0',
      links: [
        {
          name: '代码仓库',
          url: 'https://github.com/username/repo'
        },
        {
          name: '构建流水线',
          url: 'https://pipeline.example.com/project/123'
        },
        {
          name: '项目文档',
          url: 'https://docs.example.com'
        },
        {
          name: 'JMX监控',
          url: 'https://jmx.example.com/dashboard'
        },
        {
          name: '性能监控',
          url: 'https://apm.example.com/dashboard'
        },
        {
          name: '生产日志',
          url: 'https://logs.example.com/search'
        }
      ]
    };

    fs.writeFileSync(configPath, JSON.stringify(template, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Failed to create copilot.json template in ${directory}:`, error);
    return false;
  }
}
