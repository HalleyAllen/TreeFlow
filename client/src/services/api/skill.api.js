/**
 * 技能API服务
 */

const API_BASE_URL = '';

/**
 * 处理API响应
 */
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

/**
 * 加载技能列表
 */
export const loadSkills = async (query = '') => {
  const url = query 
    ? `${API_BASE_URL}/api/skills?q=${encodeURIComponent(query)}`
    : `${API_BASE_URL}/api/skills`;
  const response = await fetch(url);
  return handleResponse(response);
};
