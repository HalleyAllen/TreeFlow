/**
 * Ollama路由
 * 处理本地Ollama模型配置和管理
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  // 获取Ollama配置
  router.get('/config', asyncHandler(async (req, res) => {
    res.success({ 
      url: agent.ollamaBaseUrl, 
      enabled: agent.ollamaEnabled 
    });
  }));

  // 设置Ollama URL
  router.post('/url', asyncHandler(async (req, res) => {
    const { url } = req.body;
    const result = agent.setOllamaBaseUrl(url);
    res.success({ result });
  }));

  // 设置Ollama启用状态
  router.post('/enabled', asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const result = agent.setOllamaEnabled(enabled);
    res.success({ result });
  }));

  // 检测Ollama连接状态
  router.get('/status', asyncHandler(async (req, res) => {
    try {
      const response = await fetch(`${agent.ollamaBaseUrl}/api/tags`, { 
        signal: AbortSignal.timeout(5000) 
      });
      if (response.ok) {
        res.success({ connected: true, message: 'Ollama服务正常' });
      } else {
        res.success({ connected: false, message: 'Ollama服务返回错误' });
      }
    } catch (error) {
      res.success({ 
        connected: false, 
        message: '无法连接到Ollama服务', 
        error: error.message 
      });
    }
  }));

  // 获取Ollama模型列表
  router.get('/models', asyncHandler(async (req, res) => {
    const response = await fetch(`${agent.ollamaBaseUrl}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      res.success({ models: data.models || [] });
    } else {
      res.error('无法获取Ollama模型列表', 500);
    }
  }));

  // 拉取Ollama模型
  router.post('/pull', asyncHandler(async (req, res) => {
    const { model } = req.body;
    if (!model) {
      return res.error('模型名称不能为空', 400);
    }

    const response = await fetch(`${agent.ollamaBaseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false })
    });

    if (response.ok) {
      const data = await response.json();
      res.success({ 
        result: `模型 ${model} 拉取成功`, 
        data 
      });
    } else {
      const errorText = await response.text();
      res.error(`拉取模型失败: ${errorText}`, 500);
    }
  }));

  // 删除Ollama模型
  router.delete('/models/:model', asyncHandler(async (req, res) => {
    const { model } = req.params;
    const response = await fetch(`${agent.ollamaBaseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model })
    });

    if (response.ok) {
      res.success({ result: `模型 ${model} 已删除` });
    } else {
      const errorText = await response.text();
      res.error(`删除模型失败: ${errorText}`, 500);
    }
  }));

  return router;
};
