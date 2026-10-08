/**
 * 脑图数据管理 Hook
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import * as treeApi from '../services/api/tree.api';
import logger from '../services/logger';

export function useMindMap() {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentNodeId, setCurrentNodeId] = useState(null);

  const requestRef = useRef(0);
  const topicRef = useRef(null);
  useEffect(() => () => { requestRef.current += 1; }, []);

  /**
   * 加载话题树数据
   */
  const loadTree = useCallback(async (topicId) => {
    if (!topicId) return;
    const requestId = ++requestRef.current;
    if (topicRef.current !== topicId) {
      topicRef.current = topicId;
      setTreeData(null);
      setCurrentNodeId(null);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await treeApi.getTree(topicId);
      if (requestRef.current !== requestId) return;
      console.log('useMindMap loadTree result:', result ? {
        success: result.success,
        hasTree: !!result.tree,
        treeId: result.tree?.id,
        childrenCount: result.tree?.children?.length
      } : 'null');
      
      if (result.success) {
        // tree 可能为 null（新话题无节点）
        setTreeData(result.tree || null);
        setCurrentNodeId(result.currentNodeId);
      } else {
        setError(result.error || '加载失败');
      }
    } catch (err) {
      if (requestRef.current !== requestId) return;
      logger.error('useMindMap', '加载树数据失败:', err);
      setError(err.message);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
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
