/**
 * 主题路由
 * 处理主题切换
 * 重构后：从 ServiceContainer 获取依赖
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 创建路由时传入容器
 * @param {ServiceContainer} container - 依赖注入容器
 */
module.exports = (container) => {
  // 从容器中获取配置管理器
  const configManager = container.get('configManager');

  // 获取当前主题
  router.get('/', asyncHandler(async (_req, res) => {
    const theme = configManager.getTheme();
    res.success({ theme });
  }));

  // 设置主题
  router.post('/', asyncHandler(async (req, res) => {
    const { theme } = req.body;
    if (!theme || !['light', 'dark'].includes(theme)) {
      return res.error('无效的主题名称，只支持 light 或 dark', 400);
    }
    configManager.setTheme(theme);
    res.success({ 
      result: `主题已设置为: ${theme === 'light' ? '浅色' : '深色'}主题` 
    });
  }));

  return router;
};
