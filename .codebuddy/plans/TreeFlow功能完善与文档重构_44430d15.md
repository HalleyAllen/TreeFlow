---
name: TreeFlow功能完善与文档重构
overview: 聚焦三大核心方向：1)用户自主接入模型（完善自定义提供商UI+修复Bug确保可运行）；2)分支特色功能（前端交互入口+视觉效果优化+对话历史加载）；3)Skill接入架构设计；最后重写功能文档确保与代码一致。
design:
  architecture:
    framework: react
    component: mui
  styleKeywords:
    - Dark Theme
    - Cyberpunk Neon
    - Glassmorphism
    - Micro-animation
    - Tree Branch Visualization
  fontSystem:
    fontFamily: Inter, system-ui, sans-serif
    heading:
      size: 18px
      weight: 600
    subheading:
      size: 14px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#3b82f6"
      - "#2563eb"
      - "#60a5fa"
    background:
      - "#1a1a1a"
      - "#242424"
      - "#2a2a2a"
    text:
      - "#ffffff"
      - rgba(255, 255, 255, 0.9)
      - rgba(255, 255, 255, 0.6)
    functional:
      - "#10b981"
      - "#ef4444"
      - "#f59e0b"
todos:
  - id: fix-backend-bugs
    content: 修复 ollamaEnabled 缺失、ask() 传递对话历史、切换话题加载历史、TokenManager 三方法、前端 setOllamaUrl 冲突
    status: completed
  - id: branch-dialog
    content: 实现分支对话功能：后端分支增强、前端消息悬停操作栏、分支模式 UI、分支切换面板
    status: completed
    dependencies:
      - fix-backend-bugs
  - id: custom-provider
    content: 实现自定义提供商管理：前端配置 UI、后端 CRUD API、连接测试功能
    status: completed
    dependencies:
      - fix-backend-bugs
  - id: skill-system
    content: 实现 Skill 技能系统：后端 SkillManager、前端技能选择面板、内置翻译/总结/代码解释技能
    status: completed
    dependencies:
      - fix-backend-bugs
  - id: update-doc
    content: 基于实际实现重写功能文档，补全所有模块的数据结构、API 列表和序列图
    status: completed
    dependencies:
      - branch-dialog
      - custom-provider
      - skill-system
---

## 产品概述

TreeFlow 是一个基于 Node.js + React 的 AI 对话代理系统，核心特色是分支对话和用户自主接入模型能力。

## 核心功能

### 1. 用户自主接入模型（确保能运行）

- 用户通过前端 AI 服务管理面板，输入 Token 即可自动识别厂商和默认模型（已支持 31 个提供商）
- 用户可手动修改厂商、模型，以及配置自定义 API 提供商（apiUrl/method/headers/requestBody/responsePath 模板）
- 支持 Ollama 本地模型，用户配置 URL 后可自动拉取本地模型列表
- 后端 ApiManager 已有模板化 API 架构，通过 config.json 的 providers 配置可接入任意 OpenAI 兼容 API
- 需修复：agent.ollamaEnabled 属性缺失导致 Ollama 模型列表无法加载

### 2. 分支对话功能（特色功能，优化视觉效果）

- 用户可选择任意一条 AI 回复消息，点击"从此处分支"进入分支模式
- 分支模式下，当前消息之后的内容变为半透明（表示将被替换）
- 用户输入新问题后，系统基于选中节点创建分支（保留原对话树），新回复在分支上展示
- 分支节点在消息列表中以视觉标记（分叉图标或连接线）区分
- 后端 createBranch/switchToBranch 已实现，前端缺少操作入口
- 需修复：ask() 不传递对话历史，AI 无法感知上下文；切换话题不加载历史消息

### 3. Skill 技能系统（基础框架）

- 用户在输入框输入 "/" 触发技能选择面板，展示可用技能列表
- 内置 3 个基础技能：翻译（中英互译）、总结（对话内容摘要）、代码解释（解释代码片段）
- 技能本质上是对用户输入的预处理：将用户原始消息包装为带系统提示词的请求
- 技能配置存储在后端 skills.json，支持扩展
- 前端 placeholder 已提示"发消息或输入'/'选择技能"，但功能未实现

## 技术栈

