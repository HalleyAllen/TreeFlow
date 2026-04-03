/**
 * App 主逻辑 Hook
 * 整合所有业务逻辑，解耦 App.jsx
 */
import { useState, useCallback, useEffect } from 'react';
import { useTopics } from './useTopics';
import { useChat } from './useChat';
import { useModels } from './useModels';
import { useTokens } from './useTokens';
import { useSkills } from './useSkills';
import { useTheme } from './useTheme';
import * as ollamaApi from '../services/api/ollama.api';
import logger from '../services/logger';

export const useApp = () => {
  // UI 状态
  const [showAIServiceModal, setShowAIServiceModal] = useState(false);
  const [showCreateTopicModal, setShowCreateTopicModal] = useState(false);
  const [topicNameInput, setTopicNameInput] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  
  // 输入状态
  const [input, setInput] = useState('');
  
  // Ollama 状态
  const [ollamaEnabled, setOllamaEnabled] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');

  // 业务 Hooks
  const { 
    topics, 
    currentTopic, 
    createTopic, 
    switchTopic, 
    deleteTopic,
    loadTopics 
  } = useTopics();

  const {
    messages,
    loading: chatLoading,
    branchMode,
    branchFromNodeId,
    sendMessage: sendChatMessage,
    loadMessages,
    enterBranchMode,
    exitBranchMode,
    setMessages
  } = useChat();

  const {
    models,
    selectedModel,
    setModel,
    loadModels
  } = useModels();

  const {
    tokens,
    loadTokens
  } = useTokens();

  const {
    skills,
    activeSkill,
    selectSkill,
    clearSkill
  } = useSkills();

  const {
    theme,
    toggleTheme
  } = useTheme();

  // 加载 Ollama 配置
  useEffect(() => {
    const loadOllamaConfig = async () => {
      try {
        const config = await ollamaApi.getOllamaUrl();
        if (config.enabled !== undefined) {
          setOllamaEnabled(config.enabled);
        }
        if (config.url) {
          setOllamaUrl(config.url);
        }
      } catch (error) {
        logger.error('useApp', '加载Ollama配置失败:', error);
      }
    };
    loadOllamaConfig();
  }, []);

  // 当话题切换时加载消息
  useEffect(() => {
    if (currentTopic?.id) {
      loadMessages(currentTopic.id);
    }
  }, [currentTopic?.id, loadMessages]);

  // Ollama 启用状态变化处理
  const handleOllamaEnabledChange = useCallback(async (enabled) => {
    try {
      const result = await ollamaApi.setOllamaEnabled(enabled);
      if (result.result) {
        setOllamaEnabled(enabled);
        // 刷新模型列表
        loadModels();
      }
    } catch (error) {
      logger.error('useApp', '设置Ollama状态失败:', error);
    }
  }, [loadModels]);

  // 输入变化
  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
  }, []);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const currentInput = input;
    setInput(''); // 清空输入

    // 添加用户消息到界面
    const userMsg = { type: 'user', content: currentInput };
    if (branchFromNodeId) userMsg.nodeId = branchFromNodeId;
    setMessages(prev => [...prev, userMsg]);

    const result = await sendChatMessage(currentInput, activeSkill?.id);

    if (result.success) {
      // 添加AI响应
      const aiMsg = { type: 'ai', content: result.result.response };
      if (result.result.nodeId) aiMsg.nodeId = result.result.nodeId;
      setMessages(prev => [...prev, aiMsg]);
      // 清除技能
      clearSkill();
    } else {
      // 添加错误消息
      setMessages(prev => [...prev, { type: 'ai', content: `错误: ${result.error}` }]);
    }
  }, [input, branchFromNodeId, sendChatMessage, activeSkill, clearSkill, setMessages]);

  // 按键事件
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 创建话题
  const handleCreateTopic = useCallback(async () => {
    if (!topicNameInput.trim()) return;

    const result = await createTopic(topicNameInput);
    if (result.success) {
      setShowCreateTopicModal(false);
      setTopicNameInput('');
    } else {
      alert(`创建话题失败: ${result.error}`);
    }
  }, [topicNameInput, createTopic]);

  // 切换话题
  const handleSwitchTopic = useCallback(async (topicId) => {
    const result = await switchTopic(topicId);
    if (!result.success) {
      alert(`切换话题失败: ${result.error}`);
    }
  }, [switchTopic]);

  // 选择模型
  const handleSelectModel = useCallback(async (model) => {
    if (model.available) {
      const result = await setModel(model.id);
      if (!result.success) {
        logger.error('App', '设置模型失败:', result.error);
      }
      setShowModelDropdown(false);
    } else {
      alert(model.message);
    }
  }, [setModel]);

  // Token 更新回调
  const handleTokensUpdated = useCallback(() => {
    loadTokens();
  }, [loadTokens]);

  // 进入分支模式
  const handleEnterBranchMode = useCallback((index, nodeId) => {
    enterBranchMode(nodeId);
  }, [enterBranchMode]);

  return {
    // UI 状态
    showAIServiceModal,
    setShowAIServiceModal,
    showCreateTopicModal,
    setShowCreateTopicModal,
    topicNameInput,
    setTopicNameInput,
    showModelDropdown,
    setShowModelDropdown,

    // Ollama 相关
    ollamaEnabled,
    ollamaUrl,
    handleOllamaEnabledChange,

    // 话题相关
    topics,
    currentTopic,
    handleCreateTopic,
    handleSwitchTopic,

    // 聊天相关
    messages,
    chatLoading,
    branchMode,
    input,
    handleInputChange,
    handleKeyPress,
    handleSend,
    handleEnterBranchMode,
    exitBranchMode,

    // 模型相关
    models,
    selectedModel,
    handleSelectModel,

    // Token 相关
    tokens,
    handleTokensUpdated,

    // 技能相关
    skills,
    activeSkill,
    selectSkill,
    clearSkill,

    // 主题相关
    theme,
    toggleTheme
  };
};
