/**
 * TokenManager 类 - 管理AI服务的token信息
 * 提供token的添加、删除、更新等功能
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

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
    if (token.length < 10) {
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

    // 如果没有提供厂商和模型，自动识别
    let modelInfo;
    if (provider && model) {
      modelInfo = { provider, model };
    } else {
      modelInfo = this.identifyModelFromToken(token);
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
   * 获取Token详细信息
   * @param {string} token - 要查询的token
   * @returns {Object|null} - Token详细信息，未找到返回null
   */
  getTokenDetails(token) {
    const index = this.findTokenIndex(token);
    return index > -1 ? this.tokens[index] : null;
  }

  /**
   * 获取指定模型的可用Token数量
   * @param {string} model - 模型名称
   * @returns {number} - 可用Token数量
   */
  getAvailableTokensByModel(model) {
    return this.tokens.filter(t =>
      t.status === 'active' &&
      t.model === model
    ).length;
  }

  /**
   * 根据token识别AI模型
   * @param {string} token - 要识别的token
   * @returns {Object} - 识别结果，包含provider和model
   */
  identifyModelFromToken(token) {
    // OpenAI token格式: sk-开头
    if (token.startsWith('sk-')) {
      // 百度token也是sk-开头，这里暂时默认识别为OpenAI
      // 用户可以在界面上手动修改为百度
      return {
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo'
      };
    }
    // Anthropic (Claude) token格式: sk-ant-开头
    else if (token.startsWith('sk-ant-')) {
      return {
        provider: 'Anthropic',
        model: 'claude-3-opus-20240229'
      };
    }
    // Google AI Studio token格式: AIzaSy开头
    else if (token.startsWith('AIzaSy')) {
      return {
        provider: 'Gemini',
        model: 'gemini-1.5-pro'
      };
    }
    // AWS token格式: ak-开头
    else if (token.startsWith('ak-')) {
      return {
        provider: 'AWS',
        model: 'bedrock-anthropic-claude-3'
      };
    }
    // xAI token格式: xai-开头
    else if (token.startsWith('xai-')) {
      return {
        provider: 'xAI',
        model: 'grok-1'
      };
    }
    // OpenRouter token格式: or-开头
    else if (token.startsWith('or-')) {
      return {
        provider: 'OpenRouter',
        model: 'openai/gpt-4o'
      };
    }
    // Vercel AI-Gateway token格式: vercel-开头
    else if (token.startsWith('vercel-')) {
      return {
        provider: 'Vercel AI-Gateway',
        model: 'openai/gpt-4o'
      };
    }
    // MiniMax token格式: mm-开头
    else if (token.startsWith('mm-')) {
      return {
        provider: 'MiniMax-CN',
        model: 'abab6-chat'
      };
    }
    // DeepSeek token格式: ds-开头
    else if (token.startsWith('ds-')) {
      return {
        provider: 'DeepSeek',
        model: 'deepseek-llm-7b-chat'
      };
    }
    // 火山引擎 token格式: volc-开头
    else if (token.startsWith('volc-')) {
      return {
        provider: '火山引擎',
        model: 'volcengine-llama3'
      };
    }
    // 阿里云 token格式: aliyun-开头
    else if (token.startsWith('aliyun-')) {
      return {
        provider: '阿里云',
        model: 'qwen-7b-chat'
      };
    }
    // 腾讯云 token格式: tencent-开头
    else if (token.startsWith('tencent-')) {
      return {
        provider: '腾讯云',
        model: 'tencent-hunyuan'
      };
    }
    // Kimi token格式: kimi-开头
    else if (token.startsWith('kimi-')) {
      return {
        provider: 'Kimi-CN',
        model: 'kimi-cn'
      };
    }
    // BytePlus token格式: byteplus-开头
    else if (token.startsWith('byteplus-')) {
      return {
        provider: 'BytePlus',
        model: 'byteplus-llm-7b'
      };
    }
    // 默认情况
    else {
      return {
        provider: 'Unknown',
        model: 'unknown'
      };
    }
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
    const timeout = setTimeout(() => controller.abort(), 5000);

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
        message: error.name === 'AbortError' ? '连接超时（5秒）' : `连接错误: ${error.message}`,
        token
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * 批量检查所有Token健康状态
   * @returns {Array} - 所有Token的健康检查结果
   */
  async checkAllTokensHealth() {
    const results = await Promise.allSettled(
      this.tokens.map(token => this.checkTokenHealth(token.token))
    );
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return { ...result.value, index };
      }
      return { healthy: false, message: '检查异常', token: this.tokens[index]?.token, index };
    });
  }

  /**
   * 获取Token使用统计
   * @returns {Array} - Token统计信息
   */
  getTokenUsageStats() {
    return this.tokens.map(token => ({
      token: token.token.substring(0, 8) + '...',
      provider: token.provider,
      model: token.model,
      status: token.status,
      createdAt: token.createdAt,
      fullToken: token.token
    }));
  }
}

module.exports = TokenManager;
