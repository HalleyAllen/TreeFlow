/**
 * TokenHealthChecker 类 - Token 健康检测服务
 * 两步检测：
 *   1. Key 探测：GET 各服务商的「模型列表」接口，验证接入地址与 API Key 是否有效
 *   2. 模型探测：用该 Key 对指定模型发起一条极轻量的对话请求（max_tokens=8，内容仅 "ping"），
 *      验证模型真实可用（名称正确、未下线、Key 有调用权限）
 * 模型探测仅消耗约 1~8 个 token，成本可忽略。
 */
const fetch = require('node-fetch');

const TIMEOUT_MS = 8000; // 与 provider /test 保持一致：8 秒超时

// 已知服务商官方的 Key 探测端点（无自定义 Base URL 时使用）
const KEY_ENDPOINTS = {
  'OpenAI': 'https://api.openai.com/v1/models',
  '阿里云': 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
  'Anthropic': 'https://api.anthropic.com/v1/models',
  'Google': 'https://generativelanguage.googleapis.com/v1beta/models',
  '阿里云百炼Agent': null // 该服务商必须使用 key 专属的 Base URL
};

// 已知服务商官方的对话端点（无自定义 Base URL 时使用；Google 按模型拼接）
const CHAT_BASES = {
  'OpenAI': 'https://api.openai.com/v1',
  '阿里云': 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  'Anthropic': 'https://api.anthropic.com/v1',
  '阿里云百炼Agent': null // 必须使用 key 专属的 Base URL
};

const HTTP_HINTS = {
  401: '密钥无效或未授权',
  403: '密钥无权限访问该服务',
  404: '接入地址不正确或服务不支持该端点',
  408: '请求超时',
  429: '触发限流或账户额度不足',
  500: '服务端内部错误',
  502: '网关错误，服务可能暂时不可用',
  503: '服务暂时不可用'
};

// 模型探测使用的极轻量对话载荷
const PING_MESSAGES = [
  { role: 'user', content: 'ping' }
];

class TokenHealthChecker {
  /**
   * 检测单个 Token（Key 有效性 + 指定模型可用性）
   * @param {Object} entry - Token 条目 { token, provider, model, baseUrl }
   * @returns {Promise<{ok, healthStatus, keyOk, modelOk, status, message, latencyMs}>}
   *   healthStatus: 'ok' | 'warn' | 'fail'
   *   keyOk: boolean | null
   *   modelOk: boolean | null
   */
  static async check(entry) {
    // ===== 阶段一：Key 探测 =====
    const keyReq = this.buildKeyRequest(entry);
    if (!keyReq) {
      return {
        ok: false,
        healthStatus: 'fail',
        keyOk: false,
        modelOk: null,
        status: null,
        latencyMs: 0,
        message: this.missingAddressReason(entry.provider)
      };
    }

    const keyRes = await this.httpProbe(keyReq.url, { headers: keyReq.headers });

    if (keyRes.networkError) {
      return {
        ok: false,
        healthStatus: 'warn',
        keyOk: false,
        modelOk: null,
        status: null,
        latencyMs: keyRes.latencyMs,
        message: this.describeNetworkError(keyRes.networkError)
      };
    }

    if (!keyRes.ok) {
      // Key / 端点探测失败，分类给出提示
      const classify = this.classifyHttp(keyRes.status, keyRes.detail, '探测 Key');
      return {
        ok: false,
        healthStatus: classify.status,
        keyOk: false,
        modelOk: null,
        status: keyRes.status,
        latencyMs: keyRes.latencyMs,
        message: classify.message
      };
    }

    // Key 有效（HTTP 2xx）：顺带提取该 Key 可调用的模型列表（用于诊断）
    const modelsAvailable = this.extractModels(keyRes.bodyText);

    if (!entry.model) {
      return {
        ok: false,
        healthStatus: 'warn',
        keyOk: true,
        modelOk: null,
        status: keyRes.status,
        latencyMs: keyRes.latencyMs,
        message: `Key 有效（${keyRes.latencyMs}ms）· 未配置模型，无法检测模型可用性`
      };
    }

    // ===== 阶段二：模型探测（真实轻量对话） =====
    const chatReq = this.buildChatRequest(entry);
    if (!chatReq) {
      return {
        ok: false,
        healthStatus: 'warn',
        keyOk: true,
        modelOk: null,
        status: keyRes.status,
        latencyMs: keyRes.latencyMs,
        message: `Key 有效（${keyRes.latencyMs}ms）· 该服务商需配置 Base URL 后才能检测模型`
      };
    }

    const chatRes = await this.httpProbe(chatReq.url, {
      method: 'POST',
      headers: chatReq.headers,
      body: JSON.stringify(chatReq.body)
    });

    const model = entry.model;
    if (chatRes.networkError) {
      return {
        ok: false,
        healthStatus: 'warn',
        keyOk: true,
        modelOk: null,
        status: null,
        latencyMs: chatRes.latencyMs,
        message: `Key 有效 · 模型「${model}」探测失败：${this.describeNetworkError(chatRes.networkError)}`
      };
    }

    if (chatRes.ok) {
      return {
        ok: true,
        healthStatus: 'ok',
        keyOk: true,
        modelOk: true,
        status: chatRes.status,
        latencyMs: chatRes.latencyMs,
        message: `Key 有效 · 模型「${model}」可用（${chatRes.latencyMs}ms）`
      };
    }

    // 模型对话请求被拒绝：区分 Key 权限问题 / 模型不可用 / 暂时无法验证
    const classify = this.classifyChatError(chatRes.status, chatRes.detail, model);
    let message = classify.message;
    // 当确认为模型名/调用权限问题时，附加该 Key 实际可调用的模型列表，便于用户快速修正
    if (modelsAvailable.length > 0 && !modelsAvailable.includes(model)) {
      if (classify.modelOk === false || (classify.keyOk === false && classify.status === 'fail')) {
        const shown = modelsAvailable.slice(0, 6).join('、');
        message += `（当前该 Key 可调用：${shown}${modelsAvailable.length > 6 ? ` 等 ${modelsAvailable.length} 个` : ''}）`;
      }
    }
    return {
      ok: false,
      healthStatus: classify.status,
      keyOk: classify.keyOk,
      modelOk: classify.modelOk,
      status: chatRes.status,
      latencyMs: chatRes.latencyMs,
      message
    };
  }

