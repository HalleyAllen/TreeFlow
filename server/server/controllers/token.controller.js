/**
 * Token控制器
 * 处理Token的CRUD操作和健康检查
 */
class TokenController {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * 获取Token列表
   */
  getTokenList(req, res) {
    const tokens = this.agent.getTokenList();
    res.success({ tokens });
  }

  /**
   * 添加Token
   */
  addToken(req, res) {
    const { token, provider, model } = req.body;
    const result = this.agent.addToken(token, provider, model);
    res.success({ result });
  }

  /**
   * 删除Token
   */
  removeToken(req, res) {
    const { token } = req.body;
    const result = this.agent.tokenManager.removeToken(token);
    res.success({ result });
  }

  /**
   * 更新Token信息
   */
  updateTokenInfo(req, res) {
    const { token, newToken, provider, model } = req.body;
    const result = this.agent.updateTokenInfo(token, newToken, provider, model);
    res.success({ result });
  }

  /**
   * 更新Token状态
   */
  updateTokenStatus(req, res) {
    const { token, status } = req.body;
    const result = this.agent.updateTokenStatus(token, status);
    res.success({ result });
  }

  /**
   * 清除所有Token
   */
  clearTokens(req, res) {
    const result = this.agent.clearTokens();
    res.success({ result });
  }

  /**
   * 检查Token健康状态
   */
  async checkTokenHealth(req, res) {
    const { token } = req.body;
    const result = await this.agent.tokenManager.checkTokenHealth(token);
    res.success({ result });
  }

  /**
   * 批量检查所有Token健康状态
   */
  async checkAllTokensHealth(req, res) {
    const results = await this.agent.tokenManager.checkAllTokensHealth();
    res.success({ results });
  }

  /**
   * 获取Token使用统计
   */
  getTokenStats(req, res) {
    const stats = this.agent.getTokenStats();
    res.success({ stats });
  }

  /**
   * 获取指定模型的可用Token数量
   */
  getAvailableTokensByModel(req, res) {
    const { model } = req.params;
    const count = this.agent.tokenManager.getAvailableTokensByModel(model);
    res.success({ count });
  }
}

module.exports = TokenController;
