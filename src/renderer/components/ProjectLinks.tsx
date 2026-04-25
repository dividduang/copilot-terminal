import React, { useCallback } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { ExternalLink } from 'lucide-react';
import { ProjectLink } from '../../shared/types/project-config';

interface ProjectLinksProps {
  links: ProjectLink[];
  variant?: 'card' | 'toolbar';
  maxDisplay?: number;
}

/**
 * 验证外部 URL 是否安全（仅允许 http/https 协议）
 */
function isValidExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 项目快捷链接组件
 * 支持两种显示模式：卡片、工具栏
 */
export const ProjectLinks: React.FC<ProjectLinksProps> = ({
  links,
  variant = 'card',
  maxDisplay = 6,
}) => {
  // 打开外部链接
  const handleOpenLink = useCallback(
    (e: React.MouseEvent, url: string) => {
      e.stopPropagation();

      if (!isValidExternalUrl(url)) {
        console.error('Invalid external URL:', url);
        return;
      }

      if (!globalThis.electronAPI?.openExternalUrl) {
        console.error('openExternalUrl is not available');
        return;
      }

      globalThis.electronAPI.openExternalUrl(url)
        .catch((error: Error) => {
          console.error('Failed to open URL:', error);
        });
    },
    []
  );

  if (!links || links.length === 0) {
    return null;
  }

  const displayLinks = links.slice(0, maxDisplay);

  // 卡片模式：显示在卡片底部
  if (variant === 'card') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {displayLinks.map((link) => (
          <Tooltip.Provider key={link.name}>
            <Tooltip.Root delayDuration={300}>
              <Tooltip.Trigger asChild>
                <button
                  onClick={(e) => handleOpenLink(e, link.url)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[rgb(var(--foreground))] bg-[rgb(var(--secondary))] rounded hover:bg-[rgb(var(--accent))] transition-colors focus:outline-none focus:ring-1 focus:ring-[rgb(var(--ring))]"
                >
                  <ExternalLink size={12} />
                  <span className="truncate max-w-[80px]">{link.name}</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="bg-[rgb(var(--card))] text-[rgb(var(--foreground))] px-2 py-1 rounded text-xs z-50 shadow-xl border border-[rgb(var(--border))] max-w-xs break-all"
                  sideOffset={5}
                >
                  {link.name}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        ))}
      </div>
    );
  }

  // 工具栏模式：显示在终端视图顶部工具栏
  if (variant === 'toolbar') {
    return (
      <>
        {displayLinks.map((link, index) => (
          <React.Fragment key={link.name}>
            {index > 0 && (
              <div className="w-px h-4 bg-[rgb(var(--accent))]" />
            )}
            <Tooltip.Provider>
              <Tooltip.Root delayDuration={300}>
                <Tooltip.Trigger asChild>
                  <button
                    onClick={(e) => handleOpenLink(e, link.url)}
                    className="flex items-center justify-center w-6 h-6 rounded bg-[rgb(var(--card))] hover:bg-[rgb(var(--accent))] text-[rgb(var(--foreground))] transition-colors"
                    title={link.name}
                  >
                    <ExternalLink size={14} />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="bg-[rgb(var(--card))] text-[rgb(var(--foreground))] px-2 py-1 rounded text-xs z-50 shadow-xl border border-[rgb(var(--border))]"
                    sideOffset={5}
                  >
                    {link.name}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>
          </React.Fragment>
        ))}
      </>
    );
  }

  return null;
};

ProjectLinks.displayName = 'ProjectLinks';
