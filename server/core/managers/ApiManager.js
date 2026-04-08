/**
 * API管理模块
 * 处理与AI服务提供商的API调用
 */
const logger = require('../utils/logger');
const fetch = require('node-fetch');
const OpenAI = require('openai');

class ApiManager {
  constructor(providers, tokenManager) {
    this.providers = providers;
    this.tokenManager = tokenManager;
  }

  /**
   * 获取模型信息
   * @param {string} model - 模型名称
   * @returns {Object} - 模型信息，包含提供商和模型名称
   */
  getModelInfo(model) {
    // 根据模型名称判断提供商
    if (model.includes('gpt')) {
      return { provider: 'OpenAI', model: model };
    } else if (model.includes('qwen') || model.includes('qvq') || model.startsWith('qwen-') || model.startsWith('qvq-')) {
      // 阿里云通义系列：qwen, qvq 等
      return { provider: '阿里云', model: model };
    } else {
      // 默认返回OpenAI
      return { provider: 'OpenAI', model: model };
    }
  }

  /**
   * 调用通用API方法
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} provider - 提供商名称
   * @param {Array} [conversationHistory] - 对话历史 [{role, content}]
   * @returns {string} - AI的回答
   */
  async askGenericAPI(question, model, provider, conversationHistory = []) {
    try {
      // 获取提供商配置，默认使用default提供商
      const providerConfig = this.providers[provider] || this.providers[this.providers.default];
      if (!providerConfig) {
        throw new Error(`找不到提供商配置: ${provider}`);
      }
      
      logger.info('ApiManager', '使用通用API', { provider, model, apiUrl: providerConfig.apiUrl });
      
      // 根据当前模型获取合适的Token
      const token = this.tokenManager.getTokenByModel(model);
      logger.info('ApiManager', '获取Token成功', { provider, tokenPrefix: token ? token.substring(0, 10) + '...' : 'null' });
      
      // 替换占位符
      const replacePlaceholders = (str) => {
        return str
          .replace('{{token}}', token)
          .replace('{{model}}', model)
          .replace('{{question}}', question);
      };
      
      // 处理API URL
      const apiUrl = replacePlaceholders(providerConfig.apiUrl);
      
      // 处理请求头
      const headers = {};
      for (const [key, value] of Object.entries(providerConfig.headers)) {
        headers[key] = replacePlaceholders(value);
      }
      
      // 构建消息数组（支持对话历史）
      const messages = [
        ...conversationHistory,
        { role: 'user', content: question }
      ];

      // 处理请求体
      const processRequestBody = (body) => {
        if (typeof body === 'string') {
          return replacePlaceholders(body);
        } else if (typeof body === 'object' && body !== null) {
          const processedBody = {};
          for (const [key, value] of Object.entries(body)) {
            // 如果是 messages 字段且有对话历史，使用完整历史
            if (key === 'messages' && Array.isArray(value) && conversationHistory.length > 0) {
              processedBody[key] = messages;
            } else {
              processedBody[key] = processRequestBody(value);
            }
          }
          return processedBody;
        } else {
          return body;
        }
      };
      
      const requestBody = processRequestBody(providerConfig.requestBody);
      
      // 发送请求
      logger.info('ApiManager', '发送请求', { 
        url: apiUrl, 
        provider, 
        model,
        headers: Object.keys(headers),
        bodyKeys: Object.keys(requestBody)
      });
      
      const response = await fetch(apiUrl, {
        method: providerConfig.method,
        headers: headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ApiManager', 'API请求失败:', { 
          status: response.status, 
          statusText: response.statusText, 
          error: errorText, 
          url: apiUrl,
          provider,
          requestBody: JSON.stringify(requestBody).substring(0, 200)
        });
        throw new Error(`${provider} API请求失败: ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json();
      logger.info('ApiManager', 'API请求成功', { provider });
      
      // 提取响应内容
      const extractResponse = (data, path) => {
        const parts = path.split('.');
        let result = data;
        for (const part of parts) {
          // 处理数组索引，如 choices[0]
          const match = part.match(/(\w+)\[(\d+)\]/);
          if (match) {
            const [, key, index] = match;
            result = result[key][parseInt(index)];
          } else {
            result = result[part];
          }
          if (result === undefined) {
            break;
          }
        }
        return result;
      };
      
      const responseContent = extractResponse(data, providerConfig.responsePath);
      if (responseContent === undefined) {
        throw new Error(`无法从响应中提取内容，路径: ${providerConfig.responsePath}`);
      }
      
      return responseContent;
    } catch (error) {
      logger.error('ApiManager', '通用API请求失败:', { 
        error: error.message, 
        provider, 
        model,
        errorType: error.name,
        errorCode: error.code
      });
      throw new Error(`${provider}请求失败: ${error.message}`);
    }
  }

  /**
   * 调用Ollama API
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} ollamaBaseUrl - Ollama基础URL
   * @param {Array} [conversationHistory] - 对话历史
   * @returns {string} - AI的回答
   */
  async askOllama(question, model, ollamaBaseUrl, conversationHistory = []) {
    try {
      const modelName = model.replace('ollama/', '');
      logger.info('ApiManager', '调用Ollama API', { model: modelName, url: ollamaBaseUrl });

      const messages = [
        ...conversationHistory,
        { role: 'user', content: question }
      ];

      const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ApiManager', 'Ollama API请求失败:', { status: response.status, statusText: response.statusText, error: errorText, url: ollamaBaseUrl });
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('ApiManager', 'Ollama API请求成功');
      return data.message.content;
    } catch (error) {
      logger.error('ApiManager', 'Ollama请求失败:', { error: error.message, url: ollamaBaseUrl });
      throw new Error(`Ollama请求失败: ${error.message}`);
    }
  }

  /**
   * 使用OpenAI SDK调用阿里云API
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} token - API密钥
   * @param {Array} [conversationHistory] - 对话历史
   * @returns {string} - AI的回答
   */
  async askAliyunWithOpenAI(question, model, token, conversationHistory = []) {
    try {
      logger.info('ApiManager', '使用OpenAI SDK调用阿里云', { model });
      
      const openai = new OpenAI({
        apiKey: token,
        baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      });

      const messages = [
        ...conversationHistory,
        { role: 'user', content: question }
      ];

      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages
      });

      const response = completion.choices[0].message.content;
      logger.info('ApiManager', '阿里云请求成功', { model, responseLength: response.length,response: response.substring(0, 20) + '...'});
      return response;
    } catch (error) {
      logger.error('ApiManager', '阿里云OpenAI SDK请求失败:', { 
        error: error.message,
        model,
        errorType: error.name,
        errorCode: error.code
      });
      throw new Error(`阿里云请求失败: ${error.message}`);
    }
  }

  /**
   * 发送AI请求
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} ollamaBaseUrl - Ollama基础URL
   * @param {Array} [conversationHistory] - 对话历史
   * @param {string} [explicitProvider] - 显式指定的供应商（可选）
   * @returns {string} - AI的回答
   */
  async ask(question, model, ollamaBaseUrl, conversationHistory = [], explicitProvider = null) {
    try {
      logger.info('ApiManager', '开始AI请求', { model, question: question.substring(0, 50) + '...', historyLength: conversationHistory.length });
      let aiResponse;

      // 检查当前模型是否是ollama模型
      if (model.startsWith('ollama/')) {
        // 使用ollama API
        logger.info('ApiManager', '使用Ollama API');
        aiResponse = await this.askOllama(question, model, ollamaBaseUrl, conversationHistory);
      } else {
        // 使用显式指定的供应商，或根据模型类型推断
        const provider = explicitProvider || this.getModelInfo(model).provider;
        logger.info('ApiManager', '使用API', { provider, model, source: explicitProvider ? 'explicit' : 'inferred' });
        
        // 阿里云使用OpenAI SDK
        if (provider === '阿里云') {
          const token = this.tokenManager.getTokenByModel(model);
          aiResponse = await this.askAliyunWithOpenAI(question, model, token, conversationHistory);
        } else {
          // 其他提供商使用通用fetch方法
          aiResponse = await this.askGenericAPI(question, model, provider, conversationHistory);
        }
      }

      logger.info('ApiManager', 'AI请求成功', { responseLength: aiResponse.length });
      return aiResponse;
    } catch (error) {
      logger.error('ApiManager', 'AI请求失败:', { error: error.message });
      throw new Error(`AI请求失败: ${error.message}`);
    }
  }

  /**
   * 更新提供商配置
   * @param {Object} providers - 提供商配置
   */
  updateProviders(providers) {
    this.providers = providers;
    logger.info('ApiManager', '更新提供商配置', { providers: Object.keys(providers) });
  }
}

module.exports = ApiManager;
