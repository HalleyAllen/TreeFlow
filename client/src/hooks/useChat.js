/**
 * 对话管理Hook
 */
import { useState, useCallback } from 'react';
import * as chatApi from '../services/api/chat.api';
import logger from '../services/logger';

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branchMode, setBranchMode] = useState(false);
  const [branchFromNodeId, setBranchFromNodeId] = useState(null);
  const [nodeCreated, setNodeCreated] = useState(false); // 用于触发脑图刷新

  // 发送消息（支持引用分支）
  const sendMessage = useCallback(async (question, skillId = null, model = null, provider = null, branchType = null, quoteNodeIds = []) => {
    const tempNodeId = `temp-${Date.now()}`;
    
    // 先立即显示用户问题和加载状态
    setMessages(prev => [
      ...prev,
      { type: 'user', content: question, nodeId: tempNodeId },
      { type: 'ai', content: '', nodeId: tempNodeId, status: 'loading' }
    ]);
    setLoading(true);
    setNodeCreated(false); // 重置节点创建标志
    
    try {
      // 确定分支来源节点
      let fromNodeId = branchMode ? branchFromNodeId : null;
      
      // 如果是引用分支，使用最后一个引用的节点作为来源
      if (branchType === 'quote' && quoteNodeIds.length > 0) {
        fromNodeId = quoteNodeIds[quoteNodeIds.length - 1];
      }
      
      const result = await chatApi.sendMessage(
        question, 
        fromNodeId, 
        skillId, 
        model, 
        provider,
        branchType,
        quoteNodeIds
      );
      
      if (result.error) {
        // 更新为错误状态
        setMessages(prev => prev.map(msg => 
          msg.nodeId === tempNodeId 
            ? { ...msg, nodeId: result.nodeId || tempNodeId, status: 'error', error: result.error }
            : msg
        ));
        return { success: false, error: result.error };
      }

      // 更新消息列表，替换临时节点为实际节点
      setMessages(prev => prev.map(msg => 
        msg.nodeId === tempNodeId 
          ? { 
              ...msg, 
              nodeId: result.nodeId, 
              content: msg.type === 'ai' ? result.response : msg.content,
              status: 'completed'
            }
          : msg
      ));

      // 退出分支模式
      if (branchMode) {
        setBranchMode(false);
        setBranchFromNodeId(null);
      }

      return { success: true, result };
    } catch (error) {
      logger.error('useChat', '发送消息失败:', error);
      // 更新为错误状态
      setMessages(prev => prev.map(msg => 
        msg.nodeId === tempNodeId 
          ? { ...msg, status: 'error', error: error.message }
          : msg
      ));
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      setNodeCreated(true); // 标记节点已创建/更新，触发脑图刷新
    }
  }, [branchMode, branchFromNodeId]);

  // 加载话题消息
  const loadMessages = useCallback(async (topicId) => {
    try {
      const messages = await chatApi.loadTopicMessages(topicId);
      setMessages(messages.map(msg => ({
        type: msg.type,
        content: msg.content,
        nodeId: msg.nodeId
      })));
      return messages;
    } catch (error) {
      logger.error('useChat', '加载消息失败:', error);
      return [];
    }
  }, []);

  // 进入分支模式
  const enterBranchMode = useCallback((nodeId) => {
    setBranchMode(true);
    setBranchFromNodeId(nodeId);
  }, []);

  // 退出分支模式
  const exitBranchMode = useCallback(() => {
    setBranchMode(false);
    setBranchFromNodeId(null);
  }, []);

  // 获取节点分支列表
  const getNodeBranches = useCallback(async (nodeId) => {
    try {
      return await chatApi.getNodeBranches(nodeId);
    } catch (error) {
      logger.error('useChat', '获取分支列表失败:', error);
      return [];
    }
  }, []);

  // 切换分支
  const switchBranch = useCallback(async (branchId) => {
    try {
      const result = await chatApi.switchBranch(branchId);
      if (result.success !== false) {
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useChat', '切换分支失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    branchMode,
    branchFromNodeId,
    nodeCreated, // 导出用于触发脑图刷新
    sendMessage,
    loadMessages,
    enterBranchMode,
    exitBranchMode,
    getNodeBranches,
    switchBranch,
    clearMessages,
    setMessages
  };
};
