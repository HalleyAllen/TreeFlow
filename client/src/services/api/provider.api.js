/**
 * 提供商API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 获取所有提供商配置
export const getProviders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/providers`);
    const data = await response.json();
    return data.data?.providers || data.providers || {};
  } catch (error) {
    logger.error('API', '获取提供商配置失败:', { error: error.message });
    return {};
  }
};

// 添加/更新提供商
export const saveProvider = async (name, config) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, config })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '保存提供商配置失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 删除提供商
export const deleteProvider = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/providers/${name}`, {
      method: 'DELETE'
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '删除提供商配置失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 测试提供商连接
export const testProvider = async (config, token, model) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/providers/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, token, model })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '测试提供商连接失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};
