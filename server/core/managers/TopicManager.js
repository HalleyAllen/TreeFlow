/**
 * 话题管理模块
 * 处理话题的创建、切换、删除和保存
 * 重构后：只负责话题生命周期管理，对话树逻辑移至 ConversationTreeManager
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
        conversationTree: null,  // 初始为空，等用户提问时再创建
        currentNode: null,
        nodePositions: {}  // 节点位置持久化存储
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
   * 将所有话题保存到topics.json文件
   */
  saveTopics() {
    try {
      // 保存所有话题（包括默认话题，以保留话题状态）
      fs.writeFileSync(this.topicsFile, JSON.stringify(this.topics, null, 2));
      logger.info('TopicManager', '保存话题成功', { topicCount: Object.keys(this.topics).length });
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
        conversationTree: null,  // 初始为空，等用户提问时再创建
        currentNode: null,
        nodePositions: {}  // 节点位置持久化存储
      };
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
        this.saveTopics(); // 保存话题状态
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
   * 更新话题名称
   * @param {string} topicId - 话题ID
   * @param {string} newName - 新名称
   * @returns {string} - 更新结果信息
   */
  updateTopicName(topicId, newName) {
    try {
      if (!this.topics[topicId]) {
        return '话题不存在';
      }
      const oldName = this.topics[topicId].name;
      this.topics[topicId].name = newName;
      this.saveTopics();
      logger.info('TopicManager', '更新话题名称', { topicId, oldName, newName });
      return `话题名称已更新: ${newName}`;
    } catch (error) {
      logger.error('TopicManager', '更新话题名称失败:', { error: error.message, topicId });
      return '更新话题名称失败';
    }
  }

  /**
   * 获取当前话题的对话树
   * @param {string} topicId - 话题ID
   * @returns {Object} - 对话树
   * @deprecated 请使用 ConversationTreeManager.getConversationTree()
   */
  getConversationTree(topicId) {
    const topic = this.topics[topicId];
    if (!topic) {
      return null;
    }
    return topic.conversationTree;
  }

  /**
   * 判断话题是否有对话节点
   * @param {string} topicId - 话题ID
   * @returns {boolean} - 是否有节点
   * @deprecated 请使用 ConversationTreeManager.hasConversationNodes()
   */
  hasConversationNodes(topicId) {
    const topic = this.topics[topicId];
    if (!topic) return false;
    return topic.conversationTree !== null;
  }

  /**
   * 获取话题的节点位置
   * @param {string} topicId - 话题ID
   * @returns {Object} - 节点位置对象 { nodeId: { x, y }, ... }
   */
  getNodePositions(topicId) {
    const topic = this.topics[topicId];
    if (!topic) {
      logger.warn('TopicManager', '话题不存在，无法获取节点位置', { topicId });
      return {};
    }
    return topic.nodePositions || {};
  }

  /**
   * 保存话题的节点位置
   * @param {string} topicId - 话题ID
   * @param {Object} positions - 节点位置对象 { nodeId: { x, y }, ... }
   * @returns {boolean} - 是否保存成功
   */
  saveNodePositions(topicId, positions) {
    try {
      const topic = this.topics[topicId];
      if (!topic) {
        logger.warn('TopicManager', '话题不存在，无法保存节点位置', { topicId });
        return false;
      }
      topic.nodePositions = { ...topic.nodePositions, ...positions };
      this.saveTopics();
      logger.info('TopicManager', '保存节点位置成功', { topicId, positionCount: Object.keys(positions).length });
      return true;
    } catch (error) {
      logger.error('TopicManager', '保存节点位置失败:', { error: error.message, topicId });
      return false;
    }
  }

  /**
   * 重置话题的节点位置（清除所有保存的位置）
   * @param {string} topicId - 话题ID
   * @returns {boolean} - 是否重置成功
   */
  resetNodePositions(topicId) {
    try {
      const topic = this.topics[topicId];
      if (!topic) {
        logger.warn('TopicManager', '话题不存在，无法重置节点位置', { topicId });
        return false;
      }
      topic.nodePositions = {};
      this.saveTopics();
      logger.info('TopicManager', '重置节点位置成功', { topicId });
      return true;
    } catch (error) {
      logger.error('TopicManager', '重置节点位置失败:', { error: error.message, topicId });
      return false;
    }
  }
}

module.exports = TopicManager;
