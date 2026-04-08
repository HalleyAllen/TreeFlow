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
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box } from '@mui/material';

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
  topicId,
  onNodeSelect,
  onBranchFromNode,
  onQuoteText,
  onEditNode,
  onCopyNode,
  onDeleteNode,
  loading,
  onTreeChange
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const reactFlowInstance = useRef(null);

  // 调试日志
  console.log('MindMap treeData:', treeData ? {
    id: treeData.id,
    childrenCount: treeData.children?.length,
    question: treeData.question?.substring(0, 30)
  } : 'null');

  // 使用固定文档布局
  const { nodes: layoutNodes, edges: layoutEdges } = useMindMapLayout(treeData, 'document');

  console.log('MindMap layout result:', {
    nodesCount: layoutNodes.length,
    edgesCount: layoutEdges.length
  });

  // 处理节点编辑
  const handleEditNode = useCallback(async (nodeId, question, answer) => {
    const result = await onEditNode?.(nodeId, question, answer);
    if (result?.success) {
      onTreeChange?.();
    }
  }, [onEditNode, onTreeChange]);

  // 处理节点复制
  const handleCopyNode = useCallback(async (nodeId) => {
    const result = await onCopyNode?.(nodeId);
    if (result?.success) {
      onTreeChange?.();
    }
  }, [onCopyNode, onTreeChange]);

  // 处理节点删除
  const handleDeleteNode = useCallback(async (nodeId) => {
    const result = await onDeleteNode?.(nodeId);
    if (result?.success) {
      onTreeChange?.();
    }
  }, [onDeleteNode, onTreeChange]);

  // 转换为 ReactFlow 格式
  const initialNodes = layoutNodes.map(node => ({
    ...defaultNodeOptions,
    id: node.id,
    position: node.position,
    data: {
      ...node.data,
      id: node.id,
      topicId,
      onBranchClick: onBranchFromNode,
      onQuoteText: onQuoteText,
      onEditNode: handleEditNode,
      onCopyNode: handleCopyNode,
      onDeleteNode: handleDeleteNode,
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
      stroke: edge.style?.stroke || 'var(--primary-color)',
      strokeWidth: edge.style?.strokeWidth || 2,
      strokeDasharray: edge.style?.strokeDasharray,
      opacity: 0.6
    }
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // 数据更新时重新设置节点
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [treeData, selectedNode]);

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
        onNodeClick={(_, node) => {
          // 阻止节点点击的默认选择行为
          setSelectedNode(node.id);
        }}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        selectNodesOnDrag={false}
        selectionOnDrag={false}
        panOnDrag={true}
        panOnScroll={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        deleteKeyCode={null}
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
        className="mindmap-flow"
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
          showFitView={true}
          showInteractive={false}
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
      </ReactFlow>

      {/* 加载指示器 - 只在初始加载时显示 */}
      {loading && !treeData && (
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
