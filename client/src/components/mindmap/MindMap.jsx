/**
 * React Flow 脑图组件 - 完整迁移自 AntV X6 版
 * - 布局：主流程垂直向下，分支向右展开（与 X6 相同的子树高度算法）
 * - 交互：拖动画布、滚轮缩放、节点拖拽、小地图
 * - 持久化：节点位置与视口状态保存到服务器 topics.json
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Add, Remove, FitScreen, RestartAlt } from '@mui/icons-material';
import MindMapNode, { NODE_WIDTH, NODE_HEIGHT } from './MindMapNode';
import * as treeApi from '../../services/api/tree.api';

// 节点间距配置
const MAIN_VERTICAL_SPACING = 80;    // 主流程节点之间的垂直间距
const HORIZONTAL_SPACING = 400;      // 分支的水平间距
const BRANCH_VERTICAL_SPACING = 240; // 分支之间的垂直间距

// 主流程边 / 引用边样式（与 X6 注册的 mind-map-edge / quote-edge 一致）
const EDGE_STYLE = {
  stroke: '#3b82f6',
  strokeWidth: 2,
};
const QUOTE_EDGE_STYLE = {
  stroke: '#f59e0b',
  strokeWidth: 2,
  strokeDasharray: '5 5',
};

/**
 * 计算子树所需的总高度（包含所有后代节点）
 * 用于确保兄弟分支之间不会重叠
 */
function calculateSubtreeHeight(node) {
  if (!node.children || node.children.length === 0) {
    return NODE_HEIGHT + MAIN_VERTICAL_SPACING;
  }

  const mainChild = node.children[0];
  const branchChildren = node.children.slice(1);

  // 主流程子树高度
  let mainChildHeight = 0;
  if (mainChild) {
    mainChildHeight = calculateSubtreeHeight(mainChild);
  }

  // 分支子树的总高度
  let branchesTotalHeight = 0;
  branchChildren.forEach((child, index) => {
    const childTreeHeight = calculateSubtreeHeight(child);
    branchesTotalHeight += childTreeHeight;
    // 分支之间添加额外间距
    if (index < branchChildren.length - 1) {
      branchesTotalHeight += BRANCH_VERTICAL_SPACING;
    }
  });

  // 返回主流程和分支中较高的那个，再加上当前节点高度
  const childrenHeight = Math.max(mainChildHeight, branchesTotalHeight);
  return NODE_HEIGHT + MAIN_VERTICAL_SPACING + childrenHeight;
}

/**
 * 计算文档流式布局（与 X6 算法一致）
 * 主流程垂直向下，分支向右展开
 * 先计算子树高度，再分配空间，避免重叠
 * @returns {{nodes: Array, edges: Array}} React Flow 节点/边数组
 */
