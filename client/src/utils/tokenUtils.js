// 根据Token自动识别厂商和模型
export const identifyModelFromToken = (token) => {
  // OpenAI token格式: sk-开头
  if (token.startsWith('sk-')) {
    return {
      provider: 'OpenAI',
      model: 'gpt-3.5-turbo'
    };
  }
  // 阿里云 token格式: sk-ali-开头 或 aliyun-开头
  else if (token.startsWith('sk-ali-') || token.startsWith('aliyun-')) {
    return {
      provider: '阿里云',
      model: 'qwen-turbo'
    };
  }
  // 默认情况 - 尝试OpenAI
  else {
    return {
      provider: 'OpenAI',
      model: 'gpt-3.5-turbo'
    };
  }
}
