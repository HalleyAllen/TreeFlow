/**
 * AntV X6 脑图组件 - 使用 React Shape 自定义节点
 * 节点位置持久化存储到服务器 topics.json
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Graph, MiniMap } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Map as MapIcon, FitScreen, Restore } from '@mui/icons-material';
import X6MindMapNode from './X6MindMapNode';
import * as treeApi from '../../services/api/tree.api';

// 注册 React 节点
const radius  = 2 // 连接桩半径
register({
  shape: 'mind-map-node',
  width: 280,
  height: 208,
  component: X6MindMapNode,
  ports: {
    groups: {
      top: {
        position: { name: 'absolute', args: { x: 140, y: 0 } },
        attrs: {
          circle: {
            r: radius,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
      bottom: {
        position: { name: 'absolute', args: { x: 140, y: 208 } },
        attrs: {
          circle: {
            r: radius,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
      left: {
        position: { name: 'absolute', args: { x: 0, y: 132 } },
        attrs: {
          circle: {
            r: radius,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
      right: {
        position: { name: 'absolute', args: { x: 280, y: 132 } },
        attrs: {
          circle: {
            r: radius,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
    },
    items: [
      { id: 'top', group: 'top' },
      { id: 'bottom', group: 'bottom' },
      { id: 'left', group: 'left' },
      { id: 'right', group: 'right' },
    ],
  },
});

// 注册连线
Graph.registerEdge(
  'mind-map-edge',
  {
    inherit: 'edge',
    attrs: {
      line: {
        stroke: '#3b82f6',
        strokeWidth: 2,
        targetMarker: null,
      },
    },
    router: {
      name: 'manhattan',
      args: {
        padding: 10,
        step: 10,
      },
    },
    connector: {
      name: 'rounded',
      args: {
        radius: 8,
      },
    },
  },
  true
);

// 注册引用分支连线（橙色虚线）
Graph.registerEdge(
  'quote-edge',
  {
    inherit: 'edge',
    attrs: {
      line: {
        stroke: '#f59e0b',
        strokeWidth: 2,
        strokeDasharray: '5,5',
        targetMarker: null,
      },
    },
    router: {
      name: 'manhattan',
      args: {
        padding: 10,
        step: 10,
      },
    },
    connector: {
      name: 'rounded',
      rounded: 8,
    },
  },
  true
);

const NODE_WIDTH = 280;
const NODE_HEIGHT = 208; // 节点固定高度（展开/收起由节点内部管理，不影响布局高度）
const HORIZONTAL_SPACING = 360;
const BRANCH_VERTICAL_SPACING = 200;

/**
 * 计算文档流式布局
 * 主流程垂直向下，分支向右展开
 */
