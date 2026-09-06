/**
 * 模型管理Hook
 */
import { useState, useEffect, useCallback } from 'react';
import * as modelApi from '../services/api/model.api';
import logger from '../services/logger';

export const useModels = () => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [loading, setLoading] = useState(false);

  // 加载模型列表
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const modelsData = await modelApi.loadModels();
      setModels(modelsData);
      // 若无当前选中模型、或选中的模型已不在列表中（被删除/改名），回退到第一个可用模型
      setSelectedModel(prev => {
        if (modelsData.length === 0) return prev;
        if (!prev || !modelsData.some(m => m.id === prev)) {
          return modelsData[0].id;
        }
        return prev;
      });
    } catch (error) {
      logger.error('useModels', '加载模型列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 设置当前模型
  const setModel = useCallback(async (model) => {
    try {
      const result = await modelApi.setModel(model);
      if (result.success !== false) {
        setSelectedModel(model);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useModels', '设置模型失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  return {
    models,
    selectedModel,
    loading,
    loadModels,
    setModel,
    setSelectedModel
  };
};
