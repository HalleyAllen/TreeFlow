/**
 * 树形结构控制器
 * 处理对话树的查询和转换
 */
const logger = require('../../core/utils/logger');

class TreeController {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * 获取话题的完整对话树
   * GET /api/tree/:topicId
   */
  getTree = (req, res) => {
    try {
      const { topicId } = req.params;
      const topic = this.agent.topicManager.getTopic(topicId);
      
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      const tree = this.buildTreeNode(topic.conversationTree, topic);
      
      res.json({
        success: true,
        data: {
          topicId: topic.id,
          topicName: topic.name,
          tree,
          currentNodeId: topic.currentNode?.id || null
        }
      });
    } catch (error) {
      logger.error('TreeController', '获取对话树失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 获取指定节点的详细信息
   * GET /api/tree/node/:nodeId
   */
  getNodeDetail = (req, res) => {
    try {
      const { nodeId } = req.params;
      const { topicId } = req.query;
      
      if (!topicId) {
        return res.status(400).json({ success: false, error: '缺少topicId参数' });
      }

      const topic = this.agent.topicManager.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      const node = this.agent.topicManager.findNodeById(topic.conversationTree, nodeId);
      if (!node) {
        return res.status(404).json({ success: false, error: '节点不存在' });
      }

      res.json({
        success: true,
        data: this.serializeNode(node, topic)
      });
    } catch (error) {
      logger.error('TreeController', '获取节点详情失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 递归构建树节点
   * @private
   */
  buildTreeNode(node, topic) {
    return {
      id: node.id,
      parentId: node.parentId,
      question: node.message || '',
      answer: node.response || '',
      answerSummary: this.generateSummary(node.response),
      status: node.status || 'completed',
      error: node.error || null,
      children: node.children.map(child => this.buildTreeNode(child, topic)),
      childrenCount: node.children.length,
      isCurrentPath: topic.currentNode && this.isInPath(topic.currentNode, node, topic.conversationTree),
      depth: this.calculateDepth(node, topic.conversationTree)
    };
  }

  /**
   * 序列化单个节点
   * @private
   */
  serializeNode(node, topic) {
    return {
      id: node.id,
      parentId: node.parentId,
      question: node.message || '',
      answer: node.response || '',
      answerSummary: this.generateSummary(node.response),
      status: node.status || 'completed',
      error: node.error || null,
      childrenIds: node.children.map(c => c.id),
      childrenCount: node.children.length,
      isCurrentPath: topic.currentNode && this.isInPath(topic.currentNode, node, topic.conversationTree)
    };
  }

  /**
   * 生成回答摘要
   * @private
   */
  generateSummary(response) {
    if (!response) return '';
    // 提取第一行或前50个字符
    const firstLine = response.split('\n')[0].trim();
    if (firstLine.length <= 50) return firstLine;
    return firstLine.substring(0, 50) + '...';
  }

  /**
   * 判断节点是否在当前路径中
   * @private
   */
  isInPath(currentNode, targetNode, tree) {
    if (currentNode.id === targetNode.id) return true;
    if (!targetNode.parentId) return false;
    
    const parent = this.findNodeById(tree, targetNode.parentId);
    if (!parent) return false;
    
    return this.isInPath(currentNode, parent, tree);
  }

  /**
   * 计算节点深度
   * @private
   */
  calculateDepth(node, tree) {
    let depth = 0;
    let current = node;
    while (current.parentId) {
      depth++;
      current = this.findNodeById(tree, current.parentId);
    }
    return depth;
  }

  /**
   * 根据ID查找节点
   * @private
   */
  findNodeById(tree, nodeId) {
    if (tree.id === nodeId) return tree;
    for (const child of tree.children) {
      const found = this.findNodeById(child, nodeId);
      if (found) return found;
    }
    return null;
  }
}

module.exports = TreeController;
