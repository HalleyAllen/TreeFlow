/**
 * 脑图布局算法 Hook
 * 实现多种树形布局计算
 */
import { useMemo } from 'react';
import { hierarchy, tree, cluster } from 'd3-hierarchy';

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const VERTICAL_SPACING = 180;  // 垂直间距减小
const HORIZONTAL_SPACING = 320;
const RADIAL_RADIUS = 250;
const BRANCH_VERTICAL_SPACING = 160; // 分支垂直间距

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
 * 计算文档流式混合布局
 * 主流程垂直向下（文档阅读顺序）
 * 分支节点从父节点右侧水平展开
 * 
 * 结构示意：
 *    [根节点]
 *       |
 *    [节点A] --→-- [分支A1]
 *       |            |
 *       |         [分支A1-1]
 *       |
 *    [节点B] --→-- [分支B1]
 *       |
 *    [节点C]
 */
function calculateDocumentLayout(rootNode, options = {}) {
  const { 
    nodeWidth = NODE_WIDTH, 
    nodeHeight = NODE_HEIGHT,
    levelSpacing = HORIZONTAL_SPACING,  // 子节点水平间距
    siblingSpacing = VERTICAL_SPACING,  // 主流程垂直间距
    branchSpacing = HORIZONTAL_SPACING * 0.8  // 分支水平间距
  } = options;

  const nodes = [];
  const edges = [];
  
  /**
   * 递归计算节点位置
   * @param {Object} node - 当前节点数据
   * @param {number} x - 当前节点X坐标
   * @param {number} y - 当前节点Y坐标
   * @param {number} depth - 层级深度
   * @param {boolean} isBranch - 是否为分支节点（非主流程）
   * @returns {number} - 返回该子树占用的总高度
   */
  function layoutNode(node, x, y, depth = 0, isBranch = false) {
    const nodeId = node.id;
    
    // 记录节点
    nodes.push({
      id: nodeId,
      position: { x, y },
      data: node,
      depth,
      isBranch
    });
    
    let subtreeHeight = 0;
    
    // 处理子节点
    if (node.children && node.children.length > 0) {
      // 分离主流程子节点（第一个继续主线）和分支子节点
      const mainChild = node.children[0]; // 第一个子节点走主流程（垂直向下）
      const branchChildren = node.children.slice(1); // 其他子节点作为分支（向右展开）
      
      // 主流程子节点继续垂直向下
      if (mainChild) {
        const mainChildHeight = layoutNode(
          mainChild,
          x,  // 主流程保持相同X坐标
          y + siblingSpacing,  // 垂直向下
          depth + 1,
          false
        );
        
        // 引用节点的连线用橙色虚线标识
        const isQuote = mainChild.branchType === 'quote' || mainChild.isQuoteBranch;
        edges.push({
          id: `${nodeId}-${mainChild.id}`,
          source: nodeId,
          target: mainChild.id,
          type: 'smoothstep',
          ...(isQuote && {
            style: { stroke: 'var(--warning-color, #f59e0b)', strokeWidth: 2, strokeDasharray: '5,5' }
          })
        });
        
        subtreeHeight = mainChildHeight + siblingSpacing;
      }
      
      // 其他子节点作为分支：从当前节点向右水平展开
      branchChildren.forEach((child, index) => {
        // 分支节点在父节点右侧，垂直方向错开
        const branchX = x + branchSpacing;
        const branchY = y + (index + 1) * BRANCH_VERTICAL_SPACING;
        
        layoutNode(child, branchX, branchY, depth + 1, true);
        
        // 引用分支也用橙色虚线标识
        const isQuote = child.branchType === 'quote' || child.isQuoteBranch;
        edges.push({
          id: `${nodeId}-${child.id}`,
          source: nodeId,
          target: child.id,
          type: 'smoothstep',
          ...(isQuote && {
            style: { stroke: 'var(--warning-color, #f59e0b)', strokeWidth: 2, strokeDasharray: '5,5' }
          })
        });
        
        // 更新子树高度
        const branchBottom = branchY + BRANCH_VERTICAL_SPACING;
        if (branchBottom > subtreeHeight) {
          subtreeHeight = branchBottom;
        }
      });
    } else {
      // 叶子节点
      subtreeHeight = siblingSpacing;
    }
    
    return subtreeHeight;
  }
  
  // 从根节点开始布局
  layoutNode(rootNode, 0, 0, 0, false);
  
  return { nodes, edges };
}

/**
 * 主 Hook
 */
export function useMindMapLayout(treeData, layoutType = 'document') {
  return useMemo(() => {
    // 如果没有树数据，返回空节点和边
    if (!treeData) {
      console.log('useMindMapLayout: 无树数据，返回空布局');
      return { nodes: [], edges: [] };
    }

    switch (layoutType) {
      case 'radial':
        return calculateRadialLayout(treeData);
      case 'vertical':
        return calculateVerticalLayout(treeData);
      case 'horizontal':
        return calculateHorizontalLayout(treeData);
      case 'document':
        return calculateDocumentLayout(treeData);
      default:
        return calculateRadialLayout(treeData);
    }
  }, [treeData, layoutType]);
}

export default useMindMapLayout;
