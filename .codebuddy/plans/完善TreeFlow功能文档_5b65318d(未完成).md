---
name: 完善TreeFlow功能文档
overview: 根据代码实际实现情况，重写功能文档：补全缺失功能文档（修改话题名、调整原文、对话树加载等）、修正不准确描述、补充已实现但文档未覆盖的功能、标注未实现功能状态，确保文档与代码一致且可实现。
design:
  architecture:
    framework: react
    component: mui
  fontSystem:
    fontFamily: Roboto
    heading:
      size: 16px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#1976d2"
      - "#1565c0"
    background:
      - "#ffffff"
      - "#f5f5f5"
    text:
      - "#000000"
      - "#666666"
    functional:
      - "#4caf50"
      - "#f44336"
      - "#ff9800"
todos:
  - id: fix-backend-bugs
    content: 修复 ollamaEnabled 缺失、TokenManager 三个缺失方法、ask() 对话历史传递
    status: pending
  - id: rename-topic
    content: 实现修改话题名功能（后端 renameTopic + 前端 Sidebar 编辑 UI）
    status: pending
    dependencies:
      - fix-backend-bugs
  - id: branch-and-history
    content: 补全分支对话前端入口、切换话题加载历史消息、调整原文功能
    status: pending
    dependencies:
      - fix-backend-bugs
  - id: fix-frontend-bugs
    content: 修复 TokenManager.jsx 中 setOllamaUrl state 命名冲突 Bug
    status: pending
  - id: update-doc
    content: 基于实际实现重写功能文档，补全所有功能描述、数据结构和序列图
    status: pending
    dependencies:
      - rename-topic
      - branch-and-history
      - fix-frontend-bugs
---

## 用户需求

完善 TreeFlow 项目的功能文档 `功能文档.md`，使其更加规范，并确保文档中描述的所有功能都能在当前代码基础上实际实现。

## 完善方向

### 1. 补全缺失功能的后端/前端实现

文档中描述但代码未实现的功能：

- **修改话题名**：后端 TopicManager 缺少 `renameTopic` 方法，前端 Sidebar 无编辑 UI
- **生成分支（前端入口）**：后端 `createBranch()` 已存在，但前端无按钮和 API 调用入口
- **调整原文**：完全未实现，需要后端新增节点更新接口 + 前端消息选择与编辑 UI
- **切换分支（前端入口）**：后端 `switchToBranch()` 已存在，前端无调用入口
- **加载对话历史**：切换话题时应从后端加载该话题的历史消息，当前直接清空

### 2. 修复严重 Bug

- `agent.ollamaEnabled` 属性未在 TreeFlowAgent 中定义，server.js 访问时为 undefined
- TokenManager.jsx 第32行 `setOllamaUrl` state 与 API 函数同名冲突，导致 Ollama URL 保存失效
- `checkTokenHealth`、`checkAllTokensHealth`、`getTokenUsageStats` 三个方法在 server.js 中被调用但 TokenManager 中不存在

### 3. 补充文档中未覆盖但已实现的功能

- 清除所有 Token
- Token 状态管理（active/inactive/expired/testing）
- Ollama 启用/禁用开关
- 对话树 API 和分支切换 API
- CLI 命令行界面

### 4. 规范文档格式

- 补充各功能的数据结构定义
- 修正不准确的序列图
- 补充遗漏的功能流程图
- 统一文档结构和描述风格

## 核心功能

- 话题 CRUD（含重命名）
- Token CRUD + 状态管理 + 厂商自动识别
- Ollama 本地模型集成（URL 配置 + 启用/禁用）
- AI 对话（含上下文历史传递）
- 分支对话（创建/切换/可视化）
- 语句选择（生成分支 + 调整原文）
- 配置管理（前端 + 后端）
- CLI 命令行界面

## 技术栈

- **后端**: Node.js + Express.js（JavaScript）
- **前端**: React 18 + Material-UI v7 + Vite
- **数据存储**: 文件系统 JSON（tokens.json、config.json、topics.json）
- **脑图可视化**: reactflow v11（已安装依赖）

## 实现方案

### 阶段一：修复后端缺失方法与 Bug（基础设施层）

**策略**：先确保现有 API 能正常工作，避免 500 错误。

1. **修复 `agent.ollamaEnabled` 缺失**

- 在 `ConfigManager` 中添加 `ollamaEnabled` 配置项（默认 false）
- 在 `TreeFlowAgent` constructor 中读取 `this.ollamaEnabled = this.configManager.getConfig().ollamaEnabled || false`
- 在 `agent.js` 中添加 `setOllamaEnabled(enabled)` 方法
- 文件：`src/configManager.js`、`src/agent.js`

2. **修复 TokenManager 缺失的三个方法**

- `checkTokenHealth(token)`：发送轻量级 API 请求验证 Token 有效性
- `checkAllTokensHealth()`：遍历所有 Token 调用 `checkTokenHealth`
- `getTokenUsageStats()`：返回每个 Token 的统计信息（创建时间、状态等）
- 文件：`src/tokenManager.js`

