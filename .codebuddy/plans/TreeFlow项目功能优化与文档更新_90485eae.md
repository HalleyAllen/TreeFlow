---
name: TreeFlow项目功能优化与文档更新
overview: 全面审查TreeFlow项目代码，识别冗余功能，优化功能架构，并更新项目文档以准确反映代码逻辑和模块划分
todos:
  - id: analyze-codebase
    content: 使用 [subagent:code-explorer] 全面分析项目代码，识别所有冗余功能和未使用代码
    status: completed
  - id: remove-token-health
    content: 移除 TokenManager.js 中的健康检查方法（checkTokenHealth/checkAllTokensHealth）
    status: completed
    dependencies:
      - analyze-codebase
  - id: remove-token-stats
    content: 移除 TokenController 和 TokenRoutes 中的废弃统计功能
    status: completed
    dependencies:
      - remove-token-health
  - id: update-treeflow-agent
    content: 清理 TreeFlowAgent.js 中引用的废弃方法
    status: completed
    dependencies:
      - remove-token-stats
  - id: simplify-cli
    content: 简化 CLI 入口 index.js，移除废弃功能调用
    status: completed
    dependencies:
      - update-treeflow-agent
  - id: update-feature-doc
    content: 重写 功能文档.md，移除废弃功能描述，重构模块结构
    status: completed
    dependencies:
      - simplify-cli
  - id: update-progress-doc
    content: 更新 功能实现进度.md，清理废弃功能标记
    status: completed
    dependencies:
      - update-feature-doc
  - id: update-readme
    content: 更新 README.md，简化架构描述和启动说明
    status: completed
    dependencies:
      - update-progress-doc
---

## 项目概述

TreeFlow 是一个基于 Node.js + React 的 AI 对话代理系统，核心特色是**分支对话**和**用户自主接入模型**能力。用户可以通过简单的 Token 配置接入任意 OpenAI 兼容的 AI 服务，同时在对话过程中随时创建分支，探索不同的对话路径。

## 核心功能模块

### 已实现功能

1. **话题管理模块**：创建话题、列出话题、切换话题（自动加载历史消息）、删除话题
2. **AI服务管理模块**：

- Token管理：添加Token（自动识别厂商）、删除Token、更新Token信息、列出Token
- 自定义提供商管理：添加/编辑/删除提供商、测试连接
- Ollama本地模型：启用/禁用配置

3. **对话模块**：消息发送（支持对话历史上下文）、流式对话、模型切换、划词引用功能
4. **分支对话（核心特色）**：从指定消息创建分支、分支模式视觉提示、脑图可视化展示
5. **脑图可视化模块**：AntV X6脑图组件、文档流式布局、拖拽平移画布、滚轮缩放、连线从边缘连接、小地图

### 冗余/待移除功能

1. Token健康检查功能（已明确废弃）
2. 批量检查所有Token（已明确废弃）
3. Token统计功能（冗余）
4. 独立主题管理API（可合并到配置管理）
5. 部分未启用的Skill技能系统API

## 目标

1. 详细拆解现有的功能模块结构
2. 识别并移除冗余或非必要的功能
3. 基于优化后的功能架构，更新并完善项目文档
4. 确保文档内容准确反映代码逻辑、模块划分及核心功能
5. 保持文档条理清晰、易于维护和理解

## 技术架构

### 后端架构

```
server/
├── core/                      # 核心业务逻辑
│   ├── agent/
│   │   └── TreeFlowAgent.js   # TreeFlowAgent 主类，协调各模块
│   ├── managers/
│   │   ├── ApiManager.js      # API管理器，处理所有AI提供商请求
│   │   ├── TopicManager.js    # 话题管理器，处理对话树结构
│   │   ├── TokenManager.js    # Token管理器，处理Token CRUD
│   │   ├── ConfigManager.js   # 配置管理器，处理config.json读写
│   │   └── SkillManager.js    # 技能管理器，处理Skill配置
│   └── utils/
│       └── logger.js          # 日志模块
├── server/                    # 服务器层
│   ├── routes/                # 路由定义
│   │   ├── chat.routes.js
│   │   ├── topic.routes.js
│   │   ├── token.routes.js
│   │   ├── model.routes.js
│   │   ├── provider.routes.js
│   │   ├── ollama.routes.js
│   │   ├── skill.routes.js
│   │   ├── theme.routes.js
│   │   └── tree.routes.js
│   ├── controllers/           # 控制器（业务逻辑封装）
│   │   ├── chat.controller.js
│   │   ├── topic.controller.js
│   │   └── token.controller.js
│   └── middleware/            # 中间件
│       ├── errorHandler.js
│       └── responseFormatter.js
├── data/                      # 数据存储
│   ├── config.json
│   ├── tokens.json
│   └── topics.json
└── server.js                  # 服务器入口
```

### 前端架构

```
client/src/
├── App.jsx                    # 主应用
├── main.jsx                   # 应用入口
├── index.css                  # 全局样式
├── components/
│   ├── layout/                # 布局组件
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── chat/                  # 对话组件
│   │   └── ChatContainer.jsx
│   ├── mindmap/               # 脑图组件
│   │   ├── MindMap.jsx
│   │   ├── MindMapNode.jsx
│   │   └── useMindMapLayout.js
│   ├── settings/              # 设置组件
│   │   └── TokenManager.jsx
│   └── common/                # 通用组件
├── hooks/                     # 自定义Hooks
│   ├── useApp.js
│   ├── useChat.js
│   ├── useMindMap.js
│   ├── useModels.js
│   ├── useTokens.js
│   └── useTopics.js
└── services/                  # API服务
    └── api/                   # 按模块拆分的API
```

### 数据流

```
用户操作 → React组件 → API服务 → 后端API → Agent → Manager → 文件存储
                ↑                                              ↓
                └──────────── 响应数据 ←  JSON ←  业务逻辑  ←────┘
```

## 优化方案

### 1. 移除冗余功能

- **Token健康检查**：删除 `checkTokenHealth` 和 `checkAllTokensHealth` 方法及相关路由
- **Token统计**：删除 `getTokenStats` 和 `getTokenUsageStats` 方法及相关路由
- **独立主题API**：将主题设置合并到配置管理中

### 2. 代码清理

- 删除未使用的导入和变量
- 统一错误处理模式
- 优化日志输出

### 3. 文档重构

- 重新组织功能模块结构
- 移除废弃功能描述
- 更新API接口列表
- 简化启动说明