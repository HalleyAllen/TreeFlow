/**
 * ModelIdentifier 服务
 * 负责根据 token 前缀识别 AI 模型提供商和模型类型
 * 从 TokenManager 抽离，遵循单一职责原则
 */

class ModelIdentifier {
  /**
   * 识别 token 对应的提供商和模型
   * @param {string} token - 要识别的 token
   * @returns {Object} - 识别结果，包含 provider 和 model
   */
  static identify(token) {
    if (!token || typeof token !== 'string') {
      return { provider: 'Unknown', model: 'unknown' };
    }

    // OpenAI token格式: sk-开头
    if (token.startsWith('sk-')) {
      // 百度token也是sk-开头，这里暂时默认识别为OpenAI
      // 用户可以在界面上手动修改为百度
      return {
        provider: 'OpenAI',
        model: 'gpt-3.5-turbo'
      };
    }
    
    // Anthropic (Claude) token格式: sk-ant-开头
    if (token.startsWith('sk-ant-')) {
      return {
        provider: 'Anthropic',
        model: 'claude-3-opus-20240229'
      };
    }
    
    // Google AI Studio token格式: AIzaSy开头
    if (token.startsWith('AIzaSy')) {
      return {
        provider: 'Gemini',
        model: 'gemini-1.5-pro'
      };
    }
    
    // AWS token格式: ak-开头
    if (token.startsWith('ak-')) {
      return {
        provider: 'AWS',
        model: 'bedrock-anthropic-claude-3'
      };
    }
    
    // xAI token格式: xai-开头
    if (token.startsWith('xai-')) {
      return {
        provider: 'xAI',
        model: 'grok-1'
      };
    }
    
    // OpenRouter token格式: or-开头
    if (token.startsWith('or-')) {
      return {
        provider: 'OpenRouter',
        model: 'openai/gpt-4o'
      };
    }
    
    // Vercel AI-Gateway token格式: vercel-开头
    if (token.startsWith('vercel-')) {
      return {
        provider: 'Vercel AI-Gateway',
        model: 'openai/gpt-4o'
      };
    }
    
    // MiniMax token格式: mm-开头
    if (token.startsWith('mm-')) {
      return {
        provider: 'MiniMax-CN',
        model: 'abab6-chat'
      };
    }
    
    // DeepSeek token格式: ds-开头
    if (token.startsWith('ds-')) {
      return {
        provider: 'DeepSeek',
        model: 'deepseek-llm-7b-chat'
      };
    }
    
    // 火山引擎 token格式: volc-开头
    if (token.startsWith('volc-')) {
      return {
        provider: '火山引擎',
        model: 'volcengine-llama3'
      };
    }
    
    // 阿里云 token格式: aliyun-开头
    if (token.startsWith('aliyun-')) {
      return {
        provider: '阿里云',
        model: 'qwen-7b-chat'
      };
    }
    
    // 腾讯云 token格式: tencent-开头
    if (token.startsWith('tencent-')) {
      return {
        provider: '腾讯云',
        model: 'tencent-hunyuan'
      };
    }
    
    // Kimi token格式: kimi-开头
    if (token.startsWith('kimi-')) {
      return {
        provider: 'Kimi-CN',
        model: 'kimi-cn'
      };
    }
    
    // BytePlus token格式: byteplus-开头
    if (token.startsWith('byteplus-')) {
      return {
        provider: 'BytePlus',
        model: 'byteplus-llm-7b'
      };
    }
    
    // 默认情况
    return {
      provider: 'Unknown',
      model: 'unknown'
    };
  }

  /**
   * 获取所有支持的 token 前缀列表
   * @returns {Array} - 前缀列表
   */
  static getSupportedPrefixes() {
    return [
      { prefix: 'sk-', provider: 'OpenAI', description: 'OpenAI 或百度' },
      { prefix: 'sk-ant-', provider: 'Anthropic', description: 'Anthropic (Claude)' },
      { prefix: 'AIzaSy', provider: 'Gemini', description: 'Google AI Studio' },
      { prefix: 'ak-', provider: 'AWS', description: 'AWS Bedrock' },
      { prefix: 'xai-', provider: 'xAI', description: 'xAI (Grok)' },
      { prefix: 'or-', provider: 'OpenRouter', description: 'OpenRouter' },
      { prefix: 'vercel-', provider: 'Vercel AI-Gateway', description: 'Vercel AI Gateway' },
      { prefix: 'mm-', provider: 'MiniMax-CN', description: 'MiniMax' },
      { prefix: 'ds-', provider: 'DeepSeek', description: 'DeepSeek' },
      { prefix: 'volc-', provider: '火山引擎', description: '火山引擎' },
      { prefix: 'aliyun-', provider: '阿里云', description: '阿里云' },
      { prefix: 'tencent-', provider: '腾讯云', description: '腾讯云' },
      { prefix: 'kimi-', provider: 'Kimi-CN', description: 'Kimi' },
      { prefix: 'byteplus-', provider: 'BytePlus', description: 'BytePlus' }
    ];
  }
}

module.exports = ModelIdentifier;
