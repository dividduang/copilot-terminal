# 窗口编辑功能

## 功能概述

允许用户在主界面的终端卡片上编辑窗口的基本信息，包括：
- 窗口名称
- Shell 命令（支持下拉选择和自定义）
- 工作目录（支持浏览选择）

## 使用方法

1. 在主界面的终端卡片底部工具栏中，找到编辑按钮（铅笔图标，位于删除按钮左侧）
2. 点击编辑按钮，弹出编辑对话框
3. 在编辑对话框中：
   - 修改窗口名称
   - 通过下拉菜单选择 Shell 程序，或点击"自定义"按钮浏览选择可执行文件
   - 输入工作目录路径，或点击"浏览"按钮选择文件夹
4. 点击"保存"按钮保存修改，或点击"取消"按钮放弃修改
5. 也可以按 ESC 键快速关闭编辑对话框
6. 按 Enter 键快速保存（当所有字段验证通过时）

## UI 特性

### 与新建窗口界面一致
- 使用相同的 Dialog 组件和样式
- 使用相同的 Button 组件
- 使用相同的 Select 下拉组件（Radix UI）
- 统一的表单布局和交互体验

### 智能功能
- **路径验证**：工作目录输入后自动验证（300ms 防抖）
- **Shell 选择**：
  - 自动检测系统可用的 Shell 程序
  - 支持选择全局默认 Shell
  - 支持自定义 Shell 可执行文件
- **错误提示**：固定高度的错误提示区域，防止对话框抖动
- **按钮状态**：保存按钮在验证失败或保存中时自动禁用

## 实现细节

### 组件结构

- **EditWindowPanel** (`src/renderer/components/EditWindowPanel.tsx`)
  - 使用 Dialog 组件包装
  - 使用 Radix UI Select 组件实现下拉选择
  - 使用 Button 组件统一按钮样式
  - 支持 ESC 键和 Enter 键快捷操作
  - 包含三个输入字段：窗口名称、工作目录、Shell 命令

### 集成位置

- **CardGrid** (`src/renderer/components/CardGrid.tsx`)
  - 活动终端列表视图
  - 添加了 `handleEditWindow` 和 `handleSaveEdit` 处理函数
  - 在 WindowCard 中传递 `onEdit` 回调

- **ArchivedView** (`src/renderer/components/ArchivedView.tsx`)
  - 归档终端列表视图
  - 同样支持编辑功能
  - 实现方式与 CardGrid 一致

- **WindowCard** (`src/renderer/components/WindowCard.tsx`)
  - 添加了编辑按钮（Edit2 图标）
  - 位于底部工具栏，删除按钮左侧
  - 添加了 `onEdit` 回调 prop

### 数据更新

编辑功能通过 Zustand store 更新窗口数据：
- 窗口名称：使用 `updateWindow` 更新
- Shell 命令和工作目录：使用 `updatePane` 更新第一个窗格的数据

### 国际化

添加了以下翻译键：
- `windowCard.edit`: 编辑按钮的标签
- `editWindow.title`: 编辑对话框标题
- `editWindow.description`: 编辑对话框描述
- `editWindow.windowName`: 窗口名称标签
- `editWindow.windowNamePlaceholder`: 窗口名称占位符
- `editWindow.shellCommand`: Shell 命令标签
- `editWindow.shellCommandPlaceholder`: Shell 命令占位符（复用 createWindow）
- `editWindow.workingDirectory`: 工作目录标签
- `editWindow.workingDirectoryPlaceholder`: 工作目录占位符
- `common.close`: 关闭按钮标签

支持中文和英文两种语言。

## 技术细节

### Shell 程序选择
- 自动加载系统可用的 Shell 程序列表
- 支持"自动选择"选项（使用全局默认或系统推荐）
- 支持自定义 Shell 可执行文件路径
- 下拉菜单使用 Radix UI Select 组件，支持键盘导航

### 路径验证
- 使用 300ms 防抖避免频繁验证
- 通过 IPC 调用主进程验证路径是否存在
- 显示验证状态（验证中/错误）
- 固定高度的提示区域防止 UI 抖动

### 表单提交
- 只在字段值发生变化时才保存更新
- 支持 Enter 键快速提交
- 支持 ESC 键快速取消
- 保存时禁用按钮防止重复提交

## 注意事项

1. 编辑功能只修改窗口的配置信息，不会影响正在运行的终端进程
2. 如果窗口正在运行，修改 Shell 命令或工作目录后需要重启窗口才能生效
3. 工作目录必填，且必须是有效路径
4. Shell 命令可选，留空则使用系统默认
5. 编辑按钮位于删除按钮左侧，方便快速访问
