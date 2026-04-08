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
  
  // 引用状态（支持多个引用）
  const [quotedTexts, setQuotedTexts] = useState([]);
  
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
    nodeCreated,
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

  // 处理划词引用（支持多个引用）
  const handleQuoteText = useCallback((quoteData) => {
    if (quoteData === null) {
      // 清除所有引用
      setQuotedTexts([]);
    } else {
      // 添加新引用（去重）
      setQuotedTexts(prev => {
        // 检查是否已存在相同引用
        const exists = prev.some(q => q.text === quoteData.text && q.nodeId === quoteData.nodeId);
        if (exists) return prev;
        return [...prev, { ...quoteData, id: Date.now() }];
      });
    }
  }, []);

  // 删除单个引用
  const removeQuote = useCallback((quoteId) => {
    setQuotedTexts(prev => prev.filter(q => q.id !== quoteId));
  }, []);

  // 发送消息
  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    // 构造带引用的消息内容
    let currentInput = input;
    if (quotedTexts.length > 0) {
      const quotesText = quotedTexts.map((q, i) => `[引用${i + 1}: "${q.text}"]`).join('\n');
      currentInput = `${quotesText}\n${input}`;
    }
    
    setInput(''); // 清空输入
    setQuotedTexts([]); // 清除所有引用

    // 查找当前模型的供应商
    const currentModelInfo = models.find(m => m.id === selectedModel);
    const provider = currentModelInfo?.provider;

    // 使用 sendChatMessage 处理消息添加和响应显示
    // 如果有引用，标记为引用分支模式
    const result = await sendChatMessage(
      currentInput, 
      activeSkill?.id, 
      selectedModel, 
      provider,
      quotedTexts.length > 0 ? 'quote' : null,  // 引用类型
      quotedTexts.map(q => q.nodeId)  // 引用的节点ID列表
    );

    if (result.success) {
      // 清除技能
      clearSkill();
    }
  }, [input, branchFromNodeId, sendChatMessage, activeSkill, clearSkill, setMessages, models, selectedModel, quotedTexts]);

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
    nodeCreated,
    input,
    quotedTexts,
    handleInputChange,
    handleKeyPress,
    handleSend,
    handleEnterBranchMode,
    exitBranchMode,
    handleQuoteText,
    removeQuote,

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
