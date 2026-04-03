/**
 * 树形结构 API
 */
import logger from '../logger';

const API_BASE_URL = '';

/**
 * 获取话题的完整对话树
 * @param {string} topicId - 话题ID
 * @returns {Promise<Object>} - 对话树数据
 */
export async function getTree(topicId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/${topicId}`);
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    logger.error('TreeAPI', '获取对话树失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 获取节点详细信息
 * @param {string} nodeId - 节点ID
 * @param {string} topicId - 话题ID
 * @returns {Promise<Object>} - 节点详情
 */
export async function getNodeDetail(nodeId, topicId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/node/${nodeId}?topicId=${topicId}`);
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    logger.error('TreeAPI', '获取节点详情失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}
