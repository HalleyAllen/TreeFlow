# MindMap 脑图组件文档

## 概述

MindMap 组件是基于 React Flow 构建的交互式思维导图可视化组件，用于展示 TreeFlow 应用的对话树结构。支持多种布局方式、节点展开/折叠、文字选择等功能。

## 文件结构

```
mindmap/
├── MindMap.jsx          # 主容器组件
├── MindMapNode.jsx      # 节点渲染组件
├── useMindMapLayout.js  # 布局计算 Hook
└── README.md            # 本文档
```

## 组件详解

### 1. MindMap.jsx

主容器组件，负责集成 React Flow 和管理整体状态。

#### Props

| 属性 | 类型 | 说明 |
|------|------|------|
| `treeData` | Object | 树形数据，包含节点层级关系 |
| `currentNodeId` | String | 当前激活的节点 ID |
| `onNodeSelect` | Function | 节点选中回调函数 |
| `onBranchFromNode` | Function | 创建分支回调函数 |
| `loading` | Boolean | 加载状态 |

#### 功能特性

- **布局切换**：支持文档流、放射状、垂直、水平四种布局
- **视图控制**：缩放、适应画布、MiniMap 导航
- **节点选择**：禁用 React Flow 默认选择行为，支持文字选择
- **交互优化**：节点不可拖拽，画布可拖拽平移

#### React Flow 配置

```jsx
nodesDraggable={false}        // 节点不可拖拽
nodesConnectable={false}      // 不可连线
elementsSelectable={false}    // 禁用元素选择
selectionOnDrag={false}       // 拖拽时不选择
selectionKeyCode={null}       // 禁用选择键（Ctrl）
panOnDrag={true}              // 画布可拖拽
```

---

### 2. MindMapNode.jsx

节点渲染组件，展示单个对话节点的内容。

#### 节点数据结构

```jsx
{
  question: "用户问题",
  answer: "AI 回答内容",
  answerSummary: "回答摘要",
  childrenCount: 2,
  isCurrentPath: true,
  depth: 0,
  status: "completed",  // loading | error | completed
  error: null
}
```

#### 功能特性

- **内容展示**：问题和回答分区显示
- **展开/折叠**：超长内容可展开查看完整内容
- **加载状态**：显示 AI 思考中的加载动画
- **错误状态**：显示错误信息
- **分支操作**：支持从当前节点创建分支
- **文字选择**：支持鼠标直接选择文字复制

#### 交互优化

```jsx
// 阻止 React Flow 事件冒泡，允许文字选择
onMouseDown={(e) => e.stopPropagation()}
```

---

### 3. useMindMapLayout.js

布局计算 Hook，将树形数据转换为 React Flow 的节点和边。

#### 支持的布局类型

| 类型 | 说明 |
|------|------|
| `document` | 文档流布局（默认），主对话垂直向下，分支水平展开 |
| `radial` | 放射状布局，根节点居中，子节点放射分布 |
| `vertical` | 垂直布局，所有节点自上而下排列 |
| `horizontal` | 水平布局，所有节点自左向右排列 |

#### 返回值

```jsx
{
  nodes: [{ id, position: {x, y}, data }],
  edges: [{ id, source, target }]
}
```

---

## 使用示例

```jsx
import MindMap from './components/mindmap/MindMap';

function App() {
  const [treeData, setTreeData] = useState(null);
  
  return (
    <MindMap
      treeData={treeData}
      currentNodeId="node-123"
      onNodeSelect={(nodeData) => console.log('选中节点:', nodeData)}
      onBranchFromNode={(nodeData) => console.log('创建分支:', nodeData)}
      loading={false}
    />
  );
}
```

---

## 样式配置

### CSS 变量

组件使用以下 CSS 变量，可在 `index.css` 中自定义：

```css
--primary-color: #3b82f6;      /* 主色调 */
--card-background: #242424;     /* 节点背景 */
--border-color: #333;           /* 边框颜色 */
--text-color: rgba(255,255,255,0.9);  /* 文字颜色 */
--text-secondary: rgba(255,255,255,0.6); /* 次要文字 */
```

### 文字选择优化

```css
/* 确保节点内文字可选择 */
.mindmap-flow .MuiTypography-root {
  user-select: text !important;
  cursor: text !important;
}
```

---

## 注意事项

1. **文字选择**：直接拖动鼠标即可选择文字，无需按住 Ctrl 键
2. **画布拖拽**：在节点外的空白区域拖拽可移动画布
3. **节点大小**：固定宽度 280px，高度自适应内容
4. **性能优化**：节点使用 `memo` 包裹，避免不必要的重渲染
5. **兼容性**：基于 React Flow v11+，需要 `@xyflow/react` 依赖

---

## 依赖

```json
{
  "@xyflow/react": "^11.x",
  "@mui/material": "^5.x",
  "@mui/icons-material": "^5.x"
}
```
