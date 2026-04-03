/**
 * Token路由
 * 处理Token的CRUD操作和健康检查
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const TokenController = require('../controllers/token.controller');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  const controller = new TokenController(agent);

  // 获取Token列表
  router.get('/', asyncHandler((req, res) => controller.getTokenList(req, res)));

  // 添加Token
  router.post('/', asyncHandler((req, res) => controller.addToken(req, res)));

  // 删除Token
  router.delete('/', asyncHandler((req, res) => controller.removeToken(req, res)));

  // 更新Token信息
  router.put('/info', asyncHandler((req, res) => controller.updateTokenInfo(req, res)));

  // 更新Token状态
  router.put('/status', asyncHandler((req, res) => controller.updateTokenStatus(req, res)));

  // 清除所有Token
  router.delete('/all', asyncHandler((req, res) => controller.clearTokens(req, res)));

  // 检查Token健康状态
  router.post('/check-health', asyncHandler((req, res) => controller.checkTokenHealth(req, res)));

  // 批量检查所有Token健康状态
  router.post('/check-all-health', asyncHandler((req, res) => controller.checkAllTokensHealth(req, res)));

  // 获取Token使用统计
  router.get('/stats', asyncHandler((req, res) => controller.getTokenStats(req, res)));

  // 获取指定模型的可用Token数量
  router.get('/available/:model', asyncHandler((req, res) => controller.getAvailableTokensByModel(req, res)));

  return router;
};
