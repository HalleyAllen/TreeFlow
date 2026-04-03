/**
 * 模型路由
 * 处理模型列表和当前模型设置
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../../core/utils/logger');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  // 获取可用模型列表
  router.get('/', asyncHandler(async (req, res) => {
    // 从token中提取可用的模型
    const tokens = agent.tokenManager.tokens;
    const availableModels = [];

    tokens.forEach(token => {
      if (!availableModels.some(model => model.id === token.model)) {
        availableModels.push({
          id: token.model,
          name: `${token.provider} - ${token.model}`,
          available: true,
          provider: token.provider
        });
      }
    });

    // 添加ollama模型（如果启用）
    if (agent.ollamaEnabled) {
      try {
        const ollamaResponse = await fetch(`${agent.ollamaBaseUrl}/api/tags`);
        if (ollamaResponse.ok) {
          const data = await ollamaResponse.json();
          if (data.models && Array.isArray(data.models)) {
            data.models.forEach(model => {
              availableModels.push({
                id: `ollama/${model.name}`,
                name: `Ollama - ${model.name}`,
                available: true,
                provider: 'Ollama'
              });
            });
          }
        }
      } catch (error) {
        logger.warn('Model Routes', '无法获取ollama模型列表:', { error: error.message });
      }
    }

    // 添加默认模型（如果没有token）
    if (availableModels.length === 0) {
      availableModels.push(
        {
          id: 'gpt-3.5-turbo',
          name: 'OpenAI - gpt-3.5-turbo',
          available: false,
          provider: 'OpenAI',
          message: '需要添加OpenAI token'
        },
        {
          id: 'claude-3-opus-20240229',
          name: 'Anthropic - claude-3-opus-20240229',
          available: false,
          provider: 'Anthropic',
          message: '需要添加Anthropic token'
        },
        {
          id: 'gemini-pro',
          name: 'Google - gemini-pro',
          available: false,
          provider: 'Google',
          message: '需要添加Google token'
        }
      );
    }

    res.success({ models: availableModels });
  }));

  // 设置当前模型
  router.post('/current', asyncHandler(async (req, res) => {
    const { model } = req.body;
    const result = agent.setModel(model);
    res.success({ result });
  }));

  // 获取当前模型
  router.get('/current', asyncHandler(async (req, res) => {
    const model = agent.getModel();
    res.success({ model });
  }));

  return router;
};
