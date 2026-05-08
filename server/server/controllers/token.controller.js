/**
 * Token控制器
 * 处理Token的CRUD操作和健康检查
 * 重构后：通过 ServiceContainer 依赖注入
 */
class TokenController {
  constructor(container) {
    // 从容器中获取所需服务，实现依赖注入解耦
    this.tokenManager = container.get('tokenManager');
  }

  /**
   * 获取Token列表
   */
  getTokenList(_req, res) {
    const tokens = this.tokenManager.getTokenList();
    res.success({ tokens });
  }

  /**
   * 添加Token
   */
  addToken(req, res) {
    const { token, provider, model } = req.body;
    const result = this.tokenManager.addToken(token, provider, model);
    res.success({ result });
  }

  /**
   * 删除Token
   */
  removeToken(req, res) {
    const { token } = req.body;
    const result = this.tokenManager.removeToken(token);
    res.success({ result });
  }

  /**
   * 更新Token信息
   */
  updateTokenInfo(req, res) {
    const { token, newToken, provider, model } = req.body;
    const result = this.tokenManager.updateTokenInfo(token, newToken, provider, model);
    res.success({ result });
  }

  /**
   * 更新Token状态
   */
  updateTokenStatus(req, res) {
    const { token, status } = req.body;
    const result = this.tokenManager.updateTokenStatus(token, status);
    res.success({ result });
  }

  /**
   * 清除所有Token
   */
  clearTokens(_req, res) {
    const result = this.tokenManager.clearTokens();
    res.success({ result });
  }
}

module.exports = TokenController;
