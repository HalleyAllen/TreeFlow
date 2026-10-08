/**
 * 对话管理Hook
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import * as chatApi from '../services/api/chat.api';
import logger from '../services/logger';
import * as treeApi from '../services/api/tree.api';

export const useChat = (topicId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [branchMode, setBranchMode] = useState(false);
  const [branchFromNodeId, setBranchFromNodeId] = useState(null);
  const [activeEndNodeId, setActiveEndNodeId] = useState(null); // 活跃末端节点（点击末端节点切换）
  const [nodeCreated, setNodeCreated] = useState(0); // 计数器：变化时触发脑图刷新
  const [streamingNode, setStreamingNode] = useState(null); // 正在流式生成的节点 { nodeId, content, done }
  const abortRef = useRef(null); // 当前流式请求的中止控制器

  const topicRef = useRef(topicId);
  topicRef.current = topicId;
  const messageLoadRef = useRef(0);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    messageLoadRef.current += 1;
    setMessages([]);
    setLoading(false);
    setBranchMode(false);
    setBranchFromNodeId(null);
    setActiveEndNodeId(null);
    setStreamingNode(null);
    setError(null);
    setNodeCreated(0);
  }, [topicId]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // 停止生成：中止流式请求，后端会保存已生成的部分内容
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 发送消息（流式，支持引用分支）
  const sendMessage = useCallback(async (question, skillId = null, model = null, provider = null, branchType = null, quoteNodeIds = []) => {
    if (!topicId || abortRef.current) return { success: false };
    const requestTopicId = topicId;
    const requestEpoch = messageLoadRef.current;
    const tempNodeId = `temp-${Date.now()}`;

    // 先立即显示用户问题和加载状态
    setMessages(prev => [
      ...prev,
      { type: 'user', content: question, nodeId: tempNodeId },
      { type: 'ai', content: '', nodeId: tempNodeId, status: 'loading' }
    ]);
    setLoading(true);
    setError(null);
    setNodeCreated(0); // 重置节点创建计数
    setStreamingNode(null); // 清理上一次的流式状态

    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrentRequest = () => topicRef.current === requestTopicId && abortRef.current === controller;

    let realNodeId = null; // 后端创建的真实节点 ID（node 事件后可用）
    let accContent = '';   // 累计的回答内容
    let lastEmit = 0;      // 增量节流时间戳

    try {
      // 确定父节点：引用分支 > 分支模式 > 活跃末端节点
      let fromNodeId = branchMode ? branchFromNodeId : activeEndNodeId;

      // 如果是引用分支，使用最后一个引用的节点作为来源
      if (branchType === 'quote' && quoteNodeIds.length > 0) {
        fromNodeId = quoteNodeIds[quoteNodeIds.length - 1];
      }

      const result = await chatApi.sendMessageStream(
        question,
        fromNodeId,
        skillId,
        model,
        provider,
        branchType,
        quoteNodeIds,
        {
          // 节点已创建：触发脑图刷新把新节点渲染出来
          onNode: ({ nodeId }) => {
            if (!isCurrentRequest()) return;
            realNodeId = nodeId;
            setNodeCreated(c => c + 1);
          },
          // 回答增量：节流更新流式状态，脑图节点渐进渲染
          onDelta: ({ content }) => {
            if (!isCurrentRequest()) return;
            accContent = content;
            const now = Date.now();
            if (realNodeId && now - lastEmit > 60) {
              lastEmit = now;
              setStreamingNode({ nodeId: realNodeId, content: accContent, done: false });
            }
          },
          signal: controller.signal,
          topicId: requestTopicId
        }
      );

      if (!isCurrentRequest()) return { success: false, ignored: true };
      if (result.error) {
        setError(result.error);
        setStreamingNode(null);
        // 更新为错误状态
        setMessages(prev => prev.map(msg =>
          msg.nodeId === tempNodeId
            ? { ...msg, nodeId: realNodeId || tempNodeId, status: 'error', error: result.error }
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
      // 发送成功后，新节点自动成为活跃末端节点，蓝色效果跟随转移
      if (result.nodeId) {
        setActiveEndNodeId(result.nodeId);
        await treeApi.saveActiveEndNodeId(requestTopicId, result.nodeId);
        if (!isCurrentRequest()) return { success: false, ignored: true };
      }

      // 流式结束：保留最终内容直到脑图刷新替换，避免闪烁
      setStreamingNode({ nodeId: result.nodeId, content: result.response, done: true });

      return { success: true, result };
    } catch (error) {
      if (!isCurrentRequest()) return { success: false, ignored: true };
      // 用户主动停止：后端保存部分内容，稍等后刷新展示
      if (error.name === 'AbortError') {
        logger.info('useChat', '流式请求已停止');
        setMessages(prev => prev.map(msg =>
          msg.nodeId === tempNodeId
            ? { ...msg, nodeId: realNodeId || tempNodeId, content: msg.type === 'ai' ? accContent : msg.content, status: 'completed' }
            : msg
        ));
        setStreamingNode(realNodeId ? { nodeId: realNodeId, content: accContent, done: true } : null);
        if (realNodeId) {
          setActiveEndNodeId(realNodeId);
          setBranchMode(false);
          setBranchFromNodeId(null);
          await treeApi.saveActiveEndNodeId(requestTopicId, realNodeId);
          if (!isCurrentRequest()) return { success: false, ignored: true };
        }
        // 等待后端把部分内容写入节点后再触发刷新
        setTimeout(() => {
          if (topicRef.current === requestTopicId && messageLoadRef.current === requestEpoch) {
            setNodeCreated(c => c + 1);
          }
        }, 300);
        return { success: true, aborted: true, nodeId: realNodeId };
      }

      setError(error.message);
      logger.error('useChat', '发送消息失败:', error);
      // 更新为错误状态
      setMessages(prev => prev.map(msg =>
        msg.nodeId === tempNodeId
          ? { ...msg, status: 'error', error: error.message }
          : msg
      ));
      return { success: false, error: error.message };
    } finally {
      if (isCurrentRequest()) {
      setLoading(false);
      setNodeCreated(c => c + 1); // 标记节点已创建/更新，触发脑图刷新
      abortRef.current = null;
      }
    }
  }, [topicId, branchMode, branchFromNodeId, activeEndNodeId]);

  // 加载话题消息
  const loadMessages = useCallback(async (topicId) => {
    const requestId = ++messageLoadRef.current;
    try {
      const messages = await chatApi.loadTopicMessages(topicId);
      if (topicRef.current !== topicId || messageLoadRef.current !== requestId) return [];
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
    error,
    branchMode,
    branchFromNodeId,
    activeEndNodeId,
    setActiveEndNodeId,
    nodeCreated, // 导出用于触发脑图刷新
    streamingNode, // 正在流式生成的节点内容（脑图渐进渲染）
    sendMessage,
    stopStreaming,
    loadMessages,
    enterBranchMode,
    exitBranchMode,
    getNodeBranches,
    switchBranch,
    clearMessages,
    setMessages
  };
};
