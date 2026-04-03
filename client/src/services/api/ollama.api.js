/**
 * Ollama API服务
 */
import logger from '../logger';

const API_BASE_URL = '';

// 获取Ollama配置
export const getOllamaUrl = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/config`);
    const data = await response.json();
    return {
      url: data.data?.url || data.url || 'http://localhost:11434',
      enabled: data.data?.enabled ?? data.enabled ?? false
    };
  } catch (error) {
    logger.error('API', '获取Ollama配置失败:', { error: error.message });
    return { url: 'http://localhost:11434', enabled: false };
  }
};

// 设置Ollama URL
export const setOllamaUrl = async (url) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '设置Ollama URL失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 设置Ollama启用状态
export const setOllamaEnabled = async (enabled) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/enabled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '设置Ollama状态失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 检测Ollama连接状态
export const checkOllamaStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/status`);
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    logger.error('API', '检测Ollama状态失败:', { error: error.message });
    return { connected: false, message: error.message };
  }
};

// 获取Ollama模型列表
export const getOllamaModels = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/models`);
    const data = await response.json();
    return data.data?.models || data.models || [];
  } catch (error) {
    logger.error('API', '获取Ollama模型列表失败:', { error: error.message });
    return [];
  }
};

// 拉取Ollama模型
export const pullOllamaModel = async (model) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model })
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '拉取Ollama模型失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};

// 删除Ollama模型
export const deleteOllamaModel = async (model) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ollama/models/${model}`, {
      method: 'DELETE'
    });
    return await response.json();
  } catch (error) {
    logger.error('API', '删除Ollama模型失败:', { error: error.message });
    return { success: false, error: error.message };
  }
};
