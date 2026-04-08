/**
 * 对话API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 发送消息（支持引用分支）
export const sendMessage = async (question, fromNodeId = null, skillId = null, model = null, provider = null, branchType = null, quoteNodeIds = []) => {
  try {
    const body = { question };
    if (fromNodeId) body.fromNodeId = fromNodeId;
    if (skillId) body.skillId = skillId;
    if (model) body.model = model;
    if (provider) body.provider = provider;
    if (branchType) body.branchType = branchType;
    if (quoteNodeIds && quoteNodeIds.length > 0) body.quoteNodeIds = quoteNodeIds;
    const response = await fetch(`${API_BASE_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    logger.error('API', '发送消息失败:', { error: error.message });
    return { error: '发送消息失败，请稍后再试' };
  }
};

// 加载话题消息列表
export const loadTopicMessages = async (topicId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/messages`);
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    logger.error('API', '加载话题消息失败:', { error: error.message });
    return { error: '加载话题消息失败，请稍后再试' };
  }
};

// 创建分支
export const createBranch = async (fromNodeId = null) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask/branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromNodeId })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '创建分支失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 切换分支
export const switchBranch = async (branchId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask/switch-branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branchId })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '切换分支失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 获取对话树
export const getConversationTree = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask/conversation-tree`);
    const data = await response.json();
    return data.data?.tree || data.tree || null;
  } catch (error) {
    logger.error('API', '获取对话树失败:', { error: error.message });
    return null;
  }
};

// 获取节点分支列表
export const getNodeBranches = async (nodeId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ask/node-branches?nodeId=${nodeId}`);
    const data = await response.json();
    return data.data?.branches || data.branches || [];
  } catch (error) {
    logger.error('API', '获取节点分支失败:', { error: error.message });
    return [];
  }
};