  // ============================================================
  // 请求构造
  // ============================================================

  /**
   * 阶段一：Key 探测请求（GET 模型列表）
   * @returns {null | {url, headers}}
   */
  static buildKeyRequest({ token, provider, baseUrl }) {
    if (!token) return null;
    const headers = { Accept: 'application/json' };

    // Anthropic：官方接口使用 x-api-key 鉴权
    if (provider === 'Anthropic' && !baseUrl) {
      headers['x-api-key'] = token;
      headers['anthropic-version'] = '2023-06-01';
      return { url: KEY_ENDPOINTS.Anthropic, headers };
    }

    // Google Gemini：官方接口使用 URL 参数传 key
    if (provider === 'Google' && !baseUrl) {
      return {
        url: `${KEY_ENDPOINTS.Google}?key=${encodeURIComponent(token)}`,
        headers
      };
    }

    // 其余服务商统一走 OpenAI 兼容 Bearer 鉴权；优先使用自定义 Base URL
    let url = null;
    if (baseUrl) {
      url = `${String(baseUrl).replace(/\/+$/, '')}/models`;
    } else {
      const endpoint = KEY_ENDPOINTS[provider];
      if (endpoint) {
        url = endpoint;
      } else {
        return null; // 未知服务商且无 Base URL，无法探测
      }
    }
    headers['Authorization'] = `Bearer ${token}`;
    return { url, headers };
  }

  /**
   * 阶段二：模型探测请求（POST 轻量对话）
   * @returns {null | {url, headers, body}}
   */
  static buildChatRequest({ token, provider, model, baseUrl }) {
    if (!token || !model) return null;

    // Anthropic：POST /v1/messages
    if (provider === 'Anthropic' && !baseUrl) {
      return {
        url: `${CHAT_BASES.Anthropic}/messages`,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': token,
          'anthropic-version': '2023-06-01'
        },
        body: { model, max_tokens: 8, messages: PING_MESSAGES }
      };
    }

