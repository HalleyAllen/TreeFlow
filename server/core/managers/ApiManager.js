/**
 * API管理模块
 * 处理与AI服务提供商的API调用
 */
const logger = require('../utils/logger');
const fetch = require('node-fetch');
const OpenAI = require('openai');

/**
 * 构造统一的 AbortError（OpenAI SDK 中止时抛出的是 APIUserAbortError，需归一化）
 */
function createAbortError() {
  const err = new Error('请求已中止');
  err.name = 'AbortError';
  return err;
}

const isAbort = (error, signal) =>
  error.name === 'AbortError' || error.name === 'APIUserAbortError' || !!signal?.aborted;

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
   * 从响应对象中按路径提取内容（支持 choices[0].message.content 形式）
   * @param {Object} data - 响应对象
   * @param {string} path - 点分路径
   * @returns {*} - 提取结果，路径无效时返回 undefined
   */
  extractResponse(data, path) {
    const parts = path.split('.');
    let result = data;
    for (const part of parts) {
      // 处理数组索引，如 choices[0]
      const match = part.match(/(\w+)\[(\d+)\]/);
      if (match) {
        const [, key, index] = match;
        result = result?.[key]?.[parseInt(index)];
      } else {
        result = result?.[part];
      }
      if (result === undefined) {
        break;
      }
    }
    return result;
  }

  /**
   * 构建通用API请求（URL/请求头/请求体），供流式与非流式共用
   * @private
   */
  buildGenericRequest(question, model, provider, conversationHistory = []) {
    // 获取提供商配置，默认使用default提供商
    const providerConfig = this.providers[provider] || this.providers[this.providers.default];
    if (!providerConfig) {
      throw new Error(`找不到提供商配置: ${provider}`);
    }

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

    return { providerConfig, apiUrl, headers, requestBody };
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
      const { providerConfig, apiUrl, headers, requestBody } = this.buildGenericRequest(question, model, provider, conversationHistory);

      logger.info('ApiManager', '使用通用API', { provider, model, apiUrl: providerConfig.apiUrl });

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

      const responseContent = this.extractResponse(data, providerConfig.responsePath);
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
   * 消费 SSE 流：逐个解析 data: 字段并回调
   * @param {Stream} body - 可异步迭代的响应体
   * @param {(dataStr: string) => void} onData - 每条 data 消息的回调
   */
  async consumeSSEStream(body, onData) {
    let buffer = '';
    for await (const chunk of body) {
      buffer += chunk.toString();
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const dataLines = rawEvent.split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim());
        if (dataLines.length === 0) continue;
        const dataStr = dataLines.join('\n');
        if (dataStr === '[DONE]') return;
        onData(dataStr);
      }
    }
  }

  /**
   * 通用API流式调用：请求加 stream: true 并解析 SSE；
   * 提供商不支持流式（请求失败/未返回SSE）时自动回退非流式并一次性下发全文
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} provider - 提供商名称
   * @param {Array} [conversationHistory] - 对话历史
   * @param {(delta: string, full: string) => void} onDelta - 增量回调
   * @param {AbortSignal} [signal] - 中止信号
   * @returns {string} - AI的完整回答
   */
  async askGenericAPIStream(question, model, provider, conversationHistory = [], onDelta, signal) {
    const { providerConfig, apiUrl, headers, requestBody } = this.buildGenericRequest(question, model, provider, conversationHistory);

    // 字符串模板请求体无法安全注入 stream 参数，直接走非流式
    if (typeof requestBody !== 'object' || requestBody === null) {
      const full = await this.askGenericAPI(question, model, provider, conversationHistory);
      onDelta(full, full);
      return full;
    }

    logger.info('ApiManager', '使用通用API（流式）', { provider, model, apiUrl });

    const response = await fetch(apiUrl, {
      method: providerConfig.method,
      headers: headers,
      body: JSON.stringify({ ...requestBody, stream: true }),
      signal
    });

    if (!response.ok) {
      // 提供商可能不支持流式：回退到非流式，一次性下发全文
      logger.warn('ApiManager', '流式请求失败，回退非流式', { provider, model, status: response.status });
      const full = await this.askGenericAPI(question, model, provider, conversationHistory);
      onDelta(full, full);
      return full;
    }

    // delta 路径：把 responsePath 中的 message 替换为 delta（choices[0].message.content → choices[0].delta.content）
    const deltaPath = providerConfig.responsePath.replace('message', 'delta');
    let full = '';
    await this.consumeSSEStream(response.body, (dataStr) => {
      let data;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }
      const delta = this.extractResponse(data, deltaPath) ?? this.extractResponse(data, providerConfig.responsePath) ?? '';
      if (delta) {
        full += delta;
        onDelta(delta, full);
      }
    });

    // 响应不是 SSE（提供商忽略了 stream 参数）：回退非流式
    if (!full) {
      logger.warn('ApiManager', '流式响应为空，回退非流式', { provider, model });
      const fallback = await this.askGenericAPI(question, model, provider, conversationHistory);
      onDelta(fallback, fallback);
      return fallback;
    }

    if (signal?.aborted) throw createAbortError();

    logger.info('ApiManager', '通用API流式请求成功', { provider, model, responseLength: full.length });
    return full;
  }

  /**
   * Ollama 流式调用（NDJSON 格式，每行一个 JSON 对象）
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} ollamaBaseUrl - Ollama基础URL
   * @param {Array} [conversationHistory] - 对话历史
   * @param {(delta: string, full: string) => void} onDelta - 增量回调
   * @param {AbortSignal} [signal] - 中止信号
   * @returns {string} - AI的完整回答
   */
  async askOllamaStream(question, model, ollamaBaseUrl, conversationHistory = [], onDelta, signal) {
    try {
      const modelName = model.replace('ollama/', '');
      logger.info('ApiManager', '调用Ollama API（流式）', { model: modelName, url: ollamaBaseUrl });

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
          stream: true
        }),
        signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('ApiManager', 'Ollama流式请求失败:', { status: response.status, statusText: response.statusText, error: errorText, url: ollamaBaseUrl });
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }

      let buffer = '';
      let full = '';
      for await (const chunk of response.body) {
        buffer += chunk.toString();
        let sep;
        while ((sep = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, sep).trim();
          buffer = buffer.slice(sep + 1);
          if (!line) continue;
          let data;
          try {
            data = JSON.parse(line);
          } catch {
            continue;
          }
          const delta = data.message?.content || '';
          if (delta) {
            full += delta;
            onDelta(delta, full);
          }
          if (data.done) return full;
        }
      }
      return full;
    } catch (error) {
      if (isAbort(error, signal)) throw createAbortError();
      logger.error('ApiManager', 'Ollama流式请求失败:', { error: error.message, url: ollamaBaseUrl });
      throw new Error(`Ollama请求失败: ${error.message}`);
    }
  }

  /**
   * OpenAI 兼容接口流式调用（阿里云百炼、OpenAI、专属接入点等）
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} token - API密钥
   * @param {string} baseUrl - OpenAI兼容接口基础地址
   * @param {Array} [conversationHistory] - 对话历史
   * @param {(delta: string, full: string) => void} onDelta - 增量回调
   * @param {AbortSignal} [signal] - 中止信号
   * @returns {string} - AI的完整回答
   */
  async askOpenAICompatStream(question, model, token, baseUrl, conversationHistory = [], onDelta, signal) {
    try {
      logger.info('ApiManager', '使用OpenAI兼容接口调用（流式）', { model, baseUrl });

      const openai = new OpenAI({
        apiKey: token,
        baseURL: baseUrl
      });

      const messages = [
        ...conversationHistory,
        { role: 'user', content: question }
      ];

      const stream = await openai.chat.completions.create(
        {
          model: model,
          messages: messages,
          stream: true
        },
        { signal }
      );

      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || '';
        if (delta) {
          full += delta;
          onDelta(delta, full);
        }
      }

      // OpenAI SDK 中止时可能不抛错而是静默结束迭代，此处兜底判断
      if (signal?.aborted) throw createAbortError();

      logger.info('ApiManager', 'OpenAI兼容流式请求成功', { model, responseLength: full.length });
      return full;
    } catch (error) {
      if (isAbort(error, signal)) throw createAbortError();
      logger.error('ApiManager', 'OpenAI兼容流式请求失败:', {
        error: error.message,
        model,
        baseUrl,
        errorType: error.name,
        errorCode: error.code
      });
      throw new Error(`AI请求失败: ${error.message}`);
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
   * 使用OpenAI兼容接口调用AI服务（可指定 baseURL）
   * 适用于阿里云百炼、OpenAI、以及自带专属接入点的服务（如百炼 Agent 工作空间）
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} token - API密钥
   * @param {string} baseUrl - OpenAI兼容接口基础地址（如 https://xxx/compatible-mode/v1）
   * @param {Array} [conversationHistory] - 对话历史
   * @returns {string} - AI的回答
   */
  async askOpenAICompat(question, model, token, baseUrl, conversationHistory = []) {
    try {
      logger.info('ApiManager', '使用OpenAI兼容接口调用', { model, baseUrl });

      const openai = new OpenAI({
        apiKey: token,
        baseURL: baseUrl
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
      logger.info('ApiManager', 'OpenAI兼容请求成功', { model, responseLength: response.length, response: response.substring(0, 20) + '...' });
      return response;
    } catch (error) {
      logger.error('ApiManager', 'OpenAI兼容请求失败:', {
        error: error.message,
        model,
        baseUrl,
        errorType: error.name,
        errorCode: error.code
      });
      throw new Error(`AI请求失败: ${error.message}`);
    }
  }

  /**
   * 使用OpenAI SDK调用阿里云百炼 API（dashscope 兼容模式）
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} token - API密钥
   * @param {Array} [conversationHistory] - 对话历史
   * @returns {string} - AI的回答
   */
  async askAliyunWithOpenAI(question, model, token, conversationHistory = []) {
    try {
      logger.info('ApiManager', '使用OpenAI SDK调用阿里云', { model });
      const response = await this.askOpenAICompat(
        question,
        model,
        token,
        'https://dashscope.aliyuncs.com/compatible-mode/v1',
        conversationHistory
      );
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
        } else if (provider === '阿里云百炼Agent') {
          // 百炼 Agent 工作空间：每个 key 有专属的 OpenAI 兼容接入地址（baseUrl）
          const entry = this.tokenManager.getTokenEntryForProvider(model, provider);
          if (!entry) {
            throw new Error(`找不到可用的「${provider}」Token，请在 AI 服务管理中为模型 ${model} 添加 Key`);
          }
          if (!entry.baseUrl) {
            throw new Error('「阿里云百炼Agent」需要配置 Base URL 接入地址，请在 AI 服务管理中编辑该 Key 后重试');
          }
          aiResponse = await this.askOpenAICompat(question, model, entry.token, entry.baseUrl, conversationHistory);
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
   * 发送AI流式请求 - 与 ask 相同的提供商路由，但以增量回调方式输出
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @param {string} ollamaBaseUrl - Ollama基础URL
   * @param {Array} [conversationHistory] - 对话历史
   * @param {string} [explicitProvider] - 显式指定的供应商（可选）
   * @param {(delta: string, full: string) => void} [onDelta] - 增量回调
   * @param {AbortSignal} [signal] - 中止信号（客户端断开时中止上游请求）
   * @returns {string} - AI的完整回答
   */
  async askStream(question, model, ollamaBaseUrl, conversationHistory = [], explicitProvider = null, onDelta = () => {}, signal = null) {
    try {
      logger.info('ApiManager', '开始AI流式请求', { model, question: question.substring(0, 50) + '...', historyLength: conversationHistory.length });
      let aiResponse;

      // 检查当前模型是否是ollama模型
      if (model.startsWith('ollama/')) {
        logger.info('ApiManager', '使用Ollama API（流式）');
        aiResponse = await this.askOllamaStream(question, model, ollamaBaseUrl, conversationHistory, onDelta, signal);
      } else {
        // 使用显式指定的供应商，或根据模型类型推断
        const provider = explicitProvider || this.getModelInfo(model).provider;
        logger.info('ApiManager', '使用API（流式）', { provider, model, source: explicitProvider ? 'explicit' : 'inferred' });

        // 阿里云使用OpenAI SDK
        if (provider === '阿里云') {
          const token = this.tokenManager.getTokenByModel(model);
          aiResponse = await this.askOpenAICompatStream(
            question, model, token,
            'https://dashscope.aliyuncs.com/compatible-mode/v1',
            conversationHistory, onDelta, signal
          );
        } else if (provider === '阿里云百炼Agent') {
          // 百炼 Agent 工作空间：每个 key 有专属的 OpenAI 兼容接入地址（baseUrl）
          const entry = this.tokenManager.getTokenEntryForProvider(model, provider);
          if (!entry) {
            throw new Error(`找不到可用的「${provider}」Token，请在 AI 服务管理中为模型 ${model} 添加 Key`);
          }
          if (!entry.baseUrl) {
            throw new Error('「阿里云百炼Agent」需要配置 Base URL 接入地址，请在 AI 服务管理中编辑该 Key 后重试');
          }
          aiResponse = await this.askOpenAICompatStream(question, model, entry.token, entry.baseUrl, conversationHistory, onDelta, signal);
        } else {
          // 其他提供商使用通用fetch方法（含流式回退）
          aiResponse = await this.askGenericAPIStream(question, model, provider, conversationHistory, onDelta, signal);
        }
      }

      logger.info('ApiManager', 'AI流式请求成功', { responseLength: aiResponse.length });
      return aiResponse;
    } catch (error) {
      // 中止错误直接向上传递，由调用方决定节点状态
      if (error.name === 'AbortError') throw error;
      logger.error('ApiManager', 'AI流式请求失败:', { error: error.message });
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
