/**
 * 话题管理模块
 * 处理话题的创建、切换、删除和保存
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class TopicManager {
  constructor(topicsFile) {
    this.topicsFile = topicsFile;
    this.topics = {
      'default': {
        id: 'default',
        name: '默认话题',
        conversationTree: {
          id: 'root',
          parentId: null,
          message: '',
          response: '',
          children: []
        },
        currentNode: null
      }
    };
  }

  /**
   * 加载话题数据
   * 从topics.json文件加载话题数据，如果文件不存在则使用默认话题
   */
  loadTopics() {
    try {
      if (fs.existsSync(this.topicsFile)) {
        const data = fs.readFileSync(this.topicsFile, 'utf8');
        const loadedTopics = JSON.parse(data);
        // 合并加载的话题，保留默认话题
        this.topics = { ...this.topics, ...loadedTopics };
        // 初始化每个话题的currentNode
        Object.values(this.topics).forEach(topic => {
          if (!topic.currentNode) {
            topic.currentNode = topic.conversationTree;
          }
        });
        logger.info('TopicManager', '加载话题成功', { topicCount: Object.keys(this.topics).length });
      } else {
        logger.info('TopicManager', '话题文件不存在，使用默认话题');
      }
    } catch (error) {
      logger.error('TopicManager', '加载话题失败:', { error: error.message });
    }
  }

  /**
   * 保存话题数据
   * 将非默认话题保存到topics.json文件
   */
  saveTopics() {
    try {
      // 只保存非默认话题
      const topicsToSave = { ...this.topics };
      delete topicsToSave.default;
      fs.writeFileSync(this.topicsFile, JSON.stringify(topicsToSave, null, 2));
      logger.info('TopicManager', '保存话题成功', { topicCount: Object.keys(topicsToSave).length });
    } catch (error) {
      logger.error('TopicManager', '保存话题失败:', { error: error.message });
    }
  }

  /**
   * 获取话题列表
   * @returns {Array} - 话题列表
   */
  getTopics() {
    return Object.values(this.topics);
  }

  /**
   * 获取话题
   * @param {string} topicId - 话题ID
   * @returns {Object|null} - 话题对象或null
   */
  getTopic(topicId) {
    return this.topics[topicId] || null;
  }

  /**
   * 创建话题
   * @param {string} name - 话题名称
   * @returns {string} - 创建话题的结果信息
   */
  createTopic(name) {
    try {
      const topicId = `topic-${Date.now()}`;
      this.topics[topicId] = {
        id: topicId,
        name: name,
        conversationTree: {
          id: 'root',
          parentId: null,
          message: '',
          response: '',
          children: []
        },
        currentNode: null
      };
      this.topics[topicId].currentNode = this.topics[topicId].conversationTree;
      this.saveTopics();
      logger.info('TopicManager', '创建话题', { topicId, name });
      return `已创建话题: ${name} (ID: ${topicId})`;
    } catch (error) {
      logger.error('TopicManager', '创建话题失败:', { error: error.message, name });
      return '创建话题失败';
    }
  }

  /**
   * 切换话题
   * @param {string} topicId - 话题ID
   * @returns {string} - 切换话题的结果信息
   */
  switchTopic(topicId) {
    try {
      if (this.topics[topicId]) {
        logger.info('TopicManager', '切换话题', { topicId, topicName: this.topics[topicId].name });
        return `已切换到话题: ${this.topics[topicId].name}`;
      }
      logger.warn('TopicManager', '话题不存在', { topicId });
      return '话题不存在';
    } catch (error) {
      logger.error('TopicManager', '切换话题失败:', { error: error.message, topicId });
      return '切换话题失败';
    }
  }

  /**
   * 删除话题
   * @param {string} topicId - 话题ID
   * @returns {string} - 删除话题的结果信息
   */
  deleteTopic(topicId) {
    try {
      if (topicId === 'default') {
        logger.warn('TopicManager', '默认话题无法删除');
        return '默认话题无法删除';
      }
      if (this.topics[topicId]) {
        const topicName = this.topics[topicId].name;
        delete this.topics[topicId];
        this.saveTopics();
        logger.info('TopicManager', '删除话题', { topicId, topicName });
        return `已删除话题: ${topicId}`;
      }
      logger.warn('TopicManager', '话题不存在', { topicId });
      return '话题不存在';
    } catch (error) {
      logger.error('TopicManager', '删除话题失败:', { error: error.message, topicId });
      return '删除话题失败';
    }
  }

  /**
   * 创建新分支
   * @param {string} topicId - 话题ID
   * @returns {string} - 创建分支的结果信息
   */
  createBranch(topicId) {
    try {
      const topic = this.topics[topicId];
      if (!topic) {
        return '话题不存在';
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
          this.saveTopics();
          logger.info('TopicManager', '创建新分支', { branchId: newBranch.id, topic: topic.name });
          return `已创建新分支: ${newBranch.id}`;
        }
      }
      logger.warn('TopicManager', '无法创建分支', { topic: topic.name, currentNodeId: topic.currentNode.id });
      return '无法创建分支';
    } catch (error) {
      logger.error('TopicManager', '创建分支失败:', { error: error.message });
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
      const topic = this.topics[topicId];
      if (!topic) {
        return '话题不存在';
      }

      const targetNode = this.findNodeById(topic.conversationTree, branchId);
      if (targetNode) {
        topic.currentNode = targetNode;
        this.saveTopics();
        logger.info('TopicManager', '切换到分支', { branchId, topic: topic.name });
        return `已切换到分支: ${branchId}`;
      }
      logger.warn('TopicManager', '分支不存在', { branchId, topic: topic.name });
      return '分支不存在';
    } catch (error) {
      logger.error('TopicManager', '切换分支失败:', { error: error.message, branchId });
      return '切换分支失败';
    }
  }

  /**
   * 获取当前分支
   * @param {string} topicId - 话题ID
   * @returns {string} - 当前分支ID
   */
  getCurrentBranch(topicId) {
    const topic = this.topics[topicId];
    if (!topic) {
      return null;
    }
    return topic.currentNode.id;
  }

  /**
   * 获取对话树
   * @param {string} topicId - 话题ID
   * @returns {Object} - 对话树
   */
  getConversationTree(topicId) {
    const topic = this.topics[topicId];
    if (!topic) {
      return null;
    }
    return topic.conversationTree;
  }

  /**
   * 根据ID查找节点
   * @param {Object} node - 起始节点
   * @param {string} id - 节点ID
   * @returns {Object|null} - 找到的节点或null
   */
  findNodeById(node, id) {
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
   * 获取对话路径（从 root 到当前节点的扁平消息列表）
   * @param {string} topicId - 话题ID
   * @returns {Array} - 扁平消息数组 [{type:'user'|'ai', content, nodeId}]
   */
  getConversationMessages(topicId) {
    const topic = this.topics[topicId];
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
   * 从指定节点创建分支
   * @param {string} topicId - 话题ID
   * @param {string} fromNodeId - 从哪个节点创建分支
   * @returns {string} - 创建分支的结果信息
   */
  createBranchFromNode(topicId, fromNodeId) {
    try {
      const topic = this.topics[topicId];
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
      this.saveTopics();
      logger.info('TopicManager', '从指定节点创建分支', { branchId: newBranch.id, fromNodeId, topic: topic.name });
      return `已创建新分支: ${newBranch.id}`;
    } catch (error) {
      logger.error('TopicManager', '从指定节点创建分支失败:', { error: error.message });
      return '创建分支失败';
    }
  }

  /**
   * 获取指定节点的所有子分支
   * @param {string} topicId - 话题ID
   * @param {string} nodeId - 节点ID
   * @returns {Array} - 子分支列表
   */
  getNodeBranches(topicId, nodeId) {
    const topic = this.topics[topicId];
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
   * @returns {Object} - 新创建的节点
   */
  addConversationNode(topicId, message, response, metadata = {}) {
    const topic = this.topics[topicId];
    if (!topic) {
      return null;
    }

    const newNode = {
      id: `node-${Date.now()}`,
      parentId: topic.currentNode.id,
      message: message,
      response: response,
      children: [],
      ...metadata
    };

    topic.currentNode.children.push(newNode);
    topic.currentNode = newNode;
    this.saveTopics();
    logger.info('TopicManager', '添加对话节点', { topic: topic.name, nodeId: newNode.id, status: metadata.status || 'completed' });
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
    const topic = this.topics[topicId];
    if (!topic) {
      return null;
    }

    const node = this.findNodeById(topic.conversationTree, nodeId);
    if (!node) {
      return null;
    }

    node.response = response;
    Object.assign(node, metadata);
    this.saveTopics();
    logger.info('TopicManager', '更新节点回答', { topic: topic.name, nodeId, status: metadata.status || 'completed' });
    return node;
  }
}

module.exports = TopicManager;