- **后端**: Node.js + Express.js（JavaScript，CommonJS）
- **前端**: React 18 + Material-UI v7 + Vite
- **数据存储**: 文件系统 JSON（tokens.json、config.json、topics.json、skills.json）
- **脑图可视化**: reactflow v11（已安装，用于分支可视化）

## 实现方案

### 整体策略

分四个阶段：先修复基础设施 Bug，再实现核心特色功能（分支对话），然后补全自主接入模型能力（自定义提供商），最后加入 Skill 技能系统。

### 阶段一：修复基础设施 Bug

**1.1 修复 ollamaEnabled 缺失**

- 在 ConfigManager constructor 的 config 默认值中添加 `ollamaEnabled: false`
- 在 TreeFlowAgent constructor 中添加 `this.ollamaEnabled = this.configManager.getConfig().ollamaEnabled || false` 和 `this.ollamaBaseUrl = this.configManager.getOllamaBaseUrl()`
- 在 agent.js 中添加 `setOllamaEnabled(enabled)` 方法，同步更新 ConfigManager
- 文件：`e:\code\TreeFlow\src\configManager.js`、`e:\code\TreeFlow\src\agent.js`

**1.2 修复 ask() 不传递对话历史**

- 在 TopicManager 中新增 `getConversationPath(topicId)` 方法，通过递归查找从 root 到 currentNode 的路径，返回 `[{message, response}]` 数组
- 修改 agent.ask()：调用 getConversationPath 获取上下文，将历史消息构建为 messages 数组传给 apiManager
- 修改 apiManager.askGenericAPI()：新增 messages 参数支持，当传入 messages 数组时直接使用，不再仅替换单个 `{{question}}`
- 修改 apiManager.askOllama()：同样支持 messages 数组传入
- 文件：`e:\code\TreeFlow\src\topicManager.js`、`e:\code\TreeFlow\src\agent.js`、`e:\code\TreeFlow\src\apiManager.js`

**1.3 修复切换话题不加载历史消息**

- 后端新增 `GET /api/topic-messages?topicId=xxx`，调用 topicManager.getConversationMessages(topicId) 将对话树路径转为扁平消息数组 `[{type:'user',content:...}, {type:'ai',content:...}]`
- 前端 api.js 新增 `loadTopicMessages(topicId)` 函数
- App.jsx 的 handleSwitchTopic 中，切换后调用 loadTopicMessages 加载历史消息替代 `setMessages([])`
- 文件：`e:\code\TreeFlow\src\topicManager.js`、`e:\code\TreeFlow\server.js`、`e:\code\TreeFlow\client\src\services\api.js`、`e:\code\TreeFlow\client\src\App.jsx`

**1.4 修复 TokenManager 缺失的三个方法**

- `checkTokenHealth(token)`：使用该 Token 向对应提供商 API 发送一个轻量级请求（如 models 列表），5s 超时，返回 `{healthy: boolean, message: string}`
- `checkAllTokensHealth()`：并发调用所有 Token 的 checkTokenHealth，使用 Promise.allSettled 避免一个失败影响全部
- `getTokenUsageStats()`：返回每个 Token 的创建时间、状态、模型、提供商等统计信息
- 文件：`e:\code\TreeFlow\src\tokenManager.js`

**1.5 修复 TokenManager.jsx setOllamaUrl 命名冲突**

- 组件内 state `const [ollamaUrl, setOllamaUrl]` 改为 `const [localOllamaUrl, setLocalOllamaUrl]`，避免与导入的 API 函数 `setOllamaUrl` 同名
- handleSaveOllamaUrl 中正确调用导入的 `setOllamaUrl` API 函数
- 文件：`e:\code\TreeFlow\client\src\components\TokenManager.jsx`

### 阶段二：实现分支对话（特色功能）

**2.1 后端增强：分支创建支持指定节点**

- 修改 `POST /api/branch`，接收可选参数 `{fromNodeId}`，从指定节点而非 currentNode 创建分支
- topicManager.createBranch 增加可选 fromNodeId 参数
- 文件：`e:\code\TreeFlow\server.js`、`e:\code\TreeFlow\src\topicManager.js`

**2.2 前端分支模式状态管理**

