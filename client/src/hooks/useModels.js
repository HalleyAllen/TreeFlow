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
      // 如果没有选择模型且列表不为空，默认选择第一个
      if (!selectedModel && modelsData.length > 0) {
        setSelectedModel(modelsData[0].id);
      }
    } catch (error) {
      logger.error('useModels', '加载模型列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedModel]);

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
