/**
 * 话题管理Hook
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as topicApi from '../services/api/topic.api';
import logger from '../services/logger';

export const useTopics = () => {
  const [topics, setTopics] = useState([]);
  const [currentTopic, setCurrentTopic] = useState(null);
  const [loading, setLoading] = useState(false);
  const topicsLoadRef = useRef(0);
  const currentTopicLoadRef = useRef(0);

  // 加载话题列表
  const loadTopics = useCallback(async () => {
    const requestId = ++topicsLoadRef.current;
    setLoading(true);
    try {
      const topicsData = await topicApi.loadTopics();
      if (topicsLoadRef.current === requestId) setTopics(topicsData);
    } catch (error) {
      logger.error('useTopics', '加载话题失败:', error);
    } finally {
      if (topicsLoadRef.current === requestId) setLoading(false);
    }
  }, []);

  // 加载当前话题
  const loadCurrentTopic = useCallback(async () => {
    const requestId = ++currentTopicLoadRef.current;
    try {
      const topic = await topicApi.loadCurrentTopic();
      if (topic?.id && currentTopicLoadRef.current === requestId) setCurrentTopic(topic);
    } catch (error) {
      logger.error('useTopics', '加载当前话题失败:', error);
    }
  }, []);

  // 创建话题
  const createTopic = useCallback(async (name) => {
    try {
      const result = await topicApi.createTopic(name);
      if (result.success !== false) {
        await Promise.all([loadTopics(), loadCurrentTopic()]);
        return { success: true, result };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTopics', '创建话题失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadTopics, loadCurrentTopic]);

  // 切换话题
  const switchTopic = useCallback(async (topicId) => {
    try {
      const result = await topicApi.switchTopic(topicId);
      if (result.success !== false) {
        await loadCurrentTopic();
        return { success: true, result };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTopics', '切换话题失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadCurrentTopic]);

  // 删除话题
  const deleteTopic = useCallback(async (topicId) => {
    try {
      const result = await topicApi.deleteTopic(topicId);
      if (result.success !== false) {
        await loadTopics();
        await loadCurrentTopic();
        return { success: true, result };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTopics', '删除话题失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadTopics, loadCurrentTopic]);

  // 初始化加载
  useEffect(() => {
    loadTopics();
    loadCurrentTopic();
  }, [loadTopics, loadCurrentTopic]);

  return {
    topics,
    currentTopic,
    loading,
    loadTopics,
    loadCurrentTopic,
    createTopic,
    switchTopic,
    deleteTopic
  };
};