function calculateLayout(rootNode, selectedNodeId = null, callbacks = {}, expandedStates = {}, positionStates = {}) {
  const { onQuoteText, onNodeSelect, onCopyNode, onEditNode, onDeleteNode, onDeleteBranch, onToggleExpand } = callbacks;
  const nodes = [];
  const edges = [];

  function layoutNode(node, x, y, depth = 0, isBranch = false) {
    const nodeId = node.id;
    const isSelected = nodeId === selectedNodeId;
    // 从持久化状态中获取展开状态，默认为 false
    const initialExpanded = expandedStates[nodeId] ?? false;
    // 优先使用保存的位置
    const savedPosition = positionStates[nodeId];
    const finalX = savedPosition ? savedPosition.x : x;
    const finalY = savedPosition ? savedPosition.y : y;

    const data = {
      ...node,
      depth,
      isBranch,
      selected: isSelected,
      initialExpanded,
      onQuoteText,
      onNodeSelect,
      onCopyNode,
      onEditNode,
      onDeleteNode,
      onDeleteBranch,
      onToggleExpand,
    };

    nodes.push({
      id: nodeId,
      shape: 'mind-map-node',
      x: finalX,
      y: finalY,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      data,
    });

    let subtreeHeight = 0;

    // 处理子节点
    if (node.children && node.children.length > 0) {
      const mainChild = node.children[0];
      const branchChildren = node.children.slice(1);

      // 主流程子节点 - 垂直向下（从底部到顶部）
      if (mainChild) {
        const isQuote = mainChild.branchType === 'quote';

        edges.push({
          id: `${nodeId}-${mainChild.id}`,
          source: { cell: nodeId, port: 'bottom' },
          target: { cell: mainChild.id, port: 'top' },
          shape: isQuote ? 'quote-edge' : 'mind-map-edge',
        });

        const mainChildHeight = layoutNode(
          mainChild,
          x,
          y + NODE_HEIGHT + 40, // 使用固定高度 + 间距
          depth + 1,
          false
        );

        subtreeHeight = mainChildHeight + NODE_HEIGHT + 40;
      }

      // 分支子节点 - 向右展开（从右侧到左侧）
      const totalBranchesHeight = branchChildren.length * NODE_HEIGHT +
        (branchChildren.length - 1) * BRANCH_VERTICAL_SPACING;
      // 起始Y坐标：以父节点中心为基准，向上偏移一半高度
      const startY = y + (NODE_HEIGHT - totalBranchesHeight) / 2;

      let currentBranchY = startY;
      branchChildren.forEach((child) => {
        const isQuote = child.branchType === 'quote';
        const branchX = x + HORIZONTAL_SPACING;

        edges.push({
          id: `${nodeId}-${child.id}`,
          source: { cell: nodeId, port: 'right' },
          target: { cell: child.id, port: 'left' },
          shape: isQuote ? 'quote-edge' : 'mind-map-edge',
        });

        layoutNode(child, branchX, currentBranchY, depth + 1, true);

        const branchBottom = currentBranchY + NODE_HEIGHT;
        if (branchBottom > subtreeHeight) {
          subtreeHeight = branchBottom;
        }

        currentBranchY += NODE_HEIGHT + BRANCH_VERTICAL_SPACING;
      });
    } else {
      subtreeHeight = NODE_HEIGHT + 40;
    }

    return subtreeHeight;
  }

  layoutNode(rootNode, 0, 0, 0, false);

  return { nodes, edges };
}

