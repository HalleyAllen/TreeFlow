/**
 * TreeFlowAgent 类 - 处理AI对话和话题管理
 * 核心业务逻辑入口，协调各管理器工作
 */
const TokenManager = require('../managers/TokenManager');
const ConfigManager = require('../managers/ConfigManager');
const TopicManager = require('../managers/TopicManager');
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
   * 设置当前模型
   * @param {string} model - 模型名称
   * @returns {string} - 切换模型的结果信息
   */
  setModel(model) {
    const oldModel = this.configManager.getCurrentModel();
    this.configManager.setCurrentModel(model);
    logger.info('TreeFlowAgent', '切换模型', { oldModel, newModel: model });
    return `已切换到模型: ${model}`;
  }

  /**
   * 获取当前模型
   * @returns {string} - 当前模型名称
   */
  getModel() {
    return this.configManager.getCurrentModel();
  }

  /**
   * 设置Ollama启用状态
   * @param {boolean} enabled - 是否启用
   * @returns {string} - 结果信息
   */
  setOllamaEnabled(enabled) {
    this.ollamaEnabled = enabled;
    this.configManager.setConfig({ ollamaEnabled: enabled });
    logger.info('TreeFlowAgent', '设置Ollama启用状态', { enabled });
    return `Ollama已${enabled ? '启用' : '禁用'}`;
  }

  /**
   * 设置Ollama基础URL
   * @param {string} url - Ollama基础URL
   * @returns {string} - 设置Ollama基础URL的结果信息
   */
  setOllamaBaseUrl(url) {
    const oldUrl = this.configManager.getOllamaBaseUrl();
    this.configManager.setOllamaBaseUrl(url);
    this.ollamaBaseUrl = url;
    logger.info('TreeFlowAgent', '设置Ollama基础URL', { oldUrl, newUrl: url });
    return `已设置Ollama基础URL: ${url}`;
  }

  /**
   * 添加Token
   * @param {string} token - Token值
   * @param {string} [provider=null] - 提供商名称
   * @param {string} [model=null] - 模型名称
   * @returns {string} - 添加Token的结果信息
   */
  addToken(token, provider = null, model = null) {
    const result = this.tokenManager.addToken(token, provider, model);
    logger.info('TreeFlowAgent', '添加Token', { provider, model });
    return result;
  }

  /**
   * 获取Token列表
   * @returns {Array} - Token列表
   */
  getTokenList() {
    const tokens = this.tokenManager.getTokenList();
    logger.info('TreeFlowAgent', '获取Token列表', { tokenCount: tokens.length });
    return tokens;
  }

  /**
   * 更新Token状态
   * @param {string} token - Token值
   * @param {string} status - Token状态
   * @returns {string} - 更新Token状态的结果信息
   */
  updateTokenStatus(token, status) {
    const result = this.tokenManager.updateTokenStatus(token, status);
    logger.info('TreeFlowAgent', '更新Token状态', { status });
    return result;
  }

  /**
   * 更新Token信息
   * @param {string} oldToken - 旧Token值
   * @param {string} newToken - 新Token值
   * @param {string} provider - 提供商名称
   * @param {string} model - 模型名称
   * @returns {string} - 更新Token信息的结果信息
   */
  updateTokenInfo(oldToken, newToken, provider, model) {
    const result = this.tokenManager.updateTokenInfo(oldToken, newToken, provider, model);
    logger.info('TreeFlowAgent', '更新Token信息', { provider, model });
    return result;
  }

  /**
   * 清除所有Token
   * @returns {string} - 清除所有Token的结果信息
   */
  clearTokens() {
    const result = this.tokenManager.clearTokens();
    logger.info('TreeFlowAgent', '清除所有Token');
    return result;
  }

  /**
   * 获取Token详细信息
   * @param {string} token - Token值
   * @returns {Object} - Token详细信息
   */
  getTokenDetails(token) {
    const details = this.tokenManager.getTokenDetails(token);
    logger.info('TreeFlowAgent', '获取Token详细信息', { provider: details?.provider });
    return details;
  }

  /**
   * 获取Token统计信息
   * @returns {Object} - Token统计信息
   */
  getTokenStats() {
    return this.tokenManager.getTokenUsageStats();
  }

  /**
   * 发送AI请求
   * @param {string} question - 问题
   * @param {string} [fromNodeId] - 可选，从指定节点分支后提问
   * @param {string} [skillId] - 可选，使用的技能ID
   * @returns {Object} - {response, nodeId}
   */
  async ask(question, fromNodeId = null, skillId = null) {
    try {
      const model = this.configManager.getCurrentModel();
      const ollamaBaseUrl = this.configManager.getOllamaBaseUrl();
      const currentTopic = this.configManager.getCurrentTopic();
      
      // 如果指定了 fromNodeId，先创建分支
      if (fromNodeId) {
        this.topicManager.createBranchFromNode(currentTopic, fromNodeId);
      }
      
      // 先创建节点（只包含问题，回答为空，状态为加载中）
      const newNode = this.topicManager.addConversationNode(currentTopic, question, '', { status: 'loading' });
      logger.info('TreeFlowAgent', '创建对话节点', { nodeId: newNode.id, status: 'loading' });
      
      // 获取对话历史用于上下文
      let conversationHistory = this.topicManager.getConversationHistory(currentTopic);
      
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
        model, 
        question: finalQuestion.substring(0, 50) + '...', 
        historyLength: conversationHistory.length, 
        skillId: skillId || 'none',
        nodeId: newNode.id
      });
      
      // 调用API管理器发送请求（传入对话历史）
      const aiResponse = await this.apiManager.ask(finalQuestion, model, ollamaBaseUrl, conversationHistory);
      
      // 更新节点，添加AI回答
      this.topicManager.updateNodeResponse(currentTopic, newNode.id, aiResponse, { status: 'completed' });
      
      logger.info('TreeFlowAgent', 'AI请求成功', { responseLength: aiResponse.length, nodeId: newNode.id });
      return { response: aiResponse, nodeId: newNode.id };
    } catch (error) {
      logger.error('TreeFlowAgent', 'AI请求失败:', { error: error.message });
      // 更新节点状态为错误
      if (typeof newNode !== 'undefined' && newNode) {
        this.topicManager.updateNodeResponse(currentTopic, newNode.id, `错误: ${error.message}`, { status: 'error' });
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
      return this.topicManager.createBranchFromNode(currentTopic, fromNodeId);
    }
    return this.topicManager.createBranch(currentTopic);
  }

  /**
   * 获取指定节点的分支列表
   * @param {string} nodeId - 节点ID
   * @returns {Array} - 分支列表
   */
  getNodeBranches(nodeId) {
    const currentTopic = this.configManager.getCurrentTopic();
    return this.topicManager.getNodeBranches(currentTopic, nodeId);
  }

  /**
   * 获取话题的对话消息
   * @param {string} [topicId] - 可选话题ID
   * @returns {Array} - 消息数组
   */
  getTopicMessages(topicId) {
    const tid = topicId || this.configManager.getCurrentTopic();
    return this.topicManager.getConversationMessages(tid);
  }

  /**
   * 切换到分支
   * @param {string} branchId - 分支ID
   * @returns {string} - 切换分支的结果信息
   */
  switchToBranch(branchId) {
    const currentTopic = this.configManager.getCurrentTopic();
    return this.topicManager.switchToBranch(currentTopic, branchId);
  }

  /**
   * 获取当前分支
   * @returns {string} - 当前分支ID
   */
  getCurrentBranch() {
    const currentTopic = this.configManager.getCurrentTopic();
    const branchId = this.topicManager.getCurrentBranch(currentTopic);
    logger.info('TreeFlowAgent', '获取当前分支', { branchId, topic: currentTopic });
    return branchId;
  }

  /**
   * 获取对话树
   * @returns {Object} - 对话树
   */
  getConversationTree() {
    const currentTopic = this.configManager.getCurrentTopic();
    const tree = this.topicManager.getConversationTree(currentTopic);
    logger.info('TreeFlowAgent', '获取对话树', { topic: currentTopic });
    return tree;
  }

  /**
   * 创建话题
   * @param {string} name - 话题名称
   * @returns {string} - 创建话题的结果信息
   */
  createTopic(name) {
    return this.topicManager.createTopic(name);
  }

  /**
   * 切换话题
   * @param {string} topicId - 话题ID
   * @returns {string} - 切换话题的结果信息
   */
  switchTopic(topicId) {
    const result = this.topicManager.switchTopic(topicId);
    if (result !== '话题不存在' && result !== '切换话题失败') {
      this.configManager.setCurrentTopic(topicId);
    }
    return result;
  }

  /**
   * 获取话题列表
   * @returns {Array} - 话题列表
   */
  listTopics() {
    const topics = this.topicManager.getTopics().map(topic => ({
      id: topic.id,
      name: topic.name
    }));
    logger.info('TreeFlowAgent', '获取话题列表', { topicCount: topics.length });
    return topics;
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
    const topicId = this.configManager.getCurrentTopic();
    const topic = this.topicManager.getTopic(topicId);
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

  /**
   * 获取当前主题
   * @returns {string} - 主题名称
   */
  getTheme() {
    return this.configManager.getTheme();
  }

  /**
   * 设置当前主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.configManager.setTheme(theme);
  }
}

module.exports = { TreeFlowAgent };
