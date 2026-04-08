/**
 * ConversationTreeManager 对话树管理器
 * 负责对话树结构操作：添加节点、创建分支、遍历、节点编辑/复制/删除
 * 从 TopicManager 抽离，遵循单一职责原则
 */
const logger = require('../utils/logger');

class ConversationTreeManager {
  constructor(topicManager) {
    this.topicManager = topicManager;
  }

  /**
   * 获取话题的对话树
   * @param {string} topicId - 话题ID
   * @returns {Object} - 对话树
   */
  getConversationTree(topicId) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      return null;
    }
    return topic.conversationTree;
  }

  /**
   * 判断话题是否有对话节点
   * @param {string} topicId - 话题ID
   * @returns {boolean} - 是否有节点
   */
  hasConversationNodes(topicId) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) return false;
    return topic.conversationTree !== null;
  }

  /**
   * 根据ID查找节点
   * @param {Object} node - 起始节点
   * @param {string} id - 节点ID
   * @returns {Object|null} - 找到的节点或null
   */
  findNodeById(node, id) {
    if (!node) return null;
    if (node.id === id) {
      return node;
    }
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  /**
   * 获取当前分支
   * @param {string} topicId - 话题ID
   * @returns {string} - 当前分支ID
   */
  getCurrentBranch(topicId) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      return null;
    }
    // 确保 currentNode 已初始化
    if (!topic.currentNode) {
      topic.currentNode = topic.conversationTree;
    }
    return topic.currentNode.id;
  }

  /**
   * 获取对话路径（从 root 到当前节点的扁平消息列表）
   * @param {string} topicId - 话题ID
   * @returns {Array} - 扁平消息数组 [{type:'user'|'ai', content, nodeId}]
   */
  getConversationMessages(topicId) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic || !topic.currentNode) return [];

    const path = [];
    const current = topic.currentNode;

    // 从 currentNode 回溯到 root
    const tracePath = (node) => {
      if (!node || node.id === 'root') return;
      const parent = node.parentId ? this.findNodeById(topic.conversationTree, node.parentId) : null;
      if (parent) {
        tracePath(parent);
      }
      if (node.message) {
        path.push({ type: 'user', content: node.message, nodeId: node.id });
      }
      if (node.response) {
        path.push({ type: 'ai', content: node.response, nodeId: node.id });
      }
    };

    tracePath(current);
    return path;
  }

  /**
   * 获取对话历史（用于AI上下文）
   * @param {string} topicId - 话题ID
   * @returns {Array} - messages 数组 [{role:'user'|'assistant', content}]
   */
  getConversationHistory(topicId) {
    const messages = this.getConversationMessages(topicId);
    return messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }

  /**
   * 创建新分支
   * @param {string} topicId - 话题ID
   * @returns {string} - 创建分支的结果信息
   */
  createBranch(topicId) {
    try {
      const topic = this.topicManager.getTopic(topicId);
      if (!topic) {
        return '话题不存在';
      }

      // 确保 currentNode 已初始化
      if (!topic.currentNode) {
        topic.currentNode = topic.conversationTree;
      }

      const newBranch = {
        id: `branch-${Date.now()}`,
        parentId: topic.currentNode.parentId,
        message: topic.currentNode.message,
        response: topic.currentNode.response,
        children: []
      };

      if (topic.currentNode.parentId) {
        const parentNode = this.findNodeById(topic.conversationTree, topic.currentNode.parentId);
        if (parentNode) {
          parentNode.children.push(newBranch);
          topic.currentNode = newBranch;
          this.topicManager.saveTopics();
          logger.info('ConversationTreeManager', '创建新分支', { branchId: newBranch.id, topic: topic.name });
          return `已创建新分支: ${newBranch.id}`;
        }
      }
      logger.warn('ConversationTreeManager', '无法创建分支', { topic: topic.name, currentNodeId: topic.currentNode.id });
      return '无法创建分支';
    } catch (error) {
      logger.error('ConversationTreeManager', '创建分支失败:', { error: error.message });
      return '创建分支失败';
    }
  }

  /**
   * 从指定节点创建分支
   * @param {string} topicId - 话题ID
   * @param {string} fromNodeId - 从哪个节点创建分支
   * @returns {string} - 创建分支的结果信息
   */
  createBranchFromNode(topicId, fromNodeId) {
    try {
      const topic = this.topicManager.getTopic(topicId);
      if (!topic) return '话题不存在';

      const fromNode = this.findNodeById(topic.conversationTree, fromNodeId);
      if (!fromNode) return '节点不存在';

      const newBranch = {
        id: `branch-${Date.now()}`,
        parentId: fromNode.id,
        message: '',
        response: '',
        children: []
      };

      fromNode.children.push(newBranch);
      topic.currentNode = newBranch;
      this.topicManager.saveTopics();
      logger.info('ConversationTreeManager', '从指定节点创建分支', { branchId: newBranch.id, fromNodeId, topic: topic.name });
      return `已创建新分支: ${newBranch.id}`;
    } catch (error) {
      logger.error('ConversationTreeManager', '从指定节点创建分支失败:', { error: error.message });
      return '创建分支失败';
    }
  }

  /**
   * 切换到分支
   * @param {string} topicId - 话题ID
   * @param {string} branchId - 分支ID
   * @returns {string} - 切换分支的结果信息
   */
  switchToBranch(topicId, branchId) {
    try {
      const topic = this.topicManager.getTopic(topicId);
      if (!topic) {
        return '话题不存在';
      }

      const targetNode = this.findNodeById(topic.conversationTree, branchId);
      if (targetNode) {
        topic.currentNode = targetNode;
        this.topicManager.saveTopics();
        logger.info('ConversationTreeManager', '切换到分支', { branchId, topic: topic.name });
        return `已切换到分支: ${branchId}`;
      }
      logger.warn('ConversationTreeManager', '分支不存在', { branchId, topic: topic.name });
      return '分支不存在';
    } catch (error) {
      logger.error('ConversationTreeManager', '切换分支失败:', { error: error.message, branchId });
      return '切换分支失败';
    }
  }

  /**
   * 获取指定节点的所有子分支
   * @param {string} topicId - 话题ID
   * @param {string} nodeId - 节点ID
   * @returns {Array} - 子分支列表
   */
  getNodeBranches(topicId, nodeId) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) return [];
    const node = this.findNodeById(topic.conversationTree, nodeId);
    if (!node) return [];
    return node.children.map(child => ({
      id: child.id,
      message: child.message ? child.message.substring(0, 50) + (child.message.length > 50 ? '...' : '') : '(空分支)',
      isCurrentBranch: topic.currentNode && this.isAncestor(topic.currentNode, child.id, topic.conversationTree)
    }));
  }

  /**
   * 判断 targetId 是否是 nodeId 的后代
   */
  isAncestor(currentNode, targetId, tree) {
    if (currentNode.id === targetId) return true;
    for (const child of currentNode.children) {
      if (this.isAncestor(child, targetId, tree)) return true;
    }
    return false;
  }

  /**
   * 添加对话节点
   * @param {string} topicId - 话题ID
   * @param {string} message - 用户消息
   * @param {string} response - AI回答
   * @param {Object} metadata - 节点元数据（如 status: 'loading' | 'completed' | 'error'）
   * @param {string} parentNodeId - 可选，指定父节点ID（不传则使用 currentNode）
   * @returns {Object} - 新创建的节点
   */
  addConversationNode(topicId, message, response, metadata = {}, parentNodeId = null) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      logger.error('ConversationTreeManager', '话题不存在', { topicId });
      return null;
    }

    // 如果是第一个节点（conversationTree为空），创建根节点
    if (!topic.conversationTree) {
      const rootNode = {
        id: `node-${Date.now()}`,
        parentId: null,
        message: message,
        response: response,
        children: [],
        ...metadata
      };
      topic.conversationTree = rootNode;
      topic.currentNode = rootNode;
      this.topicManager.saveTopics();
      logger.info('ConversationTreeManager', '创建首个对话节点', { 
        topic: topic.name, 
        nodeId: rootNode.id,
        status: metadata.status || 'completed' 
      });
      return rootNode;
    }

    // 确定父节点
    let parentNode = null;
    if (parentNodeId) {
      parentNode = this.findNodeById(topic.conversationTree, parentNodeId);
      if (!parentNode) {
        logger.warn('ConversationTreeManager', '指定的父节点不存在，使用 currentNode', { parentNodeId });
      }
    }
    
    // 如果没有指定父节点或找不到，使用 currentNode
    if (!parentNode) {
      // 确保 currentNode 已初始化
      if (!topic.currentNode) {
        topic.currentNode = topic.conversationTree;
        logger.info('ConversationTreeManager', '初始化currentNode', { topicId, rootId: topic.conversationTree.id });
      }
      parentNode = topic.currentNode;
    }

    const newNode = {
      id: `node-${Date.now()}`,
      parentId: parentNode.id,
      message: message,
      response: response,
      children: [],
      ...metadata
    };

    parentNode.children.push(newNode);
    topic.currentNode = newNode;
    this.topicManager.saveTopics();
    logger.info('ConversationTreeManager', '添加对话节点', { 
      topic: topic.name, 
      nodeId: newNode.id, 
      parentId: newNode.parentId,
      childrenCount: topic.conversationTree.children.length,
      status: metadata.status || 'completed',
      branchType: metadata.branchType || null
    });
    return newNode;
  }

  /**
   * 更新节点的AI回答
   * @param {string} topicId - 话题ID
   * @param {string} nodeId - 节点ID
   * @param {string} response - AI回答
   * @param {Object} metadata - 节点元数据（如 status: 'completed' | 'error'）
   * @returns {Object|null} - 更新后的节点或null
   */
  updateNodeResponse(topicId, nodeId, response, metadata = {}) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      return null;
    }

    const node = this.findNodeById(topic.conversationTree, nodeId);
    if (!node) {
      return null;
    }

    node.response = response;
    Object.assign(node, metadata);
    this.topicManager.saveTopics();
    logger.info('ConversationTreeManager', '更新节点回答', { topic: topic.name, nodeId, status: metadata.status || 'completed' });
    return node;
  }

  /**
   * 编辑节点内容
   * @param {string} topicId - 话题ID
   * @param {string} nodeId - 节点ID
   * @param {string} message - 新的问题内容
   * @param {string} response - 新的回答内容
   * @returns {Object|null} - 更新后的节点或null
   */
  editNode(topicId, nodeId, message, response) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      logger.error('ConversationTreeManager', '话题不存在', { topicId });
      return null;
    }

    const node = this.findNodeById(topic.conversationTree, nodeId);
    if (!node) {
      logger.error('ConversationTreeManager', '节点不存在', { nodeId });
      return null;
    }

    if (message !== undefined) node.message = message;
    if (response !== undefined) node.response = response;
    this.topicManager.saveTopics();
    logger.info('ConversationTreeManager', '编辑节点', { topic: topic.name, nodeId });
    return node;
  }

  /**
   * 复制节点及其子树
   * @param {string} topicId - 话题ID
   * @param {string} nodeId - 要复制的节点ID
   * @param {string} targetParentId - 目标父节点ID（可选，默认为原节点的父节点）
   * @returns {Object|null} - 新创建的节点或null
   */
  copyNode(topicId, nodeId, targetParentId = null) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      logger.error('ConversationTreeManager', '话题不存在', { topicId });
      return null;
    }

    const sourceNode = this.findNodeById(topic.conversationTree, nodeId);
    if (!sourceNode) {
      logger.error('ConversationTreeManager', '源节点不存在', { nodeId });
      return null;
    }

    // 确定目标父节点
    let parentNode = null;
    if (targetParentId) {
      parentNode = this.findNodeById(topic.conversationTree, targetParentId);
    }
    // 如果没有指定目标父节点，使用原节点的父节点
    if (!parentNode) {
      parentNode = sourceNode.parentId 
        ? this.findNodeById(topic.conversationTree, sourceNode.parentId)
        : null;
    }

    // 递归复制节点
    const copyNodeRecursive = (node, newParentId) => {
      const newNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        parentId: newParentId,
        message: node.message,
        response: node.response,
        children: [],
        branchType: node.branchType,
        quoteNodeIds: node.quoteNodeIds ? [...node.quoteNodeIds] : [],
        status: node.status || 'completed'
      };

      // 递归复制子节点
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          const copiedChild = copyNodeRecursive(child, newNode.id);
          newNode.children.push(copiedChild);
        });
      }

      return newNode;
    };

    const newNode = copyNodeRecursive(sourceNode, parentNode ? parentNode.id : null);

    // 将新节点添加到父节点
    if (parentNode) {
      parentNode.children.push(newNode);
    } else {
      // 如果没有父节点，作为新的根节点（这种情况较少见）
      logger.warn('ConversationTreeManager', '复制节点没有父节点，无法添加到树中');
      return null;
    }

    this.topicManager.saveTopics();
    logger.info('ConversationTreeManager', '复制节点', { 
      topic: topic.name, 
      sourceNodeId: nodeId, 
      newNodeId: newNode.id 
    });
    return newNode;
  }

  /**
   * 删除节点及其子树
   * @param {string} topicId - 话题ID
   * @param {string} nodeId - 要删除的节点ID
   * @returns {boolean} - 是否删除成功
   */
  deleteNode(topicId, nodeId) {
    const topic = this.topicManager.getTopic(topicId);
    if (!topic) {
      logger.error('ConversationTreeManager', '话题不存在', { topicId });
      return false;
    }

    // 不能删除根节点
    if (topic.conversationTree && topic.conversationTree.id === nodeId) {
      logger.error('ConversationTreeManager', '不能删除根节点');
      return false;
    }

    const node = this.findNodeById(topic.conversationTree, nodeId);
    if (!node) {
      logger.error('ConversationTreeManager', '节点不存在', { nodeId });
      return false;
    }

    // 找到父节点并从其children中移除
    const parentNode = node.parentId 
      ? this.findNodeById(topic.conversationTree, node.parentId)
      : null;
    
    if (parentNode && parentNode.children) {
      const index = parentNode.children.findIndex(child => child.id === nodeId);
      if (index !== -1) {
        parentNode.children.splice(index, 1);
        
        // 如果当前节点是被删除的节点，切换到父节点
        if (topic.currentNode && topic.currentNode.id === nodeId) {
          topic.currentNode = parentNode;
        }
        
        this.topicManager.saveTopics();
        logger.info('ConversationTreeManager', '删除节点', { topic: topic.name, nodeId });
        return true;
      }
    }

    logger.error('ConversationTreeManager', '无法找到父节点或从父节点中移除失败', { nodeId });
    return false;
  }
}

module.exports = ConversationTreeManager;
