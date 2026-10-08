/**
 * 对话API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 发送消息（支持引用分支）
export const sendMessage = async (question, fromNodeId = null, skillId = null, model = null, provider = null, branchType = null, quoteNodeIds = [], topicId = null) => {
  try {
    const body = { question };
    if (topicId) body.topicId = topicId;
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

// 发送消息（流式）：通过 SSE 接收回答增量
// onNode 在节点创建后回调一次（携带真实 nodeId），onDelta 在每个增量到达时回调
export const sendMessageStream = async (
  question,
  fromNodeId = null,
  skillId = null,
  model = null,
  provider = null,
  branchType = null,
  quoteNodeIds = [],
  { onNode, onDelta, signal, topicId } = {}
) => {
  try {
    const body = { question };
    if (topicId) body.topicId = topicId;
    if (fromNodeId) body.fromNodeId = fromNodeId;
    if (skillId) body.skillId = skillId;
    if (model) body.model = model;
    if (provider) body.provider = provider;
    if (branchType) body.branchType = branchType;
    if (quoteNodeIds && quoteNodeIds.length > 0) body.quoteNodeIds = quoteNodeIds;

    const response = await fetch(`${API_BASE_URL}/api/ask/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      return { error: data?.error || `请求失败 (${response.status})` };
    }
    if (!response.body) {
      return { error: '当前浏览器不支持流式响应' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    const handleEvent = (event, dataStr) => {
      let data;
      try {
        data = JSON.parse(dataStr);
      } catch {
        return;
      }
      if (event === 'node') {
        onNode?.(data);
      } else if (event === 'delta') {
        onDelta?.(data);
      } else if (event === 'done') {
        finalResult = data;
      } else if (event === 'error') {
        finalResult = { error: data.error };
      }
    };

    // 按 SSE 规范解析：事件块以空行分隔，每块含 event: 与 data: 行
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        let event = 'message';
        const dataLines = [];
        for (const line of rawEvent.split('\n')) {
          if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          }
        }
        if (dataLines.length > 0) {
          handleEvent(event, dataLines.join('\n'));
        }
      }
    }

    return finalResult || {};
  } catch (error) {
    // 用户主动停止：向上抛出由调用方处理
    if (error.name === 'AbortError') throw error;
    logger.error('API', '流式发送消息失败:', { error: error.message });
    return { error: '发送消息失败，请稍后再试' };
  }
};

// 加载话题消息列表
export const loadTopicMessages = async (topicId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics/${topicId}/messages`);
    const data = await response.json();
    return data.data?.messages || data.messages || [];
  } catch (error) {
    logger.error('API', '加载话题消息失败:', { error: error.message });
    return [];
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
