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
    // 返回完整响应结构 { success, data: { tree, currentNodeId } }
    if (data.success && data.data) {
      return {
        success: true,
        tree: data.data.tree,
        currentNodeId: data.data.currentNodeId,
        topicId: data.data.topicId,
        topicName: data.data.topicName
      };
    }
    return { success: false, error: data.error || '获取对话树失败' };
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
    if (data.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error || '获取节点详情失败' };
  } catch (error) {
    logger.error('TreeAPI', '获取节点详情失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 编辑节点内容
 * @param {string} nodeId - 节点ID
 * @param {string} topicId - 话题ID
 * @param {string} question - 新的问题内容
 * @param {string} answer - 新的回答内容
 * @returns {Promise<Object>} - 编辑结果
 */
export async function editNode(nodeId, topicId, question, answer) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/node/${nodeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId, question, answer })
    });
    const data = await response.json();
    if (data.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error || '编辑节点失败' };
  } catch (error) {
    logger.error('TreeAPI', '编辑节点失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 复制节点
 * @param {string} nodeId - 要复制的节点ID
 * @param {string} topicId - 话题ID
 * @param {string} targetParentId - 目标父节点ID（可选）
 * @returns {Promise<Object>} - 复制结果
 */
export async function copyNode(nodeId, topicId, targetParentId = null) {
  try {
    const body = { topicId };
    if (targetParentId) body.targetParentId = targetParentId;
    
    const response = await fetch(`${API_BASE_URL}/api/tree/node/${nodeId}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (data.success && data.data) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data.error || '复制节点失败' };
  } catch (error) {
    logger.error('TreeAPI', '复制节点失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 删除节点
 * @param {string} nodeId - 要删除的节点ID
 * @param {string} topicId - 话题ID
 * @returns {Promise<Object>} - 删除结果
 */
export async function deleteNode(nodeId, topicId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/node/${nodeId}?topicId=${topicId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || '删除节点失败' };
  } catch (error) {
    logger.error('TreeAPI', '删除节点失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 获取话题的节点位置
 * @param {string} topicId - 话题ID
 * @returns {Promise<Object>} - 节点位置对象 { nodeId: { x, y }, ... }
 */
export async function getNodePositions(topicId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/positions/${topicId}`);
    const data = await response.json();
    if (data.success && data.data) {
      return { success: true, positions: data.data };
    }
    return { success: false, error: data.error || '获取节点位置失败' };
  } catch (error) {
    logger.error('TreeAPI', '获取节点位置失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 保存话题的节点位置
 * @param {string} topicId - 话题ID
 * @param {Object} positions - 节点位置对象 { nodeId: { x, y }, ... }
 * @returns {Promise<Object>} - 保存结果
 */
export async function saveNodePositions(topicId, positions) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/positions/${topicId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positions })
    });
    const data = await response.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || '保存节点位置失败' };
  } catch (error) {
    logger.error('TreeAPI', '保存节点位置失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * 重置话题的节点位置（清除所有保存的位置）
 * @param {string} topicId - 话题ID
 * @returns {Promise<Object>} - 重置结果
 */
export async function resetNodePositions(topicId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/tree/positions/${topicId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      return { success: true, message: data.message };
    }
    return { success: false, error: data.error || '重置节点位置失败' };
  } catch (error) {
    logger.error('TreeAPI', '重置节点位置失败:', { error: error.message });
    return { success: false, error: error.message };
  }
}