export default function X6MindMap({
  treeData,
  topicId,
  loading,
  onNodeSelect,
  onBranchFromNode,
  onQuoteText,
  onEditNode,
  onCopyNode,
  onDeleteNode,
  onDeleteBranch,
}) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const miniMapRef = useRef(null);
  const handleNodePositionChangeRef = useRef(null);
  const positionStatesRef = useRef({}); // 使用 ref 存储位置，避免触发重渲染
  const expandedStatesRef = useRef({}); // 使用 ref 存储展开状态，避免触发重渲染
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  
  // 初始数据加载标志
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // 保存节点展开状态（仅更新 ref，不触发重渲染）
  const handleToggleExpand = useCallback((nodeId, isExpanded) => {
    expandedStatesRef.current[nodeId] = isExpanded;
    console.log(`[展开状态] 节点 ${nodeId}: ${isExpanded ? '展开' : '收起'}`);
  }, []);

  // 保存节点位置到服务器（不触发状态更新，避免重渲染）
  const handleNodePositionChange = useCallback(async (nodeId, x, y) => {
    if (!topicId) return;
    
    // 直接更新内存中的位置状态，不触发 React 重渲染
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
  
  // 将回调函数存入 ref，确保事件监听能访问到最新版本
  handleNodePositionChangeRef.current = handleNodePositionChange;

  // 初始化 Graph
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      grid: true,
      background: {
        color: 'var(--background-color)',
      },
      panning: {
        enabled: true,
      },
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
      },
      interacting: {
        nodeMovable: true, // 启用节点拖拽
      },
    });

    graphRef.current = graph;

    // 初始化小地图
    const miniMapContainer = document.createElement('div');
    miniMapContainer.style.position = 'absolute';
    miniMapContainer.style.right = '16px';
    miniMapContainer.style.bottom = '56px';
    miniMapContainer.style.width = '150px';
    miniMapContainer.style.height = '120px';
    miniMapContainer.style.backgroundColor = 'var(--card-background, #ffffff)';
    miniMapContainer.style.border = '1px solid var(--border-color, #e5e7eb)';
    miniMapContainer.style.borderRadius = '8px';
    miniMapContainer.style.overflow = 'hidden';
    miniMapContainer.style.zIndex = '100';
    miniMapContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    containerRef.current.appendChild(miniMapContainer);
    miniMapRef.current = miniMapContainer;

    const miniMap = new MiniMap({
      container: miniMapContainer,
      width: 150,
      height: 120,
      padding: 10,
      graphOptions: {
        background: {
          color: 'var(--background-color, #f8fafc)',
        },
      },
    });

    graph.use(miniMap);

    // 点击空白处取消选中
    graph.on('blank:click', () => {
      setSelectedNodeId(null);
      onNodeSelect?.(null);
    });

    // 点击节点选中并居中
    graph.on('node:click', ({ node, e }) => {
      if (node && node.id) {
        // 如果点击的是展开/收起按钮或其子元素，不执行居中
        const target = e?.target;
        if (target) {
          const isExpandButton = target.closest('.expand-toggle-btn') ||
            target.closest('[data-expand-toggle="true"]') ||
            target.closest('svg[data-testid="ExpandMoreIcon"]') ||
            target.closest('svg[data-testid="ExpandLessIcon"]');
          if (isExpandButton) return;
        }

        const nodeId = node.id;
        setSelectedNodeId(nodeId);
        const data = node.getData ? node.getData() : {};
        onNodeSelect?.(data);
        // 将点击的节点移动到画布中央
        graph.centerCell(node);
      }
    });

    // 节点拖拽结束，保存位置（通过 ref 调用，避免闭包问题）
    graph.on('node:moved', ({ node }) => {
      if (node && node.id) {
        const position = node.getPosition();
        // 使用 ref 调用，确保获取到最新的函数
        handleNodePositionChangeRef.current?.(node.id, position.x, position.y);
      }
    });

    // 响应窗口大小变化
    const handleResize = () => {
      if (containerRef.current && graphRef.current) {
        graphRef.current.resize(
          containerRef.current.clientWidth,
          containerRef.current.clientHeight
        );
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (miniMapRef.current && containerRef.current) {
        containerRef.current.removeChild(miniMapRef.current);
      }
      graph.dispose();
    };
  }, []);

  // 话题切换时从服务器加载节点位置
  useEffect(() => {
    if (topicId) {
      // 重置状态
      expandedStatesRef.current = {};
      positionStatesRef.current = {};
      setInitialDataLoaded(false);
      // 从服务器加载节点位置
      treeApi.getNodePositions(topicId).then(result => {
        if (result.success) {
          positionStatesRef.current = result.positions || {};
          setInitialDataLoaded(true);
        }
      });
    }
  }, [topicId]);

  // 更新数据（仅在 treeData 变化时重建图）
  useEffect(() => {
    if (!graphRef.current || !treeData) return;

    const graph = graphRef.current;

    // 清空现有内容
    graph.clearCells();

    // 计算布局（传入持久化的展开状态和位置）
    const { nodes, edges } = calculateLayout(treeData, selectedNodeId, {
      onQuoteText,
      onNodeSelect,
      onCopyNode,
      onEditNode,
      onDeleteNode,
      onDeleteBranch,
      onToggleExpand: handleToggleExpand,
    }, expandedStatesRef.current, positionStatesRef.current);

    // 使用 requestAnimationFrame 延迟添加新节点，确保旧节点完全卸载
    // 避免 X6 React Shape 组件异步卸载时与新节点渲染冲突导致重复节点
    requestAnimationFrame(() => {
      // 添加节点，设置 zIndex 确保节点显示在边上方
      nodes.forEach((node) => {
        graph.addNode({
          ...node,
          zIndex: 2, // 节点层级高于边（边默认是 1）
        });
      });

      // 添加边
      edges.forEach((edge) => {
        graph.addEdge({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          shape: edge.shape,
        });
      });
    });
  }, [treeData, selectedNodeId, initialDataLoaded, onQuoteText, onNodeSelect, onCopyNode, onEditNode, onDeleteNode, onDeleteBranch, handleToggleExpand]);

  // 单独处理选中状态变化，只更新节点样式而不重建图
  useEffect(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    const nodes = graph.getNodes();

    nodes.forEach((node) => {
      const nodeId = node.id;
      const isSelected = nodeId === selectedNodeId;
      const data = node.getData() || {};

      // 只更新选中状态，不重建节点
      if (data.selected !== isSelected) {
        node.setData({ ...data, selected: isSelected });
      }
    });
  }, [selectedNodeId]);

  // 适应画布
  const handleFitView = useCallback(() => {
    graphRef.current?.centerContent();
  }, []);

  // 切换小地图显示
  const toggleMiniMap = useCallback(() => {
    setShowMiniMap((prev) => {
      const newValue = !prev;
      if (miniMapRef.current) {
        miniMapRef.current.style.display = newValue ? 'block' : 'none';
      }
      return newValue;
    });
  }, []);

  // 重置布局（清除服务器保存的位置）
  const handleResetLayout = useCallback(async () => {
    if (topicId) {
      try {
        await treeApi.resetNodePositions(topicId);
        positionStatesRef.current = {}; // 清空 ref
        // 重新加载树以应用自动布局
        if (treeData) {
          const graph = graphRef.current;
          if (graph) {
            graph.clearCells();
            const { nodes, edges } = calculateLayout(treeData, selectedNodeId, {
              onQuoteText,
              onNodeSelect,
              onCopyNode,
              onEditNode,
              onDeleteNode,
              onDeleteBranch,
              onToggleExpand: handleToggleExpand,
            }, expandedStatesRef.current, {});
            requestAnimationFrame(() => {
              nodes.forEach((node) => {
                graph.addNode({ ...node, zIndex: 2 });
              });
              edges.forEach((edge) => {
                graph.addEdge({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  shape: edge.shape,
                });
              });
            });
          }
        }
      } catch (error) {
        console.error('重置布局失败:', error);
      }
    }
  }, [topicId, treeData, selectedNodeId, onQuoteText, onNodeSelect, onCopyNode, onEditNode, onDeleteNode, onDeleteBranch, handleToggleExpand]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 控制按钮组 */}
      <Box
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 101,
        }}
      >
        <Tooltip title="适应画布">
          <IconButton
            size="small"
            onClick={handleFitView}
            sx={{
              bgcolor: 'var(--card-background, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:hover': { bgcolor: 'var(--hover-color, #f3f4f6)' },
            }}
          >
            <FitScreen fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={showMiniMap ? '隐藏小地图' : '显示小地图'}>
          <IconButton
            size="small"
            onClick={toggleMiniMap}
            sx={{
              bgcolor: 'var(--card-background, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:hover': { bgcolor: 'var(--hover-color, #f3f4f6)' },
              color: showMiniMap ? '#3b82f6' : 'inherit',
            }}
          >
            <MapIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="重置布局">
          <IconButton
            size="small"
            onClick={handleResetLayout}
            sx={{
              bgcolor: 'var(--card-background, #ffffff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              '&:hover': { bgcolor: 'var(--hover-color, #f3f4f6)' },
            }}
          >
            <Restore fontSize="small" />
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
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'var(--primary-color)',
                animation: 'pulse 1.4s infinite ease-in-out',
              }}
            />
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'var(--primary-color)',
                animation: 'pulse 1.4s infinite ease-in-out 0.2s',
              }}
            />
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: 'var(--primary-color)',
                animation: 'pulse 1.4s infinite ease-in-out 0.4s',
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
