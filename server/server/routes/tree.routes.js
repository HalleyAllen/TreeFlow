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

  return router;
}

module.exports = createTreeRoutes;
