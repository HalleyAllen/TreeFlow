// API调用函数

// 加载话题列表
export const loadTopics = async () => {
  try {
    const response = await fetch('/api/topics')
    const data = await response.json()
    return data.topics || []
  } catch (error) {
    console.error('加载话题失败:', error)
    return []
  }
}

// 加载当前话题
export const loadCurrentTopic = async () => {
  try {
    const response = await fetch('/api/current-topic')
    const data = await response.json()
    return data.currentTopic || null
  } catch (error) {
    console.error('加载当前话题失败:', error)
    return null
  }
}

// 加载token状态
export const loadTokenStats = async () => {
  try {
    const response = await fetch('/api/tokens')
    const data = await response.json()
    return data.stats || []
  } catch (error) {
    console.error('加载token状态失败:', error)
    return []
  }
}

// 加载模型列表
export const loadModels = async () => {
  try {
    const response = await fetch('/api/models')
    const data = await response.json()
    if (data.models && data.models.length > 0) {
      return data.models
    } else {
      // 如果没有可用模型，返回默认模型
      return [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', available: true },
        { id: 'gpt-4', name: 'GPT-4', available: true },
        { id: 'claude-3', name: 'Claude 3', available: true }
      ]
    }
  } catch (error) {
    console.error('加载模型列表失败:', error)
    // 出错时返回默认模型
    return [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', available: true },
      { id: 'gpt-4', name: 'GPT-4', available: true },
      { id: 'claude-3', name: 'Claude 3', available: true }
    ]
  }
}

// 发送消息
export const sendMessage = async (question) => {
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ question })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('发送消息失败:', error)
    return { error: '发送消息失败，请稍后再试' }
  }
}

// 创建分支
export const createBranch = async () => {
  try {
    const response = await fetch('/api/branch', {
      method: 'POST'
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('创建分支失败:', error)
    return { error: '创建分支失败' }
  }
}

// 切换话题
export const switchTopic = async (topicId) => {
  try {
    const response = await fetch('/api/switch-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ topicId })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('切换话题失败:', error)
    return { error: '切换话题失败' }
  }
}

// 创建话题
export const createTopic = async (name) => {
  try {
    const response = await fetch('/api/create-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('创建话题失败:', error)
    return { error: '创建话题失败' }
  }
}

// 添加token
export const addToken = async (token) => {
  try {
    const response = await fetch('/api/add-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('添加token失败:', error)
    return { error: '添加token失败' }
  }
}

// 删除token
export const removeToken = async (token) => {
  try {
    const response = await fetch('/api/remove-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('删除token失败:', error)
    return { error: '删除token失败' }
  }
}

// 更新token状态
export const updateTokenStatus = async (token, status) => {
  try {
    const response = await fetch('/api/update-token-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, status })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('更新token状态失败:', error)
    return { error: '更新token状态失败' }
  }
}

// 清除所有token
export const clearTokens = async () => {
  try {
    const response = await fetch('/api/clear-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('清除token失败:', error)
    return { error: '清除token失败' }
  }
}

// 检查Token健康状态
export const checkTokenHealth = async (token) => {
  try {
    const response = await fetch('/api/check-token-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('检查token健康状态失败:', error)
    return { error: '检查token健康状态失败' }
  }
}

// 批量检查所有Token健康状态
export const checkAllTokensHealth = async () => {
  try {
    const response = await fetch('/api/check-all-tokens-health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('批量检查token健康状态失败:', error)
    return { error: '批量检查token健康状态失败' }
  }
}

// 获取Token使用统计
export const getTokenUsageStats = async () => {
  try {
    const response = await fetch('/api/token-usage-stats')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取token使用统计失败:', error)
    return { error: '获取token使用统计失败' }
  }
}

// 获取指定模型的可用Token数量
export const getAvailableTokensByModel = async (model) => {
  try {
    const response = await fetch(`/api/available-tokens/${model}`)
    const data = await response.json()
    return data
  } catch (error) {
    console.error('获取可用token数量失败:', error)
    return { error: '获取可用token数量失败' }
  }
}

// 设置模型
export const setModel = async (model) => {
  try {
    const response = await fetch('/api/set-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model })
    })
    const data = await response.json()
    return data
  } catch (error) {
    console.error('设置模型失败:', error)
    return { error: '设置模型失败' }
  }
}