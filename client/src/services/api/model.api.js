/**
 * 模型API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 加载模型列表
export const loadModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/models`);
    const data = await response.json();
    if (data.data?.models && data.data.models.length > 0) {
      return data.data.models;
    } else if (data.models && data.models.length > 0) {
      return data.models;
    }
    return [];
  } catch (error) {
    logger.error('API', '加载模型列表失败:', { error: error.message });
    return [];
  }
};

// 设置当前模型
export const setModel = async (model) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/models/current`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '设置模型失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 获取当前模型
export const getCurrentModel = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/models/current`);
    const data = await response.json();
    return data.data?.model || data.model || '';
  } catch (error) {
    logger.error('API', '获取当前模型失败:', { error: error.message });
    return '';
  }
};
