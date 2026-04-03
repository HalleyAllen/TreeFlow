/**
 * Token API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 加载Token列表
export const loadTokenStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens`);
    const data = await response.json();
    return data.data?.tokens || data.tokens || [];
  } catch (error) {
    logger.error('API', '加载token列表失败:', { error: error.message });
    return [];
  }
};

// 添加Token
export const addToken = async (token, provider, model) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, provider, model })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '添加token失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 删除Token
export const removeToken = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '删除token失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 更新Token信息
export const updateTokenInfo = async (token, newToken, provider, model) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/info`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newToken, provider, model })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '更新token信息失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 更新Token状态
export const updateTokenStatus = async (token, status) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, status })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '更新token状态失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 清除所有Token
export const clearTokens = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/all`, {
      method: 'DELETE'
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '清除tokens失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 检查Token健康状态
export const checkTokenHealth = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/check-health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '检查token健康状态失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 批量检查Token健康状态
export const checkAllTokensHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/check-all-health`, {
      method: 'POST'
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '批量检查tokens健康状态失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 获取Token使用统计
export const getTokenUsageStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tokens/stats`);
    const data = await response.json();
    return data.data?.stats || data.stats || [];
  } catch (error) {
    logger.error('API', '获取token使用统计失败:', { error: error.message });
    return [];
  }
};
