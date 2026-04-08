---
name: TreeFlow代码结构规范化重构
overview: 全面扫描项目代码库，遵循单一职责原则，识别并抽离不属于当前文件的代码逻辑，解耦并迁移至合适的独立模块，提升可维护性和可读性
todos:
  - id: scan-codebase
    content: 使用 [subagent:code-explorer] 全面扫描代码库，识别所有需要重构的代码块和模块依赖关系
    status: completed
  - id: create-conversation-tree-manager
    content: 新建 ConversationTreeManager.js，从 TopicManager 抽离对话树相关逻辑
    status: completed
    dependencies:
      - scan-codebase
  - id: refactor-topic-manager
    content: 重构 TopicManager.js，移除对话树逻辑，只保留话题生命周期管理
    status: completed
    dependencies:
      - create-conversation-tree-manager
  - id: create-model-identifier
    content: 新建 ModelIdentifier.js 服务，从 TokenManager 抽离模型识别逻辑
    status: completed
    dependencies:
      - scan-codebase
  - id: refactor-token-manager
    content: 重构 TokenManager.js，移除模型识别逻辑，使用 ModelIdentifier 服务
    status: completed
    dependencies:
      - create-model-identifier
  - id: refactor-treeflow-agent
    content: 精简 TreeFlowAgent.js，移除简单转发方法，更新管理器引用
    status: completed
    dependencies:
      - refactor-topic-manager
      - refactor-token-manager
  - id: update-controllers
    content: 更新控制器，直接调用新的管理器，绕过 Agent 的简单转发
    status: completed
    dependencies:
      - refactor-treeflow-agent
  - id: fix-chat-api
    content: 修复 chat.api.js，移除 sendMessageStream，添加 loadTopicMessages 方法
    status: completed
    dependencies:
      - scan-codebase
  - id: verify-compatibility
    content: 验证所有重构保持 API 兼容性，确保功能正常
    status: completed
    dependencies:
      - update-controllers
      - fix-chat-api
---

## 项目概述

对 TreeFlow 项目代码库进行全面规范化重构，遵循单一职责原则，识别并抽离不属于当前文件的代码逻辑，将其解耦并迁移至合适的独立模块或服务中。

## 核心问题识别

### 后端代码问题

1. **TopicManager.js (646行)** - 职责过重，同时管理话题生命周期和对话树结构
2. **TokenManager.js (464行)** - 混合了 Token CRUD 和模型识别逻辑
3. **TreeFlowAgent.js** - 部分方法只是简单转发给管理器，存在冗余

### 前端代码问题

1. **chat.api.js** - 包含未使用的 sendMessageStream 方法，缺少 loadTopicMessages 方法

## 重构目标

1. 遵循单一职责原则 (SRP)
2. 降低模块间耦合度
3. 保持向后兼容（不破坏现有 API）
4. 提升代码可读性和可维护性

## 技术方案

### 后端架构重构

#### 1. TopicManager 拆分

将 TopicManager 拆分为两个独立的 Manager：

- **TopicManager** - 只负责话题生命周期管理（创建、切换、删除、列表）
- **ConversationTreeManager** - 负责对话树结构操作（添加节点、创建分支、遍历、节点编辑/复制/删除）

#### 2. TokenManager 职责分离

- **TokenManager** - 专注于 Token 的 CRUD 操作
- **ModelIdentifier** (新建 Service) - 独立的模型识别服务，根据 token 前缀识别提供商

#### 3. TreeFlowAgent 精简

- 移除简单转发的方法（如 setModel/getModel 等）
- 控制器层直接调用相应 Manager
- Agent 专注于协调复杂业务流程

#### 4. 目录结构调整

```
server/core/
├── agent/
│   └── TreeFlowAgent.js          # 精简后的代理类
├── managers/
│   ├── TopicManager.js           # 话题管理（精简）
│   ├── ConversationTreeManager.js # 新增：对话树管理
│   ├── TokenManager.js           # Token管理（精简）
│   ├── ApiManager.js             # API管理（保持不变）
│   ├── ConfigManager.js          # 配置管理（保持不变）
│   ├── SkillManager.js           # 技能管理（保持不变）
│   └── index.js                  # 统一导出
├── services/                      # 新增目录
│   └── ModelIdentifier.js        # 模型识别服务
└── utils/
    └── logger.js
```

### 前端架构修复

#### 1. chat.api.js 清理

- 移除未使用的 sendMessageStream 方法
- 添加缺失的 loadTopicMessages 方法

### 数据流保持

重构后保持现有的数据流不变：

```
用户操作 → React组件 → API服务 → 后端API → Controller → Manager → 文件存储
```

### 兼容性保障

- 所有 Manager 的公共方法签名保持不变
- TreeFlowAgent 保留核心业务协调方法
- 前端 API 调用方式不变

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 全面扫描项目代码库，识别所有需要重构的文件和代码块，分析模块间依赖关系
- Expected outcome: 生成详细的代码分析报告，列出所有需要修改的文件位置、行号、重构建议