/**
 * Ollama路由
 * 处理本地Ollama模型配置和管理（预留接口，暂未实现）
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  // 获取Ollama配置（预留）
  router.get('/config', asyncHandler(async (req, res) => {
    res.success({ url: '', enabled: false, message: '功能暂未实现' });
  }));

  // 设置Ollama URL（预留）
  router.post('/url', asyncHandler(async (req, res) => {
    res.success({ result: '功能暂未实现' });
  }));

  // 设置Ollama启用状态（预留）
  router.post('/enabled', asyncHandler(async (req, res) => {
    res.success({ result: '功能暂未实现' });
  }));

  // 检测Ollama连接状态（预留）
  router.get('/status', asyncHandler(async (req, res) => {
    res.success({ connected: false, message: '功能暂未实现' });
  }));

  // 获取Ollama模型列表（预留）
  router.get('/models', asyncHandler(async (req, res) => {
    res.success({ models: [], message: '功能暂未实现' });
  }));

  // 拉取Ollama模型（预留）
  router.post('/pull', asyncHandler(async (req, res) => {
    res.success({ result: '功能暂未实现' });
  }));

  // 删除Ollama模型（预留）
  router.delete('/models/:model', asyncHandler(async (req, res) => {
    res.success({ result: '功能暂未实现' });
  }));

  return router;
};
