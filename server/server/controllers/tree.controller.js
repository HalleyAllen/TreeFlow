/**
 * 树形结构控制器
 * 处理对话树的查询和转换
 * 重构后：直接使用 ConversationTreeManager
 */
const logger = require('../../core/utils/logger');

class TreeController {
  constructor(agent) {
    this.agent = agent;
    // 直接使用 ConversationTreeManager
    this.treeManager = agent.conversationTreeManager;
    this.topicManager = agent.topicManager;
  }

  /**
   * 获取话题的完整对话树
   * GET /api/tree/:topicId
   */
  getTree = (req, res) => {
    try {
      const { topicId } = req.params;
      const topic = this.topicManager.getTopic(topicId);
      
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      // 如果没有对话节点，返回空树
      if (!topic.conversationTree) {
        logger.info('TreeController', '话题暂无对话节点', { topicId, topicName: topic.name });
        return res.json({
          success: true,
          data: {
            topicId: topic.id,
            topicName: topic.name,
            tree: null,
            currentNodeId: null
          }
        });
      }

      const tree = this.buildTreeNode(topic.conversationTree, topic);
      
      logger.info('TreeController', '获取对话树', { 
        topicId, 
        topicName: topic.name,
        rootChildrenCount: tree.children.length,
        currentNodeId: topic.currentNode?.id 
      });
      
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

      const topic = this.topicManager.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      const node = this.treeManager.findNodeById(topic.conversationTree, nodeId);
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
      branchType: node.branchType || null,
      quoteNodeIds: node.quoteNodeIds || [],
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
    
    const parent = this.treeManager.findNodeById(tree, targetNode.parentId);
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
      current = this.treeManager.findNodeById(tree, current.parentId);
    }
    return depth;
  }

  /**
   * 编辑节点内容
   * PUT /api/tree/node/:nodeId
   */
  editNode = (req, res) => {
    try {
      const { nodeId } = req.params;
      const { topicId, question, answer } = req.body;

      if (!topicId) {
        return res.status(400).json({ success: false, error: '缺少topicId参数' });
      }

      const topic = this.topicManager.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      const node = this.treeManager.editNode(topicId, nodeId, question, answer);
      if (!node) {
        return res.status(404).json({ success: false, error: '节点不存在或编辑失败' });
      }

      logger.info('TreeController', '编辑节点成功', { nodeId, topicId });
      res.json({
        success: true,
        data: this.serializeNode(node, topic)
      });
    } catch (error) {
      logger.error('TreeController', '编辑节点失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 复制节点
   * POST /api/tree/node/:nodeId/copy
   */
  copyNode = (req, res) => {
    try {
      const { nodeId } = req.params;
      const { topicId, targetParentId } = req.body;

      if (!topicId) {
        return res.status(400).json({ success: false, error: '缺少topicId参数' });
      }

      const topic = this.topicManager.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      const newNode = this.treeManager.copyNode(topicId, nodeId, targetParentId);
      if (!newNode) {
        return res.status(400).json({ success: false, error: '复制节点失败' });
      }

      logger.info('TreeController', '复制节点成功', { sourceNodeId: nodeId, newNodeId: newNode.id, topicId });
      res.json({
        success: true,
        data: this.serializeNode(newNode, topic)
      });
    } catch (error) {
      logger.error('TreeController', '复制节点失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * 删除节点
   * DELETE /api/tree/node/:nodeId
   */
  deleteNode = (req, res) => {
    try {
      const { nodeId } = req.params;
      const { topicId } = req.query;

      if (!topicId) {
        return res.status(400).json({ success: false, error: '缺少topicId参数' });
      }

      const topic = this.topicManager.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ success: false, error: '话题不存在' });
      }

      const success = this.treeManager.deleteNode(topicId, nodeId);
      if (!success) {
        return res.status(400).json({ success: false, error: '删除节点失败，可能是根节点或节点不存在' });
      }

      logger.info('TreeController', '删除节点成功', { nodeId, topicId });
      res.json({
        success: true,
        message: '节点已删除'
      });
    } catch (error) {
      logger.error('TreeController', '删除节点失败:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = TreeController;
