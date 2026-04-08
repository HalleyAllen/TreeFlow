/**
 * AntV X6 脑图组件 - 使用 React Shape 自定义节点
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Graph } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Map as MapIcon, FitScreen } from '@mui/icons-material';
import X6MindMapNode from './X6MindMapNode';

// MiniMap 插件
import { MiniMap } from '@antv/x6-plugin-minimap';

// 注册 React 节点
register({
  shape: 'mind-map-node',
  width: 280,
  height: 180,
  component: X6MindMapNode,
  ports: {
    groups: {
      top: {
        position: 'top',
        attrs: {
          circle: {
            r: 1,
            magnet: true,
            stroke: 'transparent',
            fill: 'transparent',
          },
        },
      },
      bottom: {
        position: 'bottom',
        attrs: {
          circle: {
            r: 1,
            magnet: true,
            stroke: 'transparent',
            fill: 'transparent',
          },
        },
      },
      left: {
        position: 'left',
        attrs: {
          circle: {
            r: 1,
            magnet: true,
            stroke: 'transparent',
            fill: 'transparent',
          },
        },
      },
      right: {
        position: 'right',
        attrs: {
          circle: {
            r: 1,
            magnet: true,
            stroke: 'transparent',
            fill: 'transparent',
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
const NODE_HEIGHT = 180;
const VERTICAL_SPACING = 220;
const HORIZONTAL_SPACING = 340;
const BRANCH_VERTICAL_SPACING = 180;

/**
 * 计算文档流式布局
 * 主流程垂直向下，分支向右展开
 */
function calculateLayout(rootNode, selectedNodeId = null, onQuoteText = null, onNodeSelect = null, expandedNodeIds = new Set(), onToggleExpand = null) {
  const nodes = [];
  const edges = [];

  function layoutNode(node, x, y, depth = 0, isBranch = false) {
    const nodeId = node.id;
    const isSelected = nodeId === selectedNodeId;
    const isExpanded = expandedNodeIds.has(nodeId);

    const data = {
      ...node,
      depth,
      isBranch,
      selected: isSelected,
      isExpanded,
      onQuoteText,
      onNodeSelect,
      onToggleExpand,
    };

    nodes.push({
      id: nodeId,
      shape: 'mind-map-node',
      x,
      y,
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
          y + VERTICAL_SPACING,
          depth + 1,
          false
        );

        subtreeHeight = mainChildHeight + VERTICAL_SPACING;
      }

      // 分支子节点 - 向右展开（从右侧到左侧）
      // 计算分支节点整体布局，使其与父节点垂直居中对齐
      const branchCount = branchChildren.length;
      const totalBranchesHeight = branchCount * NODE_HEIGHT + (branchCount - 1) * BRANCH_VERTICAL_SPACING;
      // 起始Y坐标：以父节点中心为基准，向上偏移一半高度
      const startY = y + (NODE_HEIGHT - totalBranchesHeight) / 2;

      branchChildren.forEach((child, index) => {
        const isQuote = child.branchType === 'quote';
        const branchX = x + HORIZONTAL_SPACING;
        // 每个分支节点的Y坐标
        const branchY = startY + index * (NODE_HEIGHT + BRANCH_VERTICAL_SPACING);

        edges.push({
          id: `${nodeId}-${child.id}`,
          source: { cell: nodeId, port: 'right' },
          target: { cell: child.id, port: 'left' },
          shape: isQuote ? 'quote-edge' : 'mind-map-edge',
        });

        layoutNode(child, branchX, branchY, depth + 1, true);

        const branchBottom = branchY + NODE_HEIGHT;
        if (branchBottom > subtreeHeight) {
          subtreeHeight = branchBottom;
        }
      });
    } else {
      subtreeHeight = VERTICAL_SPACING;
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
}) {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const miniMapRef = useRef(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());

  // 处理节点展开/收起
  const handleToggleExpand = useCallback((nodeId) => {
    setExpandedNodeIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

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

    // 点击节点选中
    graph.on('node:click', ({ node }) => {
      if (node && node.id) {
        const nodeId = node.id;
        setSelectedNodeId(nodeId);
        const data = node.getData ? node.getData() : {};
        onNodeSelect?.(data);
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

  // 更新数据
  useEffect(() => {
    if (!graphRef.current || !treeData) return;

    const graph = graphRef.current;

    // 清空现有内容
    graph.clearCells();

    // 计算布局
    const { nodes, edges } = calculateLayout(treeData, selectedNodeId, onQuoteText, onNodeSelect, expandedNodeIds, handleToggleExpand);

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
  }, [treeData, selectedNodeId, onNodeSelect, expandedNodeIds, handleToggleExpand]);

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
