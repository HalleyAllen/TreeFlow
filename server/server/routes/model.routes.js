/**
 * 模型路由
 * 处理模型列表和当前模型设置
 * 重构后：从 ServiceContainer 获取依赖，不再直接访问 agent 内部属性
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../../core/utils/logger');
const fetch = require('node-fetch');

/**
 * 创建路由时传入容器
 * @param {ServiceContainer} container - 依赖注入容器
 */
module.exports = (container) => {
  // 从容器中获取所需服务
  const tokenManager = container.get('tokenManager');
  const configManager = container.get('configManager');

  // 获取可用模型列表
  router.get('/', asyncHandler(async (req, res) => {
    // 从token中提取可用的模型
    const tokens = tokenManager.tokens;
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
    const config = configManager.getConfig();
    if (config.ollamaEnabled) {
      try {
        const ollamaResponse = await fetch(`${config.ollamaBaseUrl}/api/tags`);
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
    configManager.setCurrentModel(model);
    res.success({ result: `当前模型已设置为: ${model}` });
  }));

  // 获取当前模型
  router.get('/current', asyncHandler(async (req, res) => {
    const model = configManager.getCurrentModel();
    res.success({ model });
  }));

  return router;
};
