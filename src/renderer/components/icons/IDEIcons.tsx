import React, { useEffect, useState } from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

/**
 * 动态IDE图标组件
 * 从IDE安装目录加载实际图标
 */
export const IDEIcon: React.FC<{ icon: string; size?: number; className?: string }> = ({
  icon,
  size = 16,
  className = ''
}) => {
  const [iconSrc, setIconSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIcon = async () => {
      // 如果icon是文件路径(包含路径分隔符或扩展名)
      if (icon && (icon.includes('\\') || icon.includes('/') || icon.includes('.'))) {
        try {
          const response = await window.electronAPI.getIDEIcon(icon);
          if (response.success && response.data) {
            setIconSrc(response.data);
          }
        } catch (error) {
          console.error('Failed to load IDE icon:', error);
        }
      }
      setLoading(false);
    };

    loadIcon();
  }, [icon]);

  if (loading) {
    // 加载中显示占位符
    return (
      <div
        className={`bg-zinc-700 rounded animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (!iconSrc) {
    // 无图标时显示默认图标
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect x="2" y="2" width="20" height="20" rx="2" fill="currentColor" opacity="0.2" />
        <path
          d="M6 6H8V8H6V6ZM6 10H8V12H6V10ZM6 14H8V16H6V14ZM10 6H18V8H10V6ZM10 10H16V12H10V10ZM10 14H14V16H10V14Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <img
      src={iconSrc}
      alt="IDE Icon"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
};

