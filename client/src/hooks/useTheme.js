/**
 * 主题管理Hook
 */
import { useState, useEffect, useCallback } from 'react';
import * as themeApi from '../services/api/theme.api';
import logger from '../services/logger';

export const useTheme = () => {
  const [theme, setThemeState] = useState('dark');

  // 加载主题
  const loadTheme = useCallback(async () => {
    try {
      const themeData = await themeApi.getTheme();
      setThemeState(themeData);
      document.documentElement.setAttribute('data-theme', themeData);
    } catch (error) {
      logger.error('useTheme', '加载主题失败:', error);
    }
  }, []);

  // 切换主题
  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    try {
      const result = await themeApi.setTheme(newTheme);
      if (result.success !== false) {
        setThemeState(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        return { success: true, theme: newTheme };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTheme', '切换主题失败:', error);
      return { success: false, error: error.message };
    }
  }, [theme]);

  // 设置主题
  const setTheme = useCallback(async (newTheme) => {
    try {
      const result = await themeApi.setTheme(newTheme);
      if (result.success !== false) {
        setThemeState(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      logger.error('useTheme', '设置主题失败:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  return {
    theme,
    isDark: theme === 'dark',
    loadTheme,
    toggleTheme,
    setTheme
  };
};
