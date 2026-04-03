---
name: TreeFlow项目结构模块规范化
overview: 对TreeFlow项目进行模块规范化重构，包括后端路由分层、前端组件重组、配置统一管理，提升代码可维护性和扩展性。
todos:
  - id: reorganize-backend-structure
    content: 重构后端目录结构，创建server/core分层架构
    status: completed
  - id: extract-backend-routes
    content: 抽取server.js路由到routes/目录，按功能模块分组
    status: completed
    dependencies:
      - reorganize-backend-structure
  - id: create-controllers
    content: 创建controllers/目录，实现请求处理逻辑与路由分离
    status: completed
    dependencies:
      - extract-backend-routes
  - id: add-error-middleware
    content: 添加统一错误处理中间件和响应格式化
    status: completed
    dependencies:
      - create-controllers
  - id: reorganize-frontend-components
    content: 重构前端组件目录，按功能分组创建layout/chat/settings子目录
    status: completed
  - id: extract-frontend-hooks
    content: 创建hooks/目录，提取App.jsx状态逻辑到自定义hooks
    status: completed
    dependencies:
      - reorganize-frontend-components
  - id: split-api-services
    content: 拆分API服务，按模块创建独立的api文件
    status: completed
    dependencies:
      - extract-frontend-hooks
  - id: organize-config-data
    content: 创建data/目录，迁移配置文件和数据文件
    status: completed
---

## 项目概述

TreeFlow是一个基于Node.js + React的AI对话代理系统，核心特色是分支对话和用户自主接入模型能力。当前项目代码存在模块划分不清晰、职责混杂的问题，需要进行模块规范化重构。

## 当前问题分析

### 后端架构问题

1. **server.js过于臃肿**（679行），包含所有API路由定义，混杂路由、控制器和业务逻辑
2. **缺少分层架构**，没有清晰的路由层、控制器层、服务层划分
3. **错误处理不一致**，每个路由单独处理错误，缺少统一错误处理中间件
4. **配置文件分散**，根目录下config.js、config.json、skills.json、tokens.json混杂

### 前端架构问题

1. **组件组织混乱**，所有组件平铺在components/目录，未按功能分组
2. **API服务集中**，所有API调用在一个文件中，随着功能增加难以维护
3. **状态管理臃肿**，App.jsx包含大量状态和逻辑，缺乏自定义hooks提取复用逻辑
4. **缺少类型定义**，前后端都没有类型定义，维护成本高

### 配置管理问题

1. 数据文件和配置文件混合在根目录
2. 缺少统一的数据目录结构

## 核心优化目标

1. 建立清晰的后端分层架构（路由-控制器-服务）
2. 规范化前端目录结构（按功能分组组件）
3. 提取公共hooks和工具函数
4. 统一配置文件和数据存储目录
5. 完善错误处理和日志系统

## 技术栈

- **后端**: Node.js + Express
- **前端**: React 18 + Material-UI + Vite
- **日志**: Winston
- **配置管理**: JSON文件存储

## 架构重构方案

### 后端架构（MVC分层）

采用经典的三层架构模式，分离关注点：

```
server/
├── app.js                 # Express应用配置（中间件、路由挂载）
├── bin/www.js             # 服务器启动入口
├── routes/                # 路由层（仅负责路由分发）
│   ├── index.js           # 路由聚合导出
│   ├── topic.routes.js    # 话题相关路由
│   ├── token.routes.js    # Token管理路由
│   ├── model.routes.js    # 模型相关路由
│   ├── provider.routes.js # 提供商配置路由
│   ├── ollama.routes.js   # Ollama本地模型路由
│   ├── skill.routes.js    # 技能系统路由
│   └── chat.routes.js     # 对话相关路由
├── controllers/           # 控制器层（处理请求/响应）
│   ├── topic.controller.js
│   ├── token.controller.js
│   ├── model.controller.js
│   ├── provider.controller.js
│   ├── ollama.controller.js
│   ├── skill.controller.js
│   └── chat.controller.js
└── middleware/            # 中间件层
    ├── errorHandler.js    # 统一错误处理
    ├── requestValidator.js # 请求验证
    └── responseFormatter.js # 响应格式统一

core/                      # 核心逻辑层（原src/重命名）
├── agent/                 # AI代理核心
│   └── TreeFlowAgent.js
├── managers/              # 业务管理器
│   ├── TokenManager.js
│   ├── TopicManager.js
│   ├── ApiManager.js
│   ├── ConfigManager.js
│   └── SkillManager.js
├── utils/                 # 工具函数
│   ├── logger.js
│   └── helpers.js
└── constants/             # 常量定义
    └── index.js
```

