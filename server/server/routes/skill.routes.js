/**
 * 技能路由
 * 处理AI技能系统（预留接口，暂未实现）
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
  // 获取技能列表（预留）
  router.get('/', asyncHandler(async (req, res) => {
    res.success({ skills: [], message: '功能暂未实现' });
  }));

  // 添加自定义技能（预留）
  router.post('/', asyncHandler(async (req, res) => {
    res.success({ result: '功能暂未实现' });
  }));

  // 删除技能（预留）
  router.delete('/:skillId', asyncHandler(async (req, res) => {
    res.success({ result: '功能暂未实现' });
  }));

  return router;
};
