/**
 * 脑图数据管理 Hook
 */
import { useState, useCallback, useEffect } from 'react';
import * as treeApi from '../services/api/tree.api';
import logger from '../services/logger';

export function useMindMap() {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);

  /**
   * 加载话题树数据
   */
  const loadTree = useCallback(async (topicId) => {
    if (!topicId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await treeApi.getTree(topicId);
      if (result.success) {
        setTreeData(result.data.tree);
        setCurrentNodeId(result.data.currentNodeId);
      } else {
        setError(result.error || '加载失败');
      }
    } catch (err) {
      logger.error('useMindMap', '加载树数据失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 刷新树数据
   */
  const refreshTree = useCallback(async (topicId) => {
    await loadTree(topicId);
  }, [loadTree]);

  /**
   * 获取节点详情
   */
  const getNodeDetail = useCallback(async (nodeId, topicId) => {
    try {
      return await treeApi.getNodeDetail(nodeId, topicId);
    } catch (err) {
      logger.error('useMindMap', '获取节点详情失败:', err);
      return null;
    }
  }, []);

  return {
    treeData,
    loading,
    error,
    currentNodeId,
    loadTree,
    refreshTree,
    getNodeDetail
  };
}

export default useMindMap;
