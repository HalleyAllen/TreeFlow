/**
 * TreeFlowAgent 类 - 处理AI对话和话题管理
 * 核心业务逻辑入口，协调各管理器工作
 * 重构后：移除简单转发方法，专注于复杂业务协调
 */
const TokenManager = require('../managers/TokenManager');
const ConfigManager = require('../managers/ConfigManager');
const TopicManager = require('../managers/TopicManager');
const ConversationTreeManager = require('../managers/ConversationTreeManager');
const ApiManager = require('../managers/ApiManager');
const { SkillManager } = require('../managers/SkillManager');
const path = require('path');
const logger = require('../utils/logger');

class TreeFlowAgent {
  /**
   * 构造函数 - 初始化TreeFlowAgent实例
   */
  constructor() {
    // 初始化各管理器
    this.tokenManager = new TokenManager();
    this.configManager = new ConfigManager(path.join(__dirname, '../../data/config.json'));
    this.topicManager = new TopicManager(path.join(__dirname, '../../data/topics.json'));
    
    // 加载配置
    this.configManager.loadConfig();
    
    // 加载话题
    this.topicManager.loadTopics();
    
    // 初始化对话树管理器（依赖 TopicManager）
    this.conversationTreeManager = new ConversationTreeManager(this.topicManager);
    
    // 初始化API管理器
    this.apiManager = new ApiManager(this.configManager.getProviders(), this.tokenManager);
    
    // 初始化技能管理器
    this.skillManager = new SkillManager(path.join(__dirname, '../../data/skills.json'));
    
    // Ollama 配置
    this.ollamaEnabled = this.configManager.getConfig().ollamaEnabled || false;
    this.ollamaBaseUrl = this.configManager.getOllamaBaseUrl();
    
    logger.info('TreeFlowAgent', '初始化TreeFlowAgent');
    logger.info('TreeFlowAgent', 'TreeFlowAgent初始化完成');
  }

  /**
   * 发送AI请求 - 核心业务方法
   * @param {string} question - 问题
   * @param {string} [fromNodeId] - 可选，从指定节点分支后提问
   * @param {string} [skillId] - 可选，使用的技能ID
   * @param {string} [model] - 可选，模型名称（不传则使用当前配置）
   * @param {string} [provider] - 可选，供应商名称（不传则自动推断）
   * @param {string} [branchType] - 可选，分支类型
   * @param {Array} [quoteNodeIds] - 可选，引用节点ID列表
   * @returns {Object} - {response, nodeId}
   */
  async ask(question, fromNodeId = null, skillId = null, model = null, provider = null, branchType = null, quoteNodeIds = []) {
    let newNode = null;
    const currentTopic = this.configManager.getCurrentTopic();
    
    try {
      const currentModel = model || this.configManager.getCurrentModel();
      const ollamaBaseUrl = this.configManager.getOllamaBaseUrl();
      
      // 先创建节点（只包含问题，回答为空，状态为加载中）
      // 标记引用分支类型
      const nodeOptions = { status: 'loading' };
      let actualParentId = null;
      
      if (branchType === 'quote') {
        nodeOptions.branchType = 'quote';
        nodeOptions.quoteNodeIds = quoteNodeIds || [];
        // 引用分支直接以被引用节点为父节点，不创建中间空分支
        actualParentId = fromNodeId;
      } else if (fromNodeId) {
        // 普通分支：先创建中间分支，再添加节点
        this.conversationTreeManager.createBranchFromNode(currentTopic, fromNodeId);
      }
      
      newNode = this.conversationTreeManager.addConversationNode(currentTopic, question, '', nodeOptions, actualParentId);
      if (!newNode) {
        logger.error('TreeFlowAgent', '创建节点失败', { topic: currentTopic });
        throw new Error('创建对话节点失败');
      }
      logger.info('TreeFlowAgent', '创建对话节点', { nodeId: newNode.id, status: 'loading', branchType });
      
      // 获取对话历史用于上下文
      let conversationHistory = this.conversationTreeManager.getConversationHistory(currentTopic);
      
      // 如果指定了技能，添加系统提示词
      let finalQuestion = question;
      if (skillId) {
        const skillResult = this.skillManager.executeSkill(skillId, question);
        if (skillResult.systemPrompt) {
          conversationHistory = [
            { role: 'system', content: skillResult.systemPrompt },
            ...conversationHistory
          ];
          finalQuestion = question;
          logger.info('TreeFlowAgent', '使用技能', { skillId, skillName: skillResult.skillName });
        }
      }
      
      logger.info('TreeFlowAgent', '开始AI请求', { 
        model: currentModel, 
        provider: provider || 'auto',
        question: finalQuestion.substring(0, 50) + '...', 
        historyLength: conversationHistory.length, 
        skillId: skillId || 'none',
        nodeId: newNode.id
      });
      
      // 调用API管理器发送请求（传入对话历史）
      const aiResponse = await this.apiManager.ask(finalQuestion, currentModel, ollamaBaseUrl, conversationHistory, provider);
      
      // 更新节点，添加AI回答
      this.conversationTreeManager.updateNodeResponse(currentTopic, newNode.id, aiResponse, { status: 'completed' });
      
      logger.info('TreeFlowAgent', 'AI请求成功', { responseLength: aiResponse.length, nodeId: newNode.id });
      return { response: aiResponse, nodeId: newNode.id };
    } catch (error) {
      logger.error('TreeFlowAgent', 'AI请求失败:', { error: error.message });
      // 更新节点状态为错误
      if (newNode) {
        this.conversationTreeManager.updateNodeResponse(currentTopic, newNode.id, `错误: ${error.message}`, { status: 'error' });
      }
      throw new Error(`AI请求失败: ${error.message}`);
    }
  }