function calculateLayout(rootNode, callbacks = {}, expandedStates = {}, positionStates = {}, selectedNodeId = null, activeEndNodeId = null) {
  const { onQuoteText, onNodeSelect, onEditNode, onReanswerNode, onDeleteNode, onDeleteBranch, onToggleExpand, onExpandStateChange } = callbacks;
  const nodes = [];
  const edges = [];

  // 第一遍：计算所有子树高度
  const subtreeHeights = new Map();
  function computeSubtreeHeights(node) {
    const height = calculateSubtreeHeight(node);
    subtreeHeights.set(node.id, height);

    if (node.children) {
      node.children.forEach(child => computeSubtreeHeights(child));
    }
    return height;
  }
  computeSubtreeHeights(rootNode);

  function layoutNode(node, x, y, depth = 0, isBranch = false) {
    const nodeId = node.id;
    const isSelected = nodeId === selectedNodeId;
    const expandState = expandedStates[nodeId] || {};
    const initialQuestionExpanded = expandState.question ?? false;
    const initialAnswerExpanded = expandState.answer ?? false;
    const savedPosition = positionStates[nodeId];

    // 使用保存的位置或计算的位置
    const finalX = savedPosition ? savedPosition.x : x;
    const finalY = savedPosition ? savedPosition.y : y;

    const isActiveEndNode = nodeId === activeEndNodeId;
    const data = {
      ...node,
      depth,
      isBranch,
      selected: isSelected,
      isActiveEndNode,
      initialQuestionExpanded,
      initialAnswerExpanded,
      onQuoteText,
      onNodeSelect,
      onEditNode,
      onReanswerNode,
      onDeleteNode,
      onDeleteBranch,
      onToggleExpand,
      onExpandStateChange,
    };

    nodes.push({
      id: nodeId,
      type: 'mindMapNode',
      position: { x: finalX, y: finalY },
      selectable: false, // 节点选中状态完全由外部 visualNodeId 驱动
      data,
    });

    // 处理子节点
    if (node.children && node.children.length > 0) {
      const mainChild = node.children[0];
      const branchChildren = node.children.slice(1);

      // 主流程子节点 - 垂直向下
      if (mainChild) {
        const isQuote = mainChild.branchType === 'quote';

        edges.push({
          id: `${nodeId}-${mainChild.id}`,
          source: nodeId,
          sourceHandle: 'bottom',
          target: mainChild.id,
          targetHandle: 'top',
          type: 'smoothstep',
          style: isQuote ? QUOTE_EDGE_STYLE : EDGE_STYLE,
        });

        layoutNode(
          mainChild,
          x,
          y + NODE_HEIGHT + MAIN_VERTICAL_SPACING,
          depth + 1,
          false
        );
      }

      // 分支子节点 - 向右展开
      if (branchChildren.length > 0) {
        // 计算所有分支子树的总高度
        let totalBranchesHeight = 0;
        branchChildren.forEach((child, index) => {
          totalBranchesHeight += subtreeHeights.get(child.id) || NODE_HEIGHT;
          if (index < branchChildren.length - 1) {
            totalBranchesHeight += BRANCH_VERTICAL_SPACING;
          }
        });

        // 计算起始Y坐标：将分支垂直居中分布在父节点周围
        const parentCenterY = y + NODE_HEIGHT / 2;
        let currentBranchY = parentCenterY - totalBranchesHeight / 2;

        branchChildren.forEach((child) => {
          const isQuote = child.branchType === 'quote';
          const branchX = x + HORIZONTAL_SPACING;
          const childTreeHeight = subtreeHeights.get(child.id) || NODE_HEIGHT;

          edges.push({
            id: `${nodeId}-${child.id}`,
            source: nodeId,
            sourceHandle: 'right',
            target: child.id,
            targetHandle: 'left',
            type: 'smoothstep',
            style: isQuote ? QUOTE_EDGE_STYLE : EDGE_STYLE,
          });

          // 将子节点放置在其子树的垂直中心位置
          const childNodeY = currentBranchY + (childTreeHeight - NODE_HEIGHT) / 2;

          layoutNode(child, branchX, childNodeY, depth + 1, true);

          // 移动到下一个分支的起始位置
          currentBranchY += childTreeHeight + BRANCH_VERTICAL_SPACING;
        });
      }
    }
  }

  layoutNode(rootNode, 0, 0, 0, false);

  return { nodes, edges };
}

