// 根据Token自动识别厂商和模型
export const identifyModelFromToken = (token) => {
  // 阿里云百炼 Agent 工作空间 token格式: sk-ws-开头
  // 注意：必须放在 sk- 之前判断，否则会被 OpenAI 分支吞掉
  if (token.startsWith('sk-ws-')) {
    return {
      provider: '阿里云百炼Agent',
      model: 'qwen-plus'
    };
  }
  // OpenAI token格式: sk-开头
  else if (token.startsWith('sk-')) {
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
