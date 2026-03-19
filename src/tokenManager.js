const fs = require('fs');
const path = require('path');

class TokenManager {
  constructor() {
    this.tokens = [];
    this.tokenFile = path.join(__dirname, '../tokens.json');
    this.loadTokens();
  }

  // 加载Token到内存
  loadTokens() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        this.tokens = JSON.parse(data);
        // 转换日期字符串为Date对象
        this.tokens.forEach(token => {
          if (token.createdAt) token.createdAt = new Date(token.createdAt);
          if (token.lastUsed) token.lastUsed = new Date(token.lastUsed);
        });
      }
    } catch (error) {
      console.error('加载Token失败:', error);
      this.tokens = [];
    }
  }

  // 保存Token到持久化存储
  saveTokens() {
    try {
      // 转换Date对象为字符串
      const tokensToSave = this.tokens.map(token => ({
        ...token,
        createdAt: token.createdAt.toISOString(),
        lastUsed: token.lastUsed ? token.lastUsed.toISOString() : null
      }));
      fs.writeFileSync(this.tokenFile, JSON.stringify(tokensToSave, null, 2));
    } catch (error) {
      console.error('保存Token失败:', error);
    }
  }

  // 验证Token格式
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

  // 检查Token健康状态（模拟）
  async checkTokenHealth(token) {
    // 这里可以实现实际的Token健康检查，比如调用API测试Token是否有效
    // 目前暂时返回模拟结果
    return {
      valid: true,
      message: 'Token有效'
    };
  }

  addToken(token) {
    // 验证Token格式
    this.validateToken(token);
    
    // 检查Token是否已存在
    if (this.tokens.some(t => t.token === token)) {
      throw new Error('Token已存在');
    }
    
    const modelInfo = this.identifyModelFromToken(token);
    this.tokens.push({
      token,
      model: modelInfo.model,
      provider: modelInfo.provider,
      createdAt: new Date(),
      lastUsed: null,
      usageCount: 0,
      status: 'active', // active, inactive, expired, testing
      lastHealthCheck: null,
      healthStatus: 'unknown' // unknown, healthy, unhealthy
    });
    
    // 保存Token
    this.saveTokens();
    
    return `Token已添加: ${token.substring(0, 8)}... (${modelInfo.provider} - ${modelInfo.model})`;
  }

  // 根据token识别AI模型
  identifyModelFromToken(token) {
    // OpenAI token格式: sk-开头
    if (token.startsWith('sk-')) {
      return {
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo'
      };
    }
    // Anthropic (Claude) token格式: sk-ant-开头
    else if (token.startsWith('sk-ant-')) {
      return {
        provider: 'Anthropic',
        model: 'claude-3'
      };
    }
    // Google AI Studio token格式: AIzaSy开头
    else if (token.startsWith('AIzaSy')) {
      return {
        provider: 'Google',
        model: 'gemini-pro'
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

  // 获取可用的Token，考虑使用频率、状态和健康状况
  getToken() {
    if (this.tokens.length === 0) {
      throw new Error('没有可用的token');
    }

    // 过滤出活跃状态的Token
    const activeTokens = this.tokens.filter(t => t.status === 'active' && t.healthStatus !== 'unhealthy');
    if (activeTokens.length === 0) {
      throw new Error('没有活跃的token');
    }

    // 按照使用频率和健康状况排序
    activeTokens.sort((a, b) => {
      // 优先使用健康状态好的Token
      if (a.healthStatus === 'healthy' && b.healthStatus !== 'healthy') return -1;
      if (a.healthStatus !== 'healthy' && b.healthStatus === 'healthy') return 1;
      // 其次使用使用次数少的Token
      return a.usageCount - b.usageCount;
    });
    
    const token = activeTokens[0];
    token.lastUsed = new Date();
    token.usageCount++;
    
    // 保存Token状态
    this.saveTokens();
    
    return token.token;
  }

  // 根据模型类型获取Token
  getTokenByModel(model) {
    if (this.tokens.length === 0) {
      throw new Error('没有可用的token');
    }

    // 过滤出活跃状态且匹配模型的Token
    const relevantTokens = this.tokens.filter(t => 
      t.status === 'active' && 
      t.healthStatus !== 'unhealthy' && 
      t.model === model
    );

    if (relevantTokens.length === 0) {
      // 如果没有匹配模型的Token，返回任意活跃Token
      return this.getToken();
    }

    // 按照使用频率排序
    relevantTokens.sort((a, b) => a.usageCount - b.usageCount);
    
    const token = relevantTokens[0];
    token.lastUsed = new Date();
    token.usageCount++;
    
    // 保存Token状态
    this.saveTokens();
    
    return token.token;
  }

  removeToken(token) {
    const index = this.tokens.findIndex(t => t.token === token);
    if (index > -1) {
      this.tokens.splice(index, 1);
      // 保存Token状态
      this.saveTokens();
      return 'Token已删除';
    }
    return 'Token不存在';
  }

  // 更新Token状态
  updateTokenStatus(token, status) {
    const index = this.tokens.findIndex(t => t.token === token);
    if (index > -1) {
      this.tokens[index].status = status;
      // 保存Token状态
      this.saveTokens();
      return `Token状态已更新为: ${status}`;
    }
    return 'Token不存在';
  }

  // 更新Token健康状态
  updateTokenHealthStatus(token, healthStatus, message = '') {
    const index = this.tokens.findIndex(t => t.token === token);
    if (index > -1) {
      this.tokens[index].healthStatus = healthStatus;
      this.tokens[index].lastHealthCheck = new Date();
      // 如果健康状态为unhealthy，自动将状态设置为inactive
      if (healthStatus === 'unhealthy') {
        this.tokens[index].status = 'inactive';
      }
      // 保存Token状态
      this.saveTokens();
      return `Token健康状态已更新为: ${healthStatus}`;
    }
    return 'Token不存在';
  }

  // 批量检查Token健康状态
  async checkAllTokensHealth() {
    const results = [];
    for (const token of this.tokens) {
      try {
        const healthCheck = await this.checkTokenHealth(token.token);
        const healthStatus = healthCheck.valid ? 'healthy' : 'unhealthy';
        this.updateTokenHealthStatus(token.token, healthStatus);
        results.push({
          token: token.token.substring(0, 8) + '...',
          provider: token.provider,
          model: token.model,
          healthStatus,
          message: healthCheck.message
        });
      } catch (error) {
        this.updateTokenHealthStatus(token.token, 'unhealthy', error.message);
        results.push({
          token: token.token.substring(0, 8) + '...',
          provider: token.provider,
          model: token.model,
          healthStatus: 'unhealthy',
          message: error.message
        });
      }
    }
    return results;
  }

  getTokenStats() {
    return this.tokens.map(token => ({
      token: token.token.substring(0, 8) + '...',
      provider: token.provider,
      model: token.model,
      usageCount: token.usageCount,
      lastUsed: token.lastUsed,
      createdAt: token.createdAt,
      status: token.status,
      healthStatus: token.healthStatus || 'unknown',
      lastHealthCheck: token.lastHealthCheck
    }));
  }

  // 获取Token使用统计
  getTokenUsageStats() {
    const stats = {
      totalTokens: this.tokens.length,
      activeTokens: this.tokens.filter(t => t.status === 'active').length,
      inactiveTokens: this.tokens.filter(t => t.status === 'inactive').length,
      totalUsage: this.tokens.reduce((sum, token) => sum + token.usageCount, 0),
      averageUsage: this.tokens.length > 0 ? 
        Math.round(this.tokens.reduce((sum, token) => sum + token.usageCount, 0) / this.tokens.length) : 0,
      mostUsedToken: null,
      leastUsedToken: null
    };

    if (this.tokens.length > 0) {
      // 找到使用最多的Token
      stats.mostUsedToken = this.tokens.reduce((max, token) => 
        token.usageCount > max.usageCount ? token : max
      );
      // 找到使用最少的Token
      stats.leastUsedToken = this.tokens.reduce((min, token) => 
        token.usageCount < min.usageCount ? token : min
      );
    }

    return stats;
  }

  clearTokens() {
    this.tokens = [];
    // 保存Token状态
    this.saveTokens();
    return '所有token已清除';
  }

  // 获取Token详细信息
  getTokenDetails(token) {
    return this.tokens.find(t => t.token === token);
  }

  // 获取指定模型的可用Token数量
  getAvailableTokensByModel(model) {
    return this.tokens.filter(t => 
      t.status === 'active' && 
      t.healthStatus !== 'unhealthy' && 
      t.model === model
    ).length;
  }
}

module.exports = TokenManager;