// ==================== MindMapInner（ReactFlowProvider 内部） ====================
function MindMapInner({
  treeData,
  topicId,
  loading,
  activeEndNodeId,
  visualNodeId,
  onNodeSelect,
  onQuoteText,
  onEditNode,
  onReanswerNode,
  onDeleteNode,
  onDeleteBranch,
}) {
  const containerRef = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setViewport, fitView, zoomIn, zoomOut } = useReactFlow();

  // 固定 nodeTypes 引用，避免重复渲染触发 React Flow 重建
  const nodeTypes = useRef({ mindMapNode: MindMapNode }).current;

  // 使用 ref 存储位置/展开/视口等状态，避免触发重渲染
  const positionStatesRef = useRef({}); // 节点位置缓存（含拖拽实时更新的位置）
  const expandedStatesRef = useRef({}); // 节点展开状态缓存
  const savedViewportRef = useRef(null); // 服务器保存的视口
  const viewportRestoredRef = useRef(false); // 本次话题是否已完成视口恢复/适应
  const layoutRequestRef = useRef(0); // 布局请求计数，防止旧数据覆盖新话题
  const activeEndNodeIdRef = useRef(null); // 最新活跃末端节点（供布局时计算，避免重建）
  activeEndNodeIdRef.current = activeEndNodeId || null;

  // 初始数据加载标志（先等服务器位置加载完成再布局）
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // 回调引用，避免布局数据中携带过期闭包
  const callbacksRef = useRef({});
  callbacksRef.current = {
    onQuoteText,
    onNodeSelect,
    onEditNode,
    onReanswerNode,
    onDeleteNode,
    onDeleteBranch,
  };

  // 保存节点展开状态（仅更新 ref，不触发重渲染）
  // type: 'question' | 'answer'，分别持久化问题区和回答区的展开状态
  const handleToggleExpand = useCallback((nodeId, isExpanded, type = 'question') => {
    if (!expandedStatesRef.current[nodeId]) {
      expandedStatesRef.current[nodeId] = {};
    }
    expandedStatesRef.current[nodeId][type] = isExpanded;
    console.log(`[展开状态] 节点 ${nodeId} ${type}: ${isExpanded ? '展开' : '收起'}`);
  }, []);

  // 节点展开时提升 zIndex 置顶，收起后恢复（防止展开节点被其他节点遮挡）
  const handleExpandStateChange = useCallback((nodeId, expanded) => {
    const targetZIndex = expanded ? 100 : 0;
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId && (n.zIndex || 0) !== targetZIndex) {
        return { ...n, zIndex: targetZIndex };
      }
      return n;
    }));
  }, [setNodes]);

  // 处理节点选中：蓝色效果完全由外部 visualNodeId 驱动
  const handleNodeSelectInternal = useCallback((nodeData) => {
    onNodeSelect?.(nodeData);
  }, [onNodeSelect]);

  // 保存节点位置到服务器（拖拽结束时调用）
  const handleNodePositionChange = useCallback(async (nodeId, x, y) => {
    if (!topicId) return;

    // 更新内存中的位置状态，不触发重渲染
    positionStatesRef.current[nodeId] = { x, y };

    // 保存到服务器
    try {
      const result = await treeApi.saveNodePositions(topicId, { [nodeId]: { x, y } });
      if (result.success) {
        console.log(`[保存成功] 节点 ${nodeId} 位置: x=${x}, y=${y}`);
      } else {
        console.error(`[保存失败] 节点 ${nodeId}:`, result.error);
      }
    } catch (error) {
      console.error('[保存错误]', error);
    }
  }, [topicId]);

  // 话题切换：重置状态并从服务器加载节点位置与视口
  useEffect(() => {
    if (!topicId) return;
    const requestId = ++layoutRequestRef.current;

    // 重置状态，避免旧话题数据污染新话题
    expandedStatesRef.current = {};
    positionStatesRef.current = {};
    savedViewportRef.current = null;
    viewportRestoredRef.current = false;
    setNodes([]);
    setEdges([]);
    setInitialDataLoaded(false);

    // 从服务器加载节点位置
    treeApi.getNodePositions(topicId).then(result => {
      // 话题已切换则丢弃结果
      if (layoutRequestRef.current !== requestId) return;
      if (result.success) {
        positionStatesRef.current = result.positions || {};
      }
      setInitialDataLoaded(true);
    });

    // 从服务器加载视口位置（可独立于节点布局恢复）
    treeApi.getViewport(topicId).then(result => {
      if (layoutRequestRef.current !== requestId) return;
      if (result.success && result.viewport) {
        savedViewportRef.current = result.viewport;
        const { x, y, zoom } = result.viewport;
        viewportRestoredRef.current = true;
        requestAnimationFrame(() => {
          setViewport({ x: x || 0, y: y || 0, zoom: zoom || 1 });
        });
      } else {
        savedViewportRef.current = null;
      }
    });
  }, [topicId, setNodes, setEdges, setViewport]);

  // 构建布局：仅在 treeData 变化或位置数据加载完成后执行
  useEffect(() => {
    if (!treeData) {
      setNodes([]);
      setEdges([]);
      return;
    }
    if (!initialDataLoaded) return;

    const callbacks = callbacksRef.current;
    const selectedNodeId = visualNodeId || null;

    const { nodes: layoutNodes, edges: layoutEdges } = calculateLayout(
      treeData,
      {
        onQuoteText: callbacks.onQuoteText,
        onNodeSelect: handleNodeSelectInternal,
        onEditNode: callbacks.onEditNode,
        onReanswerNode: callbacks.onReanswerNode,
        onDeleteNode: callbacks.onDeleteNode,
        onDeleteBranch: callbacks.onDeleteBranch,
        onToggleExpand: handleToggleExpand,
        onExpandStateChange: handleExpandStateChange,
      },
      expandedStatesRef.current,
      positionStatesRef.current,
      selectedNodeId,
      activeEndNodeIdRef.current
    );

    setNodes(layoutNodes);
    setEdges(layoutEdges);

    // 首次渲染后恢复保存的视口或自动适应画布
    if (!viewportRestoredRef.current) {
      viewportRestoredRef.current = true;
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (savedViewportRef.current) {
            const { x, y, zoom } = savedViewportRef.current;
            setViewport({ x: x || 0, y: y || 0, zoom: zoom || 1 });
          } else {
            fitView({ padding: 0.2, duration: 400 });
          }
        }, 60);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeData, initialDataLoaded]);

  // 外部 visualNodeId 变化时，只更新节点选中样式而不重建图
  useEffect(() => {
    const selectedNodeId = visualNodeId || null;
    setNodes((nds) => nds.map((n) => {
      const isSelected = n.id === selectedNodeId;
      if (n.data.selected === isSelected) return n;
      return { ...n, data: { ...n.data, selected: isSelected } };
    }));
  }, [visualNodeId, setNodes]);

  // 节点拖拽结束：保存位置
  const handleNodeDragStop = useCallback((event, node) => {
    if (node && node.id && node.position) {
      handleNodePositionChange(node.id, node.position.x, node.position.y);
    }
  }, [handleNodePositionChange]);

  // 视口变化结束：保存视口位置（用户平移/缩放后触发）
  const handleMoveEnd = useCallback((event, viewport) => {
    if (!topicId || !viewport) return;
    const { x, y, zoom } = viewport;
    treeApi.saveViewport(topicId, { x, y, zoom }).then((result) => {
      if (!result.success) {
        console.error('[视口保存失败]', result.error);
      }
    });
  }, [topicId]);

  // 重置节点位置（清除服务器保存的位置，重新应用自动布局，保留视口）
  const handleResetNodes = useCallback(async () => {
    if (!topicId) return;
    try {
      await treeApi.resetNodePositions(topicId);
      positionStatesRef.current = {};
      if (treeData) {
        const selectedNodeId = visualNodeId || null;
        const callbacks = callbacksRef.current;
        const { nodes: layoutNodes, edges: layoutEdges } = calculateLayout(
          treeData,
          {
            onQuoteText: callbacks.onQuoteText,
            onNodeSelect: handleNodeSelectInternal,
            onEditNode: callbacks.onEditNode,
            onReanswerNode: callbacks.onReanswerNode,
            onDeleteNode: callbacks.onDeleteNode,
            onDeleteBranch: callbacks.onDeleteBranch,
            onToggleExpand: handleToggleExpand,
            onExpandStateChange: handleExpandStateChange,
          },
          expandedStatesRef.current,
          positionStatesRef.current,
          selectedNodeId,
          activeEndNodeId || null
        );
        setNodes(layoutNodes);
        setEdges(layoutEdges);
        // 视口保持不变，仅节点归位
        console.log('[重置节点] 节点位置已重置，视口保持不变');
      }
    } catch (error) {
      console.error('重置节点失败:', error);
    }
  }, [topicId, treeData, visualNodeId, activeEndNodeId, setNodes, setEdges, handleNodeSelectInternal, handleToggleExpand, handleExpandStateChange]);

  // 适应画布
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // 放大
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 200 });
  }, [zoomIn]);

  // 缩小
  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 200 });
  }, [zoomOut]);

  return (
    <Box
      ref={containerRef}
      className="mindmap-flow"
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable={false}
        panOnDrag
        zoomOnDoubleClick={false}
        zoomOnPinch
        zoomOnScroll
        minZoom={0.1}
        maxZoom={2}
        onNodeDragStop={handleNodeDragStop}
        onMoveEnd={handleMoveEnd}
        deleteKeyCode={null}
        fitView={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="rgba(148, 163, 184, 0.25)"
          gap={20}
          style={{ backgroundColor: 'var(--background-color, #f8fafc)' }}
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.data?.selected) return '#3b82f6';
            if (n.data?.branchType === 'quote') return '#f59e0b';
            return '#94a3b8';
          }}
          nodeStrokeWidth={3}
          maskColor="rgba(15, 23, 42, 0.1)"
          style={{
            backgroundColor: 'var(--card-background, #ffffff)',
            border: '1px solid var(--border-color, #e5e7eb)',
            borderRadius: 8,
            width: 150,
            height: 120,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            marginBottom: '48px', // 抬高，避免遮挡底部输入面板
          }}
          pannable
          zoomable
        />
      </ReactFlow>

      {/* 左下角控制按钮组 */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 5,
          bgcolor: 'var(--card-background)',
          borderRadius: 1,
          p: 0.5,
          border: '1px solid var(--border-color)',
        }}
      >
        <Tooltip title="放大">
          <IconButton size="small" onClick={handleZoomIn} sx={{ color: 'var(--text-color)' }}>
            <Add fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="缩小">
          <IconButton size="small" onClick={handleZoomOut} sx={{ color: 'var(--text-color)' }}>
            <Remove fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="适应画布">
          <IconButton size="small" onClick={handleFitView} sx={{ color: 'var(--text-color)' }}>
            <FitScreen fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="重置节点">
          <IconButton size="small" onClick={handleResetNodes} sx={{ color: 'var(--text-color)' }}>
            <RestartAlt fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(15, 23, 42, 0.7)',
            zIndex: 10,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: 'var(--primary-color)',
              animation: 'mindmap-pulse 1.4s infinite ease-in-out',
            }} />
            <Box sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: 'var(--primary-color)',
              animation: 'mindmap-pulse 1.4s infinite ease-in-out 0.2s',
            }} />
            <Box sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: 'var(--primary-color)',
              animation: 'mindmap-pulse 1.4s infinite ease-in-out 0.4s',
            }} />
          </Box>
        </Box>
      )}

      <style>{`
        @keyframes mindmap-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .mindmap-flow .react-flow__node {
          cursor: default;
        }
        .mindmap-flow .react-flow__node.dragging {
          cursor: grabbing;
        }
        .mindmap-flow .react-flow__handle {
          z-index: 5;
        }
      `}</style>
    </Box>
  );
}

// ==================== MindMap（对外组件，包一层 Provider） ====================
export default function MindMap(props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