- App.jsx 新增状态：`branchMode`（是否处于分支选择模式）、`branchFromIndex`（从哪条消息分支）、`branchMessages`（分支模式下显示的消息列表，带高亮标记）
- 消息数据结构增强：每条消息新增 `nodeId` 字段（从后端返回），用于定位对话树节点
- 修改 sendMessage API 返回 `{response, nodeId}` 包含节点 ID
- 文件：`e:\code\TreeFlow\client\src\App.jsx`、`e:\code\TreeFlow\server.js`

**2.3 ChatContainer 分支交互 UI**

- AI 消息气泡悬停时显示操作工具栏："从此处分支" 按钮
- 点击后进入分支预览模式：选中消息之后的消息变为半透明，底部输入框显示提示"输入新问题从此处创建分支"
- 用户输入并发送后，后端基于选中节点创建分支，前端切换到新分支的消息视图
- 分支节点消息旁显示分支图标（fork icon），视觉标记区分
- 用户可点击分支图标查看其他分支的对话内容
- 文件：`e:\code\TreeFlow\client\src\components\ChatContainer.jsx`

**2.4 分支切换面板**

- 当某条消息有多个分支时，显示分支指示器（如 "2 条分支" 标签）
- 点击展开分支列表，列出该节点下的所有子分支摘要
- 点击某个分支项，调用 switchBranch API 切换到该分支，重新加载消息
- 文件：`e:\code\TreeFlow\client\src\components\BranchSelector.jsx`（新组件）

### 阶段三：补全自主接入模型能力

**3.1 前端自定义提供商管理 UI**

- TokenManager 组件中新增"自定义提供商"Tab 区域
- 用户可添加自定义提供商：填写名称、API URL、HTTP 方法、请求头（key-value 编辑器）、请求体模板、响应提取路径
- 支持使用占位符 `{{token}}`、`{{model}}`、`{{question}}`
- 保存时通过 `POST /api/providers` 写入 config.json 的 providers
- 文件：`e:\code\TreeFlow\client\src\components\CustomProviderManager.jsx`（新组件）

**3.2 后端提供商管理 API**

- 新增 `POST /api/providers`：添加/更新自定义提供商配置
- 新增 `DELETE /api/providers/:name`：删除自定义提供商
- 新增 `GET /api/providers`：获取所有提供商配置（脱敏，不返回 Token）
- agent.updateProviders 方法已存在，直接复用
- 文件：`e:\code\TreeFlow\server.js`

**3.3 提供商连接测试**

- 前端在自定义提供商配置表单中提供"测试连接"按钮
- 调用后端 `POST /api/test-provider`，发送一个简单请求验证 API 连通性
- 返回成功/失败状态和错误信息
- 文件：`e:\code\TreeFlow\server.js`、`e:\code\TreeFlow\src\apiManager.js`

### 阶段四：Skill 技能系统

**4.1 后端 Skill 管理**

- 新建 `e:\code\TreeFlow\skills.json`：预置 3 个内置技能
- translate：翻译技能，system prompt 为"你是一个专业翻译，请将用户输入翻译为{目标语言}，如果输入是中文则翻译为英文，否则翻译为中文"
- summarize：总结技能，system prompt 为"请简洁总结以下内容的核心要点"
- explain-code：代码解释技能，system prompt 为"请逐步解释以下代码的功能和原理"
- 新建 `e:\code\TreeFlow\src\skillManager.js`：SkillManager 类，提供 loadSkills/getSkill/executeSkill 方法
- executeSkill(skillId, question)：将用户输入和技能系统提示词组合，返回增强后的请求
- 新增 `GET /api/skills` 和 `POST /api/ask` 增强（支持 skillId 参数）
- 文件：`e:\code\TreeFlow\skills.json`（新）、`e:\code\TreeFlow\src\skillManager.js`（新）、`e:\code\TreeFlow\server.js`

**4.2 前端技能选择面板**

- ChatContainer 输入框监听输入，当输入以 "/" 开头时弹出技能选择面板
- 面板展示技能列表（图标 + 名称 + 描述），支持键盘上下选择和回车确认
- 选择技能后，输入框 placeholder 变为"[技能名] 模式"，发送消息时携带 skillId
- 文件：`e:\code\TreeFlow\client\src\components\SkillSelector.jsx`（新组件）、`e:\code\TreeFlow\client\src\components\ChatContainer.jsx`

