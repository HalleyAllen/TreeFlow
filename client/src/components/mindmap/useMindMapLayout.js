/**
 * 脑图布局算法 Hook
 * 实现放射状树形布局计算
 */
import { useMemo } from 'react';
import { hierarchy, tree, cluster } from 'd3-hierarchy';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const VERTICAL_SPACING = 200;
const HORIZONTAL_SPACING = 320;
const RADIAL_RADIUS = 250;

/**
 * 计算放射状布局
 * 根节点在中心，子节点按层级向外辐射
 */
function calculateRadialLayout(rootNode, options = {}) {
  const { 
    levelDistance = RADIAL_RADIUS, 
    nodeSeparation = 1.5 
  } = options;

  // 转换为 D3 hierarchy
  const root = hierarchy(rootNode, d => d.children);
  
  // 计算放射状布局
  const radius = levelDistance;
  
  // 按层级分配角度
  const nodes = root.descendants();
  const maxDepth = root.height;
  
  // 计算每个节点的位置
  const positionedNodes = nodes.map(node => {
    const depth = node.depth;
    const siblings = node.parent ? node.parent.children : [node];
    const siblingIndex = siblings.indexOf(node);
    const siblingsCount = siblings.length;
    
    // 计算角度
    let angle;
    if (depth === 0) {
      angle = -Math.PI / 2; // 根节点向上
    } else {
      // 父节点的角度范围
      const parentAngle = node.parent.data.angle || -Math.PI / 2;
      const angleRange = Math.PI / Math.max(1, depth * 0.8); // 角度范围随深度减小
      const angleStep = angleRange / Math.max(1, siblingsCount - 1);
      const startAngle = parentAngle - angleRange / 2;
      angle = startAngle + angleStep * siblingIndex;
    }
    
    // 保存角度供子节点使用
    node.data.angle = angle;
    
    // 计算坐标
    const r = depth * levelDistance;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    
    return {
      id: node.data.id,
      position: { x, y },
      data: node.data,
      depth,
      angle
    };
  });

  // 生成边
  const edges = root.links().map(link => ({
    id: `${link.source.data.id}-${link.target.data.id}`,
    source: link.source.data.id,
    target: link.target.data.id,
    type: 'smoothstep'
  }));

  return { nodes: positionedNodes, edges };
}

/**
 * 计算垂直树形布局
 * 传统的从上到下树形布局
 */
function calculateVerticalLayout(rootNode, options = {}) {
  const { 
    nodeWidth = NODE_WIDTH, 
    nodeHeight = NODE_HEIGHT,
    levelSpacing = VERTICAL_SPACING,
    siblingSpacing = HORIZONTAL_SPACING 
  } = options;

  const root = hierarchy(rootNode, d => d.children);
  
  // 使用 D3 tree 布局
  const treeLayout = tree()
    .nodeSize([siblingSpacing, levelSpacing])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

  treeLayout(root);

  const nodes = root.descendants().map(node => ({
    id: node.data.id,
    position: { x: node.x, y: node.y },
    data: node.data,
    depth: node.depth
  }));

  const edges = root.links().map(link => ({
    id: `${link.source.data.id}-${link.target.data.id}`,
    source: link.source.data.id,
    target: link.target.data.id,
    type: 'smoothstep'
  }));

  return { nodes, edges };
}

/**
 * 计算水平树形布局
 * 从左到右树形布局
 */
function calculateHorizontalLayout(rootNode, options = {}) {
  const { 
    levelSpacing = HORIZONTAL_SPACING,
    siblingSpacing = VERTICAL_SPACING 
  } = options;

  const root = hierarchy(rootNode, d => d.children);
  
  const treeLayout = tree()
    .nodeSize([siblingSpacing, levelSpacing])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

  treeLayout(root);

  const nodes = root.descendants().map(node => ({
    id: node.data.id,
    position: { x: node.y, y: node.x }, // 交换 x/y 实现水平布局
    data: node.data,
    depth: node.depth
  }));

  const edges = root.links().map(link => ({
    id: `${link.source.data.id}-${link.target.data.id}`,
    source: link.source.data.id,
    target: link.target.data.id,
    type: 'smoothstep'
  }));

  return { nodes, edges };
}

/**
 * 主 Hook
 */
export function useMindMapLayout(treeData, layoutType = 'radial') {
  return useMemo(() => {
    if (!treeData) return { nodes: [], edges: [] };

    switch (layoutType) {
      case 'radial':
        return calculateRadialLayout(treeData);
      case 'vertical':
        return calculateVerticalLayout(treeData);
      case 'horizontal':
        return calculateHorizontalLayout(treeData);
      default:
        return calculateRadialLayout(treeData);
    }
  }, [treeData, layoutType]);
}

export default useMindMapLayout;