  /**
   * 创建新分支
   * @param {string} [fromNodeId] - 可选，从指定节点创建分支
   * @returns {string} - 创建分支的结果信息
   */
  createBranch(fromNodeId = null) {
    const currentTopic = this.configManager.getCurrentTopic();
    if (fromNodeId) {
      return this.conversationTreeManager.createBranchFromNode(currentTopic, fromNodeId);
    }
    return this.conversationTreeManager.createBranch(currentTopic);
  }

  /**
   * 获取指定节点的分支列表
   * @param {string} nodeId - 节点ID
   * @returns {Array} - 分支列表
   */
  getNodeBranches(nodeId) {
    const currentTopic = this.configManager.getCurrentTopic();
    return this.conversationTreeManager.getNodeBranches(currentTopic, nodeId);
  }

  /**
   * 获取话题的对话消息
   * @param {string} [topicId] - 可选话题ID
   * @returns {Array} - 消息数组
   */
  getTopicMessages(topicId) {
    const tid = topicId || this.configManager.getCurrentTopic();
    return this.conversationTreeManager.getConversationMessages(tid);
  }

  /**
   * 切换到分支
   * @param {string} branchId - 分支ID
   * @returns {string} - 切换分支的结果信息
   */
  switchToBranch(branchId) {
    const currentTopic = this.configManager.getCurrentTopic();
    return this.conversationTreeManager.switchToBranch(currentTopic, branchId);
  }

  /**
   * 获取当前分支
   * @returns {string} - 当前分支ID
   */
  getCurrentBranch() {
    const currentTopic = this.configManager.getCurrentTopic();
    const branchId = this.conversationTreeManager.getCurrentBranch(currentTopic);
    logger.info('TreeFlowAgent', '获取当前分支', { branchId, topic: currentTopic });
    return branchId;
  }

  /**
   * 获取对话树
   * @returns {Object} - 对话树
   */
  getConversationTree() {
    const currentTopic = this.configManager.getCurrentTopic();
    const tree = this.conversationTreeManager.getConversationTree(currentTopic);
    logger.info('TreeFlowAgent', '获取对话树', { topic: currentTopic });
    return tree;
  }

  /**
   * 删除话题
   * @param {string} topicId - 话题ID
   * @returns {string} - 删除话题的结果信息
   */
  deleteTopic(topicId) {
    const result = this.topicManager.deleteTopic(topicId);
    if (result !== '话题不存在' && result !== '删除话题失败' && result !== '默认话题无法删除') {
      if (this.configManager.getCurrentTopic() === topicId) {
        this.configManager.setCurrentTopic('default');
        logger.info('TreeFlowAgent', '切换到默认话题', { deletedTopicId: topicId });
      }
    }
    return result;
  }

  /**
   * 获取当前话题
   * @returns {Object} - 当前话题信息
   */
  getCurrentTopic() {
    let topicId = this.configManager.getCurrentTopic();
    let topic = this.topicManager.getTopic(topicId);
    
    // 如果当前话题不存在，切换到默认话题
    if (!topic) {
      logger.warn('TreeFlowAgent', '当前话题不存在，切换到默认话题', { topicId });
      topicId = 'default';
      topic = this.topicManager.getTopic(topicId);
      this.configManager.setCurrentTopic(topicId);
    }
    
    const topicInfo = {
      id: topicId,
      name: topic ? topic.name : '默认话题'
    };
    logger.info('TreeFlowAgent', '获取当前话题', topicInfo);
    return topicInfo;
  }

  /**
   * 更新提供商配置
   * @param {Object} providers - 提供商配置
   */
  updateProviders(providers) {
    this.configManager.setProviders(providers);
    this.apiManager.updateProviders(providers);
  }
}

module.exports = { TreeFlowAgent };
