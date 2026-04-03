/**
 * 对话API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 发送消息
export const sendMessage = async (question, fromNodeId = null, skillId = null) => {
  try {
    const body = { question };
    if (fromNodeId) body.fromNodeId = fromNodeId;
    if (skillId) body.skillId = skillId;
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

// 发送消息（流式响应）
export const sendMessageStream = async (question, fromNodeId = null, skillId = null, onMessage) => {
  try {
    const body = { question };
    if (fromNodeId) body.fromNodeId = fromNodeId;
    if (skillId) body.skillId = skillId;
    
    const response = await fetch(`${API_BASE_URL}/api/ask-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('流式请求失败');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.content) {
              fullResponse += data.content;
              if (onMessage) onMessage(data.content, false);
            }
            if (data.done) {
              if (onMessage) onMessage(fullResponse, true, data.nodeId);
              return { response: fullResponse, nodeId: data.nodeId };
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    logger.error('API', '流式发送消息失败:', { error: error.message });
    return { error: '发送消息失败，请稍后再试' };
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
