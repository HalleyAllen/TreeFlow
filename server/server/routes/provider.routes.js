/**
 * 提供商路由
 * 处理AI提供商配置
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const fetch = require('node-fetch');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  // 获取所有提供商配置
  router.get('/', asyncHandler(async (req, res) => {
    const providers = agent.configManager.getProviders();
    // 脱敏：不返回包含 token 的 headers
    const sanitized = {};
    for (const [name, config] of Object.entries(providers)) {
      if (name === 'default') { 
        sanitized[name] = config; 
        continue; 
      }
      sanitized[name] = { ...config };
    }
    res.success({ providers: sanitized });
  }));

  // 添加/更新自定义提供商
  router.post('/', asyncHandler(async (req, res) => {
    const { name, config } = req.body;
    if (!name || !config) {
      return res.error('缺少 name 或 config 参数', 400, 'MISSING_PARAMS');
    }
    const providers = agent.configManager.getProviders();
    providers[name] = config;
    agent.updateProviders(providers);
    res.success({ result: `提供商 "${name}" 已保存` });
  }));

  // 删除自定义提供商
  router.delete('/:name', asyncHandler(async (req, res) => {
    const { name } = req.params;
    const providers = agent.configManager.getProviders();
    if (!providers[name]) {
      return res.error(`提供商 "${name}" 不存在`, 404, 'NOT_FOUND');
    }
    delete providers[name];
    agent.updateProviders(providers);
    res.success({ result: `提供商 "${name}" 已删除` });
  }));

  // 测试提供商连接
  router.post('/test', asyncHandler(async (req, res) => {
    const { config, token, model } = req.body;
    if (!config) {
      return res.error('缺少 config 参数', 400, 'MISSING_CONFIG');
    }
    const testToken = token || 'test';
    const testModel = model || 'test-model';
    const testQuestion = 'Hello';

    const replacePlaceholders = (str) => {
      return str.replace(/\{\{token\}\}/g, testToken).replace(/\{\{model\}\}/g, testModel).replace(/\{\{question\}\}/g, testQuestion);
    };

    const apiUrl = replacePlaceholders(config.apiUrl);
    const headers = {};
    for (const [key, value] of Object.entries(config.headers || {})) {
      headers[key] = replacePlaceholders(value);
    }

    let requestBody = config.requestBody || {};
    if (typeof requestBody === 'object') {
      const processBody = (body) => {
        if (typeof body === 'string') return replacePlaceholders(body);
        if (typeof body === 'object' && body !== null) {
          const result = {};
          for (const [k, v] of Object.entries(body)) result[k] = processBody(v);
          return result;
        }
        return body;
      };
      requestBody = processBody(requestBody);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(apiUrl, {
        method: config.method || 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeout);

      const data = await response.text();
      res.success({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        body: data.substring(0, 500)
      });
    } catch (error) {
      clearTimeout(timeout);
      res.success({
        success: false,
        error: error.name === 'AbortError' ? '连接超时（8秒）' : error.message
      });
    }
  }));

  return router;
};
