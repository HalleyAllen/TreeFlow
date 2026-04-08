/**
 * 话题路由
 * 处理话题的CRUD操作
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const TopicController = require('../controllers/topic.controller');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  const controller = new TopicController(agent);

  // 获取话题列表
  router.get('/', asyncHandler((req, res) => controller.listTopics(req, res)));

  // 创建话题
  router.post('/', asyncHandler((req, res) => controller.createTopic(req, res)));

  // 切换话题
  router.post('/switch', asyncHandler((req, res) => controller.switchTopic(req, res)));

  // 删除话题
  router.delete('/', asyncHandler((req, res) => controller.deleteTopic(req, res)));

  // 获取当前话题
  router.get('/current', asyncHandler((req, res) => controller.getCurrentTopic(req, res)));

  // 获取话题消息列表
  router.get('/:topicId/messages', asyncHandler((req, res) => controller.getTopicMessages(req, res)));

  return router;
};
