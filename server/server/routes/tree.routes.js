/**
 * 树形结构路由
 */
const express = require('express');
const TreeController = require('../controllers/tree.controller');

function createTreeRoutes(agent) {
  const router = express.Router();
  const controller = new TreeController(agent);

  // 获取话题的完整对话树
  router.get('/:topicId', controller.getTree);

  // 获取节点详细信息
  router.get('/node/:nodeId', controller.getNodeDetail);

  // 编辑节点内容
  router.put('/node/:nodeId', controller.editNode);

  // 复制节点
  router.post('/node/:nodeId/copy', controller.copyNode);

  // 删除节点
  router.delete('/node/:nodeId', controller.deleteNode);

  // 获取话题的节点位置
  router.get('/positions/:topicId', controller.getNodePositions);

  // 保存话题的节点位置
  router.post('/positions/:topicId', controller.saveNodePositions);

  // 重置话题的节点位置
  router.delete('/positions/:topicId', controller.resetNodePositions);

  // 获取话题的视口位置
  router.get('/viewport/:topicId', controller.getViewport);

  // 保存话题的视口位置
  router.post('/viewport/:topicId', controller.saveViewport);

  // 重置话题的视口位置
  router.delete('/viewport/:topicId', controller.resetViewport);

  return router;
}

module.exports = createTreeRoutes;
