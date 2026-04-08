/**
 * TokenManager 类 - 管理AI服务的token信息
 * 提供token的添加、删除、更新等功能
 * 重构后：专注于 Token CRUD，模型识别逻辑移至 ModelIdentifier 服务
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const fetch = require('node-fetch');
const ModelIdentifier = require('../services/ModelIdentifier');

class TokenManager {
  /**
   * 构造函数
   * 初始化TokenManager实例，加载token数据
   */
  constructor() {
    this.tokens = []; // 存储token的数组
    this.tokenFile = path.join(__dirname, '../../data/tokens.json'); // token存储文件路径
    this.loadTokens(); // 加载token到内存
  }

  /**
   * 加载Token到内存
   * 从tokens.json文件中读取token数据并解析
   */
  loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        this.tokens = JSON.parse(data);
        // 转换日期字符串为Date对象
        this.tokens.forEach(token => {
          if (token.createdAt) token.createdAt = new Date(token.createdAt);
        });
      }
    } catch (error) {
      logger.error('TokenManager', '加载Token失败:', { error: error.message });
      this.tokens = [];
    }
  }

  /**
   * 保存Token到持久化存储
   * 将内存中的token数据写入tokens.json文件
   */
  saveTokens() {
    try {
      // 转换Date对象为字符串
      const tokensToSave = this.tokens.map(token => ({
        ...token,
        createdAt: token.createdAt.toISOString()
      }));
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokensToSave, null, 2));
    } catch (error) {
      logger.error('TokenManager', '保存Token失败:', { error: error.message });
    }
  }

  /**
   * 验证Token格式
   * @param {string} token - 要验证的token字符串
   * @returns {boolean} - 验证结果
   * @throws {Error} - 当token格式无效时抛出错误
   */
  validateToken(token) {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Token不能为空');
    }
    // 基本长度验证
    const MIN_TOKEN_LENGTH = 10;
    if (token.length < MIN_TOKEN_LENGTH) {
      throw new Error('Token格式不正确');
    }
    return true;
  }

  /**
   * 添加Token
   * @param {string} token - 要添加的token
   * @param {string} provider - 厂商名称（可选）
   * @param {string} model - 模型名称（可选）
   * @returns {string} - 添加结果消息
   * @throws {Error} - 当token格式无效或已存在时抛出错误
   */
  addToken(token, provider = null, model = null) {
    // 验证Token格式
    this.validateToken(token);

    // 检查Token是否已存在
    if (this.tokens.some(t => t.token === token)) {
      throw new Error('Token已存在');
    }

    // 如果没有提供厂商和模型，使用 ModelIdentifier 自动识别
    let modelInfo;
    if (provider && model) {
      modelInfo = { provider, model };
    } else {
      modelInfo = ModelIdentifier.identify(token);
    }

    this.tokens.push({
      token,
      model: modelInfo.model,
      provider: modelInfo.provider,
      createdAt: new Date(),
      status: 'active' // active, inactive, expired, testing
    });

    // 保存Token
    this.saveTokens();

    return `Token已添加: ${token.substring(0, 8)}... (${modelInfo.provider} - ${modelInfo.model})`;
  }

  /**
   * 删除Token
   * @param {string} token - 要删除的token
   * @returns {string} - 删除结果消息
   */
  removeToken(token) {
    // 清理token，去除首尾空格
    const cleanedToken = token.trim();

    // 尝试精确匹配
    let index = this.tokens.findIndex(t => t.token === cleanedToken);

    // 如果精确匹配失败，尝试模糊匹配
    if (index === -1) {
      index = this.tokens.findIndex(t => t.token.includes(cleanedToken));
    }

    if (index > -1) {
      this.tokens.splice(index, 1);
      // 保存Token状态
      this.saveTokens();
      return 'Token已删除';
    }
    return 'Token不存在';
  }

  /**
   * 更新Token厂商和模型信息
   * @param {string} token - 要更新的token
   * @param {string} provider - 新的厂商名称
   * @param {string} model - 新的模型名称
   * @returns {string} - 更新结果消息
   */
  updateTokenInfo(oldToken, newToken, provider, model) {
    const index = this.findTokenIndex(oldToken);
    if (index > -1) {
      // 验证新Token格式
      if (newToken && newToken !== oldToken) {
        this.validateToken(newToken);
        // 检查新Token是否已存在
        if (this.tokens.some(t => t.token === newToken)) {
          throw new Error('Token已存在');
        }
        this.tokens[index].token = newToken;
      }
      this.tokens[index].provider = provider;
      this.tokens[index].model = model;
      // 保存Token状态
      this.saveTokens();
      const tokenToDisplay = this.tokens[index].token;  // 显示新Token或旧Token
      return `Token信息已更新: ${tokenToDisplay.substring(0, 8)}... (${provider} - ${model})`;
    }
    return 'Token不存在';
  }

  /**
   * 获取可用的Token
   * @returns {string} - 可用的token
   * @throws {Error} - 当没有可用token时抛出错误
   */
  getToken() {
    if (this.tokens.length === 0) {
      throw new Error('没有可用的token');
    }

    // 过滤出活跃状态的Token
    const activeTokens = this.tokens.filter(t => t.status === 'active');
    if (activeTokens.length === 0) {
      throw new Error('没有活跃的token');
    }

    // 返回第一个活跃的Token
    return activeTokens[0].token;
  }

  /**
   * 根据模型类型获取Token
   * @param {string} model - 模型名称
   * @returns {string} - 匹配的token
   * @throws {Error} - 当没有可用token时抛出错误
   */
  getTokenByModel(model) {
    if (this.tokens.length === 0) {
      throw new Error('没有可用的token');
    }

    // 过滤出活跃状态且匹配模型的Token
    const relevantTokens = this.tokens.filter(t =>
      t.status === 'active' &&
      t.model === model
    );

    if (relevantTokens.length === 0) {
      // 如果没有匹配模型的Token，返回任意活跃Token
      return this.getToken();
    }

    // 返回第一个匹配的Token
    return relevantTokens[0].token;
  }

  /**
   * 更新Token状态
   * @param {string} token - 要更新的token
   * @param {string} status - 新的状态
   * @returns {string} - 更新结果消息
   */
  updateTokenStatus(token, status) {
    const index = this.findTokenIndex(token);
    if (index > -1) {
      this.tokens[index].status = status;
      // 保存Token状态
      this.saveTokens();
      return `Token状态已更新为: ${status}`;
    }
    return 'Token不存在';
  }

  /**
   * 清除所有Token
   * @returns {string} - 清除结果消息
   */
  clearTokens() {
    this.tokens = [];
    // 保存Token状态
    this.saveTokens();
    return '所有token已清除';
  }

  /**
   * 辅助函数：查找token索引
   * @param {string} token - 要查找的token
   * @returns {number} - token在数组中的索引，未找到返回-1
   */
  findTokenIndex(token) {
    // 清理token，去除首尾空格
    const cleanedToken = token.trim();

    // 尝试精确匹配
    let index = this.tokens.findIndex(t => t.token === cleanedToken);

    // 如果精确匹配失败，尝试模糊匹配
    if (index === -1) {
      index = this.tokens.findIndex(t => t.token.includes(cleanedToken));
    }

    return index;
  }

  /**
   * 获取Token列表
   * @returns {Array} - Token列表
   */
  getTokenList() {
    return this.tokens.map(token => ({
      token: token.token,
      provider: token.provider,
      model: token.model,
      createdAt: token.createdAt,
      status: token.status
    }));
  }

  /**
   * 检查Token健康状态
   * @param {string} token - Token值
   * @returns {Object} - {healthy, message}
   */
  async checkTokenHealth(token) {
    const tokenData = this.tokens.find(t => t.token === token);
    if (!tokenData) {
      return { healthy: false, message: 'Token不存在', token };
    }

    const controller = new AbortController();
    const TIMEOUT_MS = 5000;
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      tokenData.status = 'testing';
      this.saveTokens();

      let apiUrl;
      const provider = tokenData.provider;

      // 根据提供商构建健康检查URL
      if (provider === 'OpenAI' || provider === 'Unknown') {
        apiUrl = 'https://api.openai.com/v1/models';
      } else if (provider === 'Anthropic') {
        apiUrl = '';
      } else if (provider === 'Google' || provider === 'Gemini') {
        apiUrl = `https://generativelanguage.googleapis.com/v1/models?key=${token}`;
      } else {
        // 通用检查：尝试使用配置的提供商URL
        apiUrl = null;
      }

      if (apiUrl) {
        const headers = { 'Authorization': `Bearer ${token}` };
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });

        if (response.ok) {
          tokenData.status = 'active';
          this.saveTokens();
          return { healthy: true, message: '连接正常', token };
        } else {
          tokenData.status = 'expired';
          this.saveTokens();
          return { healthy: false, message: `请求失败: ${response.status}`, token };
        }
      } else {
        // 对于无法直接检查的提供商，标记为未知
        tokenData.status = 'active';
        this.saveTokens();
        return { healthy: true, message: '无法直接验证（提供商不支持健康检查）', token };
      }
    } catch (error) {
      tokenData.status = error.name === 'AbortError' ? 'inactive' : 'expired';
      this.saveTokens();
      return {
        healthy: false,
        message: error.name === 'AbortError' ? `连接超时（${TIMEOUT_MS/1000}秒）` : `连接错误: ${error.message}`,
        token
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = TokenManager;