### 前端架构（按功能模块化）

```
client/src/
├── components/            # 组件层
│   ├── layout/            # 布局组件
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   └── MainLayout.jsx
│   ├── chat/              # 聊天功能组件
│   │   ├── ChatContainer.jsx
│   │   ├── MessageList.jsx
│   │   ├── MessageInput.jsx
│   │   └── BranchSelector.jsx
│   ├── settings/          # 设置相关组件
│   │   ├── TokenManager.jsx
│   │   ├── OllamaSettings.jsx
│   │   └── CustomProviderManager.jsx
│   ├── common/            # 通用UI组件
│   │   └── SkillSelector.jsx
│   └── ui/                # 基础UI组件（可复用）
├── hooks/                 # 自定义React Hooks
│   ├── useTopics.js       # 话题管理逻辑
│   ├── useChat.js         # 对话逻辑
│   ├── useModels.js       # 模型管理
│   └── useTokens.js       # Token管理
├── services/              # API服务层
│   ├── api.js             # axios/fetch实例配置
│   ├── topic.api.js       # 话题API
│   ├── token.api.js       # Token API
│   ├── model.api.js       # 模型API
│   └── chat.api.js        # 对话API
├── stores/                # 状态管理
│   └── index.js           # 全局状态（如需要）
├── utils/                 # 工具函数
│   ├── tokenUtils.js
│   ├── formatters.js
│   └── constants.js
├── styles/                # 样式文件
│   ├── index.css
│   └── variables.css
└── config.js              # 前端配置
```

### 数据与配置目录

```
data/                      # 数据存储目录（原根目录配置文件）
├── config.json            # 应用配置
├── tokens.json            # Token数据
├── skills.json            # 技能配置
└── topics/                # 话题数据（按文件分割）
    └── default.json

config/                    # 配置模板和常量
├── default.config.js      # 默认配置
└── providers.template.js  # 提供商配置模板
```

## 关键重构点

### 1. 路由与控制器分离

将server.js中的路由逻辑抽取到独立的路由文件，控制器负责处理业务逻辑：

```javascript
// routes/topic.routes.js
const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topic.controller');

router.get('/', topicController.listTopics);
router.post('/', topicController.createTopic);
router.post('/switch', topicController.switchTopic);

module.exports = router;
```

### 2. 统一错误处理

创建错误处理中间件，统一处理所有API错误：

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  logger.error('API', err.message, { stack: err.stack });
  res.status(err.status || 500).json({
    success: false,
    error: err.message || '服务器内部错误'
  });
};
```

### 3. 前端Hooks提取

将App.jsx中的状态管理逻辑抽取到自定义hooks：

```javascript
// hooks/useTopics.js
export const useTopics = () => {
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  
  // 加载、创建、切换话题逻辑...
  
  return { topics, currentTopic, createTopic, switchTopic };
};
```

## 实施原则

1. **渐进式重构**：保持现有功能不变，逐步迁移代码
2. **向后兼容**：确保API路径和响应格式不变
3. **测试驱动**：每次重构后验证功能正常
4. **单一职责**：每个模块只负责一个明确的功能领域