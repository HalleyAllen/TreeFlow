/**
 * AntV X6 脑图组件 - 使用 React Shape 自定义节点
 * 节点位置持久化存储到服务器 topics.json
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Graph, MiniMap } from '@antv/x6';
import { register } from '@antv/x6-react-shape';
import { Box, IconButton, Tooltip } from '@mui/material';
import { Map as MapIcon, FitScreen, Restore, Add, Remove, RestartAlt } from '@mui/icons-material';
import X6MindMapNode, { NODE_WIDTH, NODE_HEIGHT } from './X6MindMapNode';
import * as treeApi from '../../services/api/tree.api';

// 连接桩配置常量
const PORT_RADIUS = 1;
const PORT_OFFSET = { x: 140, y: 110 }; // 节点中心位置

// 注册 React 节点
register({
  shape: 'mind-map-node',
  width: NODE_WIDTH,
  height: NODE_HEIGHT,
  component: X6MindMapNode,
  ports: {
    groups: {
      top: {
        position: { name: 'absolute', args: { x: PORT_OFFSET.x, y: 0 } },
        attrs: {
          circle: {
            r: PORT_RADIUS,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
      bottom: {
        position: { name: 'absolute', args: { x: PORT_OFFSET.x, y: NODE_HEIGHT } },
        attrs: {
          circle: {
            r: PORT_RADIUS,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
      left: {
        position: { name: 'absolute', args: { x: 0, y: PORT_OFFSET.y } },
        attrs: {
          circle: {
            r: PORT_RADIUS,
            magnet: true,
            stroke: 'none',
            fill: 'none',
          },
        },
      },
      right: {
        position: { name: 'absolute', args: { x: NODE_WIDTH, y: PORT_OFFSET.y } },
        attrs: {
          circle: {
            r: PORT_RADIUS,
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

// 节点间距配置（NODE_WIDTH/NODE_HEIGHT 从 X6MindMapNode 导入）
const MAIN_VERTICAL_SPACING = 40;    // 主流程节点之间的垂直间距
const HORIZONTAL_SPACING = 360;      // 分支的水平间距
const BRANCH_VERTICAL_SPACING = 200; // 分支之间的垂直间距

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
          y + NODE_HEIGHT + MAIN_VERTICAL_SPACING, // 使用固定高度 + 间距
          depth + 1,
          false
        );

        subtreeHeight = mainChildHeight + NODE_HEIGHT + MAIN_VERTICAL_SPACING;
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
      subtreeHeight = NODE_HEIGHT + MAIN_VERTICAL_SPACING;
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

  // 处理节点选中（更新内部状态并通知外部）
  const handleNodeSelectInternal = useCallback((nodeData) => {
    if (nodeData && nodeData.id) {
      setSelectedNodeId(nodeData.id);
    } else {
      setSelectedNodeId(null);
    }
    // 通知外部
    onNodeSelect?.(nodeData);
  }, [onNodeSelect]);

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
        edgeMovable: false,
        edgeLabelMovable: false,
        arrowheadMovable: false,
        vertexMovable: false,
        magnetConnectable: false,
        stopDelegateOnDragging: true, // 拖拽时停止事件传递到内部元素
      },
      // 确保 foreignObject 内的文字可以被选中
      onPortRendered: () => {},
      // 禁用画布默认的选中行为，允许文字选择
      selecting: {
        enabled: false, // 禁用画布框选
      },
      // 禁用画布上的 rubberband 框选
      rubberband: {
        enabled: false,
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

    // 点击空白处取消选中（使用 mousedown 比 click 更灵敏）
    graph.on('blank:mousedown', () => {
      setSelectedNodeId(null);
      onNodeSelect?.(null);
    });

    // 点击空白处取消选中
    graph.on('blank:click', () => {
      setSelectedNodeId(null);
      onNodeSelect?.(null);
    });

    // 节点拖拽结束，保存位置（通过 ref 调用，避免闭包问题）
    graph.on('node:moved', ({ node }) => {
      if (node && node.id) {
        const position = node.getPosition();
        // 使用 ref 调用，确保获取到最新的函数
        handleNodePositionChangeRef.current?.(node.id, position.x, position.y);
      }
    });

    // 监听视口变化，保存视口位置
    let viewportDebounceTimer = null;
    graph.on('translate', () => {
      if (!topicId) return;
      clearTimeout(viewportDebounceTimer);
      viewportDebounceTimer = setTimeout(() => {
        const matrix = graph.transform.getMatrix();
        treeApi.saveViewport(topicId, {
          x: matrix.e,
          y: matrix.f,
          zoom: matrix.a
        });
      }, 500);
    });

    graph.on('scale', () => {
      if (!topicId) return;
      clearTimeout(viewportDebounceTimer);
      viewportDebounceTimer = setTimeout(() => {
        const matrix = graph.transform.getMatrix();
        treeApi.saveViewport(topicId, {
          x: matrix.e,
          y: matrix.f,
          zoom: matrix.a
        });
      }, 500);
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

    // 监听 Ctrl+S 保存位置和视口
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!topicId || !graphRef.current) return;

        // 保存视口位置
        const matrix = graphRef.current.transform.getMatrix();
        treeApi.saveViewport(topicId, {
          x: matrix.e,
          y: matrix.f,
          zoom: matrix.a
        });

        // 保存所有节点位置
        const nodes = graphRef.current.getNodes();
        const positions = {};
        nodes.forEach(node => {
          const pos = node.getPosition();
          positions[node.id] = { x: pos.x, y: pos.y };
        });
        if (Object.keys(positions).length > 0) {
          treeApi.saveNodePositions(topicId, positions);
        }

        console.log('[Ctrl+S] 已保存视口位置和节点位置');
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (miniMapRef.current && containerRef.current) {
        containerRef.current.removeChild(miniMapRef.current);
      }
      graph.dispose();
    };
  }, [topicId]);

  // 话题切换时从服务器加载节点位置和视口
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
      // 从服务器加载视口位置
      treeApi.getViewport(topicId).then(result => {
        if (result.success && result.viewport && graphRef.current) {
          const { x, y, zoom } = result.viewport;
          // 使用 scale 和 translate 恢复视口
          graphRef.current.scale(zoom || 1, zoom || 1);
          graphRef.current.translate(x || 0, y || 0);
        }
      });
    }
  }, [topicId]);

  // 更新数据（仅在 treeData 变化时重建图）
  // 注意：selectedNodeId 不在这里，避免点击节点时重建图
  useEffect(() => {
    if (!graphRef.current || !treeData) return;

    const graph = graphRef.current;

    // 清空现有内容
    graph.clearCells();

    // 计算布局（传入持久化的展开状态和位置）
    const { nodes, edges } = calculateLayout(treeData, selectedNodeId, {
      onQuoteText,
      onNodeSelect: handleNodeSelectInternal,
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
  }, [treeData, initialDataLoaded, onQuoteText, handleNodeSelectInternal, onCopyNode, onEditNode, onDeleteNode, onDeleteBranch, handleToggleExpand]);

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

  // 放大
  const handleZoomIn = useCallback(() => {
    graphRef.current?.zoom(0.2);
  }, []);

  // 缩小
  const handleZoomOut = useCallback(() => {
    graphRef.current?.zoom(-0.2);
  }, []);

  // 重置缩放
  const handleResetZoom = useCallback(() => {
    graphRef.current?.zoomTo(1);
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

  // 重置布局（清除服务器保存的位置和视口）
  const handleResetLayout = useCallback(async () => {
    if (topicId) {
      try {
        await treeApi.resetNodePositions(topicId);
        await treeApi.resetViewport(topicId);
        positionStatesRef.current = {}; // 清空 ref
        // 重新加载树以应用自动布局
        if (treeData) {
          const graph = graphRef.current;
          if (graph) {
            graph.clearCells();
            const { nodes, edges } = calculateLayout(treeData, selectedNodeId, {
              onQuoteText,
              onNodeSelect: handleNodeSelectInternal,
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
            // 重置视口到居中
            graph.centerContent();
          }
        }
      } catch (error) {
        console.error('重置布局失败:', error);
      }
    }
  }, [topicId, treeData, selectedNodeId, onQuoteText, handleNodeSelectInternal, onCopyNode, onEditNode, onDeleteNode, onDeleteBranch, handleToggleExpand]);

  // 重置节点（只清除节点位置，保留视口，重新应用自动布局）
  const handleResetNodes = useCallback(async () => {
    if (topicId) {
      try {
        await treeApi.resetNodePositions(topicId);
        positionStatesRef.current = {}; // 清空位置 ref
        // 重新加载树以应用自动布局（保留当前视口）
        if (treeData) {
          const graph = graphRef.current;
          if (graph) {
            graph.clearCells();
            const { nodes, edges } = calculateLayout(treeData, selectedNodeId, {
              onQuoteText,
              onNodeSelect: handleNodeSelectInternal,
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
        console.log('[重置节点] 节点位置已重置，视口保持不变');
      } catch (error) {
        console.error('重置节点失败:', error);
      }
    }
  }, [topicId, treeData, selectedNodeId, onQuoteText, handleNodeSelectInternal, onCopyNode, onEditNode, onDeleteNode, onDeleteBranch, handleToggleExpand]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* X6 Graph 容器 */}
      <Box
        ref={containerRef}
        className="x6-mindmap-container"
        sx={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'hidden',
          padding: '4px 8px 4px 8px !important',
        }}
      />
      {/* 左下角控制按钮组 */}
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          zIndex: 1001,
          bgcolor: 'var(--card-background)',
          borderRadius: 1,
          p: 0.5,
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
        <Tooltip title="重置缩放">
          <IconButton size="small" onClick={handleResetZoom} sx={{ color: 'var(--text-color)' }}>
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
