/**
 * 技能管理Hook
 */
import { useState, useEffect, useCallback } from 'react';
import * as skillApi from '../services/api/skill.api';
import logger from '../services/logger';

export const useSkills = () => {
  const [skills, setSkills] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [loading, setLoading] = useState(false);

  // 加载技能列表
  const loadSkills = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const skillsData = await skillApi.loadSkills(query);
      setSkills(skillsData);
    } catch (error) {
      logger.error('useSkills', '加载技能列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 选择技能
  const selectSkill = useCallback((skill) => {
    setActiveSkill(skill);
  }, []);

  // 清除技能
  const clearSkill = useCallback(() => {
    setActiveSkill(null);
  }, []);

  // 初始化加载
  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  return {
    skills,
    activeSkill,
    loading,
    loadSkills,
    selectSkill,
    clearSkill
  };
};
