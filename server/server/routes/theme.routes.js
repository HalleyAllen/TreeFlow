/**
 * 主题路由
 * 处理主题切换
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  // 获取当前主题
  router.get('/', asyncHandler(async (req, res) => {
    const theme = agent.getTheme();
    res.success({ theme });
  }));

  // 设置主题
  router.post('/', asyncHandler(async (req, res) => {
    const { theme } = req.body;
    if (!theme || !['light', 'dark'].includes(theme)) {
      return res.error('无效的主题名称，只支持 light 或 dark', 400);
    }
    agent.setTheme(theme);
    res.success({ 
      result: `主题已设置为: ${theme === 'light' ? '浅色' : '深色'}主题` 
    });
  }));

  return router;
};