    // Google Gemini：POST /v1beta/models/{model}:generateContent
    if (provider === 'Google' && !baseUrl) {
      return {
        url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(token)}`,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: { contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }
      };
    }

    // OpenAI 兼容：POST {base}/chat/completions（覆盖 OpenAI、阿里云、自定义 Base URL、百炼 Agent 等）
    let base = null;
    if (baseUrl) {
      base = String(baseUrl).replace(/\/+$/, '');
    } else {
      base = CHAT_BASES[provider] || null;
    }
    if (!base) return null;

    return {
      url: `${base}/chat/completions`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: { model, max_tokens: 8, messages: PING_MESSAGES }
    };
  }

  // ============================================================
  // 结果分类
  // ============================================================

  /** 缺少接入地址时的提示文案 */
  static missingAddressReason(provider) {
    if (provider === '阿里云百炼Agent') {
      return '「阿里云百炼Agent」的 Key 未配置专属 Base URL 接入地址，请在编辑弹窗中填写后再检测';
    }
    return `暂不支持自动检测服务商「${provider}」，请为该 Key 配置 Base URL 接入地址后重试`;
  }

  /** 分类 Key 探测阶段的非 2xx 响应 */
  static classifyHttp(status, detail, scope) {
    const hint = HTTP_HINTS[status] ? ` ${HTTP_HINTS[status]}` : '';
    const detailSuffix = detail ? `：${detail}` : '';
    // 4xx 通常说明 Key/地址配置有误；5xx/429 为服务端或限流问题，暂时无法确认
    if (status >= 500) {
      return {
        status: 'warn',
        message: `服务暂时不可用（HTTP ${status}${hint}），${scope}失败${detailSuffix}`
      };
    }
    if (status === 429) {
      return {
        status: 'warn',
        message: `${scope}触发限流或账户额度不足（HTTP 429），暂时无法确认`
      };
    }
    return {
      status: 'fail',
      message: `${scope}失败（HTTP ${status}${hint}${detailSuffix}）`
    };
  }

  /** 分类模型对话阶段的非 2xx 响应 */
  static classifyChatError(status, detail, model) {
    const detailSuffix = detail ? `：${detail}` : '';
    // 401：Key 本身无效
    if (status === 401) {
      return {
        status: 'fail',
        keyOk: false,
        modelOk: null,
        message: `Key 无效或已失效（HTTP 401${detailSuffix}）`
      };
    }
    // 403：Key 有效但无权调用该模型
    if (status === 403) {
      return {
        status: 'fail',
        keyOk: false,
        modelOk: null,
        message: `Key 有效但未被授权调用模型「${model}」（HTTP 403${detailSuffix}）`
      };
    }
    // 400/404/422：模型不存在、已下线或请求不被该模型支持
    if (status === 400 || status === 404 || status === 422) {
      return {
        status: 'fail',
        keyOk: true,
        modelOk: false,
        message: `模型「${model}」不可用（HTTP ${status}${detailSuffix}）`
      };
    }
    // 429：限流/额度，Key 与模型本身可能正常
    if (status === 429) {
      return {
        status: 'warn',
        keyOk: true,
        modelOk: null,
        message: `Key 有效 · 调用模型「${model}」触发限流或额度不足（HTTP 429），请稍后重试`
      };
    }
    // 5xx 等：服务端问题，暂时无法确认
    if (status >= 500) {
      return {
        status: 'warn',
        keyOk: true,
        modelOk: null,
        message: `Key 有效 · 服务暂时不可用（HTTP ${status}），模型「${model}」暂无法验证${detailSuffix}`
      };
    }
    return {
      status: 'warn',
      keyOk: true,
      modelOk: null,
      message: `Key 有效 · 模型「${model}」探测异常（HTTP ${status}${detailSuffix}）`
    };
  }

  // ============================================================
  // 底层请求与错误处理
  // ============================================================

  /** 发送探测请求，统一超时与耗时统计，永不抛出 */
  static async httpProbe(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startedAt = Date.now();
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const latencyMs = Date.now() - startedAt;
      let detail = '';
      let bodyText = '';
      if (!response.ok) {
        detail = await this.extractErrorDetail(response);
      } else {
        bodyText = await this.readBodyText(response);
      }
      return { ok: response.ok, status: response.status, latencyMs, detail, bodyText, networkError: null };
    } catch (error) {
      return {
        ok: false,
        status: null,
        latencyMs: Date.now() - startedAt,
        detail: '',
        bodyText: '',
        networkError: error
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** 读取响应文本（失败返回空串） */
  static async readBodyText(response) {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  /**
   * 从「模型列表」响应中提取可调用模型 ID
   * 兼容 OpenAI 兼容格式 data[].id 与 Gemini 格式 models[].name
   * @returns {string[]}
   */
  static extractModels(bodyText) {
    if (!bodyText) return [];
    try {
      const json = JSON.parse(bodyText);
      const result = [];
      if (Array.isArray(json.data)) {
        json.data.forEach(item => {
          if (item && typeof item.id === 'string') result.push(item.id);
        });
      }
      if (Array.isArray(json.models)) {
        json.models.forEach(item => {
          if (item && typeof item.name === 'string') {
            result.push(item.name.replace(/^models\//, ''));
          }
        });
      }
      return result;
    } catch {
      return [];
    }
  }

  /** 从非 2xx 响应中提取简要错误详情 */
  static async extractErrorDetail(response) {
    try {
      const text = await response.text();
      if (!text) return '';
      try {
        const json = JSON.parse(text);
        return String(json.error?.message || json.message || text).substring(0, 160);
      } catch {
        return text.substring(0, 160);
      }
    } catch {
      return '';
    }
  }

  /** 将网络层异常翻译为可读的中文提示 */
  static describeNetworkError(error) {
    if (error.name === 'AbortError') {
      return `连接超时（${TIMEOUT_MS / 1000} 秒无响应）`;
    }
    const code = error.cause?.code || error.code || '';
    const NETWORK_HINTS = {
      ENOTFOUND: '域名解析失败，接入地址可能有误',
      EAI_AGAIN: '域名解析超时，请检查网络',
      ECONNREFUSED: '连接被拒绝，服务地址不可达',
      ECONNRESET: '连接被重置',
      ETIMEDOUT: '连接超时',
      EPROTO: 'SSL/协议握手失败',
      CERT_HAS_EXPIRED: 'SSL 证书已过期'
    };
    if (NETWORK_HINTS[code]) {
      return `网络错误：${NETWORK_HINTS[code]}`;
    }
    const message = error.message || '';
    return `网络错误${code ? `（${code}）` : ''}${message ? '：' + message.substring(0, 120) : ''}`;
  }
}

module.exports = TokenHealthChecker;
