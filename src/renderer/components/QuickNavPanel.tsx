import React, { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink, Folder, Globe } from 'lucide-react';
import { QuickNavItem } from '../../shared/types/quick-nav';
import { useI18n } from '../i18n';

interface QuickNavPanelProps {
  open: boolean;
  onClose: () => void;
}

export const QuickNavPanel: React.FC<QuickNavPanelProps> = ({ open, onClose }) => {
  const [items, setItems] = useState<QuickNavItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  // 加载快捷导航配置
  useEffect(() => {
    if (open) {
      loadQuickNavItems();
    }
  }, [open]);

  const loadQuickNavItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.electronAPI.getSettings();
      if (response.success && response.data) {
        const quickNavItems = response.data.quickNav?.items || [];
        // 按 order 排序
        setItems(quickNavItems.sort((a: QuickNavItem, b: QuickNavItem) => a.order - b.order));
      }
    } catch (error) {
      console.error('Failed to load quick nav items:', error);
      setError(t('quickNav.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = useCallback(async (item: QuickNavItem) => {
    try {
      if (item.type === 'url') {
        // 打开 URL
        await window.electronAPI.openExternalUrl(item.path);
      } else if (item.type === 'folder') {
        // 打开文件夹
        await window.electronAPI.openFolder(item.path);
      }
    } catch (error) {
      console.error(`Failed to open ${item.type}:`, error);
    }
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1100] animate-fade-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-4xl max-h-[85vh] bg-[rgb(var(--background))] rounded-xl shadow-2xl border border-[rgb(var(--border))] z-[1100] overflow-hidden flex flex-col animate-scale-in"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/50 backdrop-blur">
            <Dialog.Title className="text-xl font-semibold text-[rgb(var(--foreground))]">
              {t('quickNav.title')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-[rgb(var(--muted-foreground))]">{t('common.loading')}</div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-[rgb(var(--muted-foreground))]">
                <p className="text-lg mb-2">{error}</p>
                <button
                  onClick={loadQuickNavItems}
                  className="mt-4 px-4 py-2 bg-[rgb(var(--card))] hover:bg-[rgb(var(--accent))] rounded-lg text-sm transition-colors"
                >
                  {t('common.retry')}
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[rgb(var(--muted-foreground))]">
                <Globe size={48} className="mb-4 opacity-50" />
                <p className="text-lg mb-2">{t('quickNav.emptyTitle')}</p>
                <p className="text-sm">{t('quickNav.emptyDescription')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="group flex flex-col items-center gap-3 p-4 bg-[rgb(var(--card))]/50 rounded-xl border border-[rgb(var(--border))]/50 hover:border-blue-500/50 hover:bg-[rgb(var(--card))] transition-all duration-200 hover:scale-105"
                    title={item.path}
                  >
                    {/* 图标 */}
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg bg-[rgb(var(--accent))]/50 group-hover:bg-blue-600/20 transition-colors">
                      {item.type === 'url' ? (
                        <Globe size={24} className="text-blue-400" />
                      ) : (
                        <Folder size={24} className="text-yellow-400" />
                      )}
                    </div>

                    {/* 名称 */}
                    <div className="w-full text-center">
                      <p className="text-sm font-medium text-[rgb(var(--foreground))] truncate">
                        {item.name}
                      </p>
                    </div>

                    {/* 类型标识 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink size={14} className="text-[rgb(var(--muted-foreground))]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

