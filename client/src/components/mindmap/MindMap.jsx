/**
 * 脑图主容器组件
 * 集成 ReactFlow，提供完整的脑图视图
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import HorizontalSplitIcon from '@mui/icons-material/HorizontalSplit';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import MindMapNode from './MindMapNode';
import { useMindMapLayout } from './useMindMapLayout';

// 节点类型注册
const nodeTypes = {
  mindMapNode: MindMapNode
};

// 默认节点样式
const defaultNodeOptions = {
  type: 'mindMapNode',
  draggable: false,
  selectable: true,
  connectable: false
};

function MindMapInner({ 
  treeData, 
  currentNodeId,
  onNodeSelect,
  onBranchFromNode,
  loading 
}) {
  const [layoutType, setLayoutType] = useState('radial');
  const [selectedNode, setSelectedNode] = useState(null);
  const reactFlowInstance = useRef(null);

  // 计算布局
  const { nodes: layoutNodes, edges: layoutEdges } = useMindMapLayout(treeData, layoutType);

  // 转换为 ReactFlow 格式
  const initialNodes = layoutNodes.map(node => ({
    ...defaultNodeOptions,
    id: node.id,
    position: node.position,
    data: {
      ...node.data,
      onBranchClick: onBranchFromNode,
      onNodeClick: (nodeData) => {
        setSelectedNode(nodeData.id);
        onNodeSelect?.(nodeData);
      }
    },
    selected: selectedNode === node.id
  }));

  const initialEdges = layoutEdges.map(edge => ({
    ...edge,
    animated: true,
    style: { 
      stroke: 'var(--primary-color)',
      strokeWidth: 2,
      opacity: 0.6
    },
    markerEnd: {
      type: 'arrowclosed',
      color: 'var(--primary-color)'
    }
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 数据更新时重新设置节点
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [treeData, layoutType, selectedNode]);

  // 布局切换
  const handleLayoutChange = useCallback((_, newLayout) => {
    if (newLayout) {
      setLayoutType(newLayout);
    }
  }, []);

  // 适应画布
  const handleFitView = useCallback(() => {
    reactFlowInstance.current?.fitView({ padding: 0.2, duration: 800 });
  }, []);

  // 初始化时适应画布
  useEffect(() => {
    if (treeData && !loading) {
      setTimeout(() => {
        handleFitView();
      }, 100);
    }
  }, [treeData, loading, handleFitView]);

  // 右键菜单
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNode(node.id);
    onNodeSelect?.(node.data);
  }, [onNodeSelect]);

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true
        }}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        style={{
          background: 'var(--background-color)'
        }}
      >
        <Background 
          color="var(--border-color)"
          gap={20}
          size={1}
          style={{
            background: 'var(--background-color)'
          }}
        />
        
        <Controls 
          style={{
            background: 'var(--card-background)',
            border: '1px solid var(--border-color)'
          }}
        />
        
        <MiniMap 
          style={{
            background: 'var(--card-background)',
            border: '1px solid var(--border-color)',
            borderRadius: 8
          }}
          nodeColor={(node) => 
            node.data?.isCurrentPath ? 'var(--primary-color)' : 'var(--text-secondary)'
          }
          maskColor="rgba(0, 0, 0, 0.2)"
        />

        {/* 布局切换面板 */}
        <Panel position="top-left">
          <ToggleButtonGroup
            value={layoutType}
            exclusive
            onChange={handleLayoutChange}
            size="small"
            sx={{
              bgcolor: 'var(--card-background)',
              border: '1px solid var(--border-color)',
              borderRadius: 1,
              '& .MuiToggleButton-root': {
                color: 'var(--text-secondary)',
                border: 'none',
                '&.Mui-selected': {
                  bgcolor: 'var(--primary-color)',
                  color: 'white'
                },
                '&:hover': {
                  bgcolor: 'var(--hover-bg)'
                }
              }
            }}
          >
            <Tooltip title="放射状布局">
              <ToggleButton value="radial">
                <AccountTreeIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="垂直布局">
              <ToggleButton value="vertical">
                <VerticalAlignTopIcon sx={{ fontSize: 18 }} />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="水平布局">
              <ToggleButton value="horizontal">
                <HorizontalSplitIcon sx={{ fontSize: 18, transform: 'rotate(90deg)' }} />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Panel>

        {/* 适应画布按钮 */}
        <Panel position="bottom-left">
          <Box
            onClick={handleFitView}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              bgcolor: 'var(--card-background)',
              border: '1px solid var(--border-color)',
              borderRadius: 1,
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              '&:hover': {
                bgcolor: 'var(--hover-bg)',
                color: 'var(--primary-color)'
              }
            }}
          >
            <FitScreenIcon sx={{ fontSize: 18 }} />
          </Box>
        </Panel>
      </ReactFlow>

      {/* 加载遮罩 */}
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
            zIndex: 10
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              bgcolor: 'var(--primary-color)',
              animation: 'pulse 1.4s infinite ease-in-out'
            }} />
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              bgcolor: 'var(--primary-color)',
              animation: 'pulse 1.4s infinite ease-in-out 0.2s'
            }} />
            <Box sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%', 
              bgcolor: 'var(--primary-color)',
              animation: 'pulse 1.4s infinite ease-in-out 0.4s'
            }} />
          </Box>
        </Box>
      )}
    </Box>
  );
}

// 外层 Provider 包装
export default function MindMap(props) {
  return (
    <ReactFlowProvider>
      <MindMapInner {...props} />
    </ReactFlowProvider>
  );
}
