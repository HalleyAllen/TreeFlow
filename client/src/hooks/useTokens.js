/**
 * Token管理Hook
 */
import { useState, useEffect, useCallback } from 'react';
import * as tokenApi from '../services/api/token.api';
import logger from '../services/logger';

export const useTokens = () => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载Token列表
  const loadTokens = useCallback(async () => {
    setLoading(true);
    try {
      const tokensData = await tokenApi.loadTokenStats();
      setTokens(tokensData);
    } catch (error) {
      logger.error('useTokens', '加载Token列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 添加Token
  const addToken = useCallback(async (token, provider, model) => {
    try {
      const result = await tokenApi.addToken(token, provider, model);
      if (result.success !== false) {
        await loadTokens();
        return { success: true, result };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTokens', '添加Token失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadTokens]);

  // 删除Token
  const removeToken = useCallback(async (token) => {
    try {
      const result = await tokenApi.removeToken(token);
      if (result.success !== false) {
        await loadTokens();
        return { success: true, result };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTokens', '删除Token失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadTokens]);

  // 更新Token信息
  const updateTokenInfo = useCallback(async (token, newToken, provider, model) => {
    try {
      const result = await tokenApi.updateTokenInfo(token, newToken, provider, model);
      if (result.success !== false) {
        await loadTokens();
        return { success: true, result };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTokens', '更新Token信息失败:', error);
      return { success: false, error: error.message };
    }
  }, [loadTokens]);

  // 检查Token健康状态
  const checkTokenHealth = useCallback(async (token) => {
    try {
      return await tokenApi.checkTokenHealth(token);
    } catch (error) {
      logger.error('useTokens', '检查Token健康状态失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  return {
    tokens,
    loading,
    loadTokens,
    addToken,
    removeToken,
    updateTokenInfo,
    checkTokenHealth
  };
};