3. **修复 `ask()` 不传递对话历史**

- 在 `TopicManager` 中新增 `getConversationPath(topicId)` 方法，从 root 到 currentNode 返回消息路径
- 修改 `agent.ask()` 将路径消息作为 messages 数组传给 API
- 在 `ApiManager.askGenericAPI()` 中支持传入 messages 数组替换单个 question
- 文件：`src/topicManager.js`、`src/agent.js`、`src/apiManager.js`

### 阶段二：补全缺失功能（后端 + 前端）

**策略**：按功能模块逐步补全，确保前后端联调。

4. **修改话题名**

- 后端：`TopicManager.renameTopic(topicId, newName)` + `server.js` 新增 `POST /api/rename-topic`
- Agent：`renameTopic(topicId, newName)` 代理方法
- 前端：`api.js` 新增 `renameTopic()` + `Sidebar.jsx` 添加双击编辑话题名 UI
- 文件：`src/topicManager.js`、`src/agent.js`、`server.js`、`client/src/services/api.js`、`client/src/components/Sidebar.jsx`

5. **分支对话前端入口**

- 前端 `App.jsx` 引入 `createBranch`、`switchBranch` API
- `ChatContainer.jsx` 消息列表中添加 "创建分支" 按钮（悬停显示）
- 创建分支后自动切换到新分支并清空消息
- 文件：`client/src/App.jsx`、`client/src/components/ChatContainer.jsx`

6. **切换话题加载历史消息**

- 后端新增 `GET /api/topic-messages?topicId=xxx` 返回话题的对话路径消息列表
- `TopicManager.getConversationMessages(topicId)` 方法将树形路径转为扁平消息数组
- 前端 `handleSwitchTopic` 切换时调用此 API 加载历史消息替代 `setMessages([])`
- 文件：`server.js`、`src/topicManager.js`、`client/src/services/api.js`、`client/src/App.jsx`

7. **语句选择 + 调整原文**

- 后端：新增 `POST /api/edit-message` 接收 `{ topicId, nodeId, newMessage }`，更新对话树节点
- `TopicManager.editMessage(topicId, nodeId, newMessage)` 递归查找并更新节点
- 前端：AI 消息添加悬停操作栏（"生成分支"、"调整原文"），点击调整原文弹出编辑框
- 文件：`server.js`、`src/topicManager.js`、`src/agent.js`、`client/src/services/api.js`、`client/src/components/ChatContainer.jsx`

### 阶段三：修复前端 Bug

**策略**：修复已知的前端逻辑错误。

8. **修复 TokenManager.jsx `setOllamaUrl` 冲突**

- 将组件内的 state 改名为 `localOllamaUrl`/`setLocalOllamaUrl`，避免与导入的 API 函数同名
- 确保 `handleSaveOllamaUrl` 正确调用导入的 `setOllamaUrl` API 函数
- 文件：`client/src/components/TokenManager.jsx`

### 阶段四：完善文档

**策略**：基于实际实现更新文档，确保文档准确可执行。

9. **重写 `功能文档.md`**

- 补充功能模块树（新增修改话题名、分支管理、对话历史加载等）
- 补全每个功能的数据结构定义（Topic 对象、ConversationNode 对象、Token 对象）
- 修正和补全所有序列图（基于实际 API 和方法调用链）
- 补充新增功能的流程图（切换分支、加载历史、语句选择、调整原文）
- 补充已实现但文档遗漏的功能描述（Token 状态管理、清除所有 Token、CLI 等）
- 统一术语和描述风格，确保每个功能的前后端调用链完整准确
- 文件：`功能文档.md`

## 实现注意事项

- 所有新增 API 端点需与现有 server.js 的 try-catch 错误处理模式一致
- TopicManager 的树形操作需注意递归性能，对话树深度一般不超过 50 层，无需特殊优化
- `checkTokenHealth` 应设置超时（建议 5s），避免慢 API 阻塞整个健康检查流程
- 前端状态变量命名需避免与导入的 API 函数重名
- 对话历史加载应使用 BFS/DFS 遍历从 root 到 currentNode 的路径，O(d) 复杂度

本任务主要完善功能文档并补全缺失功能实现。UI 变更集中在现有组件的交互增强，不涉及全新页面设计。

## 需要变更的 UI 组件

### Sidebar 话题列表增强

- 话题列表项添加右键菜单或双击编辑功能，支持修改话题名
- 删除话题需添加确认提示（替代直接删除）

### ChatContainer 消息交互增强

- AI 消息气泡添加悬停操作栏，显示"生成分支"和"调整原文"按钮
- "调整原文"点击后弹出内联编辑框或模态框，支持修改 AI 回复内容
- "生成分支"点击后复制当前节点创建新分支并提示用户

### TokenManager Bug 修复

- 修复 Ollama URL 保存功能（state 命名冲突导致保存无效）
- 无新增 UI 元素，仅修复逻辑

## SubAgent

- **code-explorer**
- Purpose: 在实现各功能前快速定位需要修改的代码位置和依赖关系
- Expected outcome: 精确的代码修改点和调用链分析