## 实现注意事项

- 所有新增 API 端点需与现有 server.js 的 try-catch 错误处理模式一致
- 对话树路径遍历使用递归，深度一般不超过 50 层，无需特殊优化
- checkTokenHealth 设置 5s 超时，使用 AbortController
- 前端状态变量命名避免与导入的 API 函数重名
- Skill 系统仅做输入预处理，不改变核心 ask 流程，保持架构简洁
- 分支模式的视觉状态（半透明、高亮）使用 CSS transition 实现平滑过渡
- 自定义提供商的请求体模板使用 JSON 编辑器，提供语法高亮和错误提示

## 目录结构（涉及变更的文件）

```
e:\code\TreeFlow\
├── 功能文档.md                  # [MODIFY] 重写功能文档
├── server.js                    # [MODIFY] 新增 API 端点
├── config.json                  # [MODIFY] 新增 ollamaEnabled 字段
├── skills.json                  # [NEW] 技能配置文件
├── src/
│   ├── agent.js                 # [MODIFY] 新增 ollamaEnabled、setOllamaEnabled、ask 传历史
│   ├── apiManager.js            # [MODIFY] askGenericAPI/askOllama 支持 messages 数组
│   ├── topicManager.js          # [MODIFY] 新增 getConversationPath、getConversationMessages、createBranch 增强
│   ├── tokenManager.js          # [MODIFY] 新增 checkTokenHealth/checkAllTokensHealth/getTokenUsageStats
│   ├── configManager.js         # [MODIFY] 默认配置增加 ollamaEnabled
│   └── skillManager.js          # [NEW] 技能管理模块
├── client/src/
│   ├── App.jsx                  # [MODIFY] 分支状态管理、切换话题加载历史、Skill 状态
│   ├── components/
│   │   ├── ChatContainer.jsx    # [MODIFY] 消息悬停操作、分支模式 UI、Skill 触发
│   │   ├── Sidebar.jsx          # [MODIFY] 话题重命名
│   │   ├── TokenManager.jsx     # [MODIFY] 修复命名冲突、新增自定义提供商 Tab
│   │   ├── Header.jsx           # [MODIFY] 新增分支视图切换按钮
│   │   ├── BranchSelector.jsx   # [NEW] 分支选择面板组件
│   │   ├── SkillSelector.jsx    # [NEW] 技能选择面板组件
│   │   └── CustomProviderManager.jsx # [NEW] 自定义提供商管理组件
│   └── services/
│       └── api.js               # [MODIFY] 新增 API 调用函数
```

## 设计风格

采用深色科技风格，配合分支对话的思维导图特性，营造专业 AI 工具的视觉氛围。整体使用深灰色背景搭配蓝色系主色调，分支节点使用渐变色标记和动画过渡效果。

### 页面规划

#### 页面一：主对话页面（ChatContainer 增强）

- **顶部标题栏**：显示当前话题名称和分支指示器
- **消息列表区域**：用户消息（蓝色，右对齐）和 AI 消息（深色卡片，左对齐），AI 消息悬停显示操作工具栏
- **分支模式覆盖层**：当进入分支选择模式时，选中消息之后的内容半透明化，底部出现分支创建输入区域
- **分支指示器**：有分支的消息节点旁显示分叉图标和分支数量标签
- **输入区域**：底部固定输入框，左侧显示当前模型选择器，右侧发送按钮，输入 "/" 时弹出技能面板

#### 页面二：AI 服务管理面板（TokenManager 增强）

- **添加 Token 区域**：输入框 + 厂商/模型自动识别
- **Ollama 设置区域**：启用开关 + URL 配置
- **已配置服务列表**：Token 卡片列表，每张卡片显示厂商、模型、状态、操作按钮
- **自定义提供商 Tab**（新增）：提供商配置表单，含 API URL、请求头编辑器、请求体模板编辑器、响应路径配置、测试连接按钮

#### 页面三：技能选择面板（SkillSelector 弹出层）

- 从输入框上方弹出，显示技能列表
- 每个技能项：图标 + 名称 + 简短描述
- 支持键盘导航和搜索过滤

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 在实现各功能模块前，快速定位需要修改的代码位置、依赖关系和调用链
- Expected outcome: 精确的代码修改点分析，确保实现方案与现有架构一致