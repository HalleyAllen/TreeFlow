/**
 * 话题API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 加载话题列表
export const loadTopics = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics`);
    const data = await response.json();
    return data.data?.topics || data.topics || [];
  } catch (error) {
    logger.error('API', '加载话题失败:', { error: error.message });
    return [];
  }
};

// 加载当前话题
export const loadCurrentTopic = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics/current`);
    const data = await response.json();
    return data.data?.currentTopic || data.currentTopic || null;
  } catch (error) {
    logger.error('API', '加载当前话题失败:', { error: error.message });
    return null;
  }
};

// 创建话题
export const createTopic = async (name) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '创建话题失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 切换话题
export const switchTopic = async (topicId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics/switch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '切换话题失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 删除话题
export const deleteTopic = async (topicId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/topics`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topicId })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '删除话题失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 加载话题消息
export const loadTopicMessages = async (topicId) => {
  try {
    const url = topicId 
      ? `${API_BASE_URL}/api/ask/topic-messages?topicId=${topicId}`
      : `${API_BASE_URL}/api/ask/topic-messages`;
    const response = await fetch(url);
    const data = await response.json();
    return data.data?.messages || data.messages || [];
  } catch (error) {
    logger.error('API', '加载话题消息失败:', { error: error.message });
    return [];
  }
};
