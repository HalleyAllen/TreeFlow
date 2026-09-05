/**
 * ModelIdentifier 服务
 * 负责根据 token 前缀识别 AI 模型提供商和默认模型
 * 从 TokenManager 抽离，遵循单一职责原则
 *
 * 规则表与前端 client/src/utils/tokenProviders.json 保持同步，
 * 注意维持「长前缀优先」的匹配顺序，避免 sk- 吞掉 sk-ws- / sk-ant- / sk-ali-。
 */

class ModelIdentifier {
  /**
   * 厂商识别规则表
   * prefix: token 前缀；provider: 厂商标识（与 config.providers 键名一致）
   */
  static RULES = [
    { prefix: 'sk-ws-', provider: '阿里云百炼Agent', model: 'qwen-max' },
    { prefix: 'sk-ant-', provider: 'Anthropic', model: 'claude-3-5-sonnet-20240620' },
    { prefix: 'sk-ali-', provider: '阿里云', model: 'qwen-plus' },
    { prefix: 'aliyun-', provider: '阿里云', model: 'qwen-plus' },
    { prefix: 'AIzaSy', provider: 'Google', model: 'gemini-1.5-pro' },
    // 通用 OpenAI 前缀兜底：阿里云百炼、百度等新格式 key 也是 sk- 开头，
    // 无法仅凭前缀区分，识别后可由用户手动修正厂商。
    { prefix: 'sk-', provider: 'OpenAI', model: 'gpt-4o' }
  ];

  /**
   * 识别 token 对应的提供商和默认模型
   * @param {string} token - 要识别的 token
   * @returns {Object} - 识别结果 { provider, model }，无法识别时返回 Unknown
   */
  static identify(token) {
    if (!token || typeof token !== 'string') {
      return { provider: 'Unknown', model: 'unknown' };
    }

    // 长前缀优先匹配，避免 sk- 吞掉 sk-ant- / sk-ws- / sk-ali- 等更长前缀
    const rules = [...ModelIdentifier.RULES].sort((a, b) => b.prefix.length - a.prefix.length);
    const matched = rules.find((rule) => token.startsWith(rule.prefix));

    if (!matched) {
      return { provider: 'Unknown', model: 'unknown' };
    }
    return { provider: matched.provider, model: matched.model };
  }
}

module.exports = ModelIdentifier;
