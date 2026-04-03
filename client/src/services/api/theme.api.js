/**
 * 主题API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 获取当前主题
export const getTheme = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/theme`);
    const data = await response.json();
    return data.data?.theme || data.theme || 'dark';
  } catch (error) {
    logger.error('API', '获取主题失败:', { error: error.message });
    return 'dark';
  }
};

// 设置主题
export const setTheme = async (theme) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/theme`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '设置主题失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};
