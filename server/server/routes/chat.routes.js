/**
 * 对话路由
 * 处理AI对话和分支相关请求
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const ChatController = require('../controllers/chat.controller');

/**
 * 创建路由时传入agent实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
module.exports = (agent) => {
  const controller = new ChatController(agent);

  // 发送消息
  router.post('/ask', asyncHandler((req, res) => controller.ask(req, res)));

  // 创建分支
  router.post('/branch', asyncHandler((req, res) => controller.createBranch(req, res)));

  // 切换分支
  router.post('/switch-branch', asyncHandler((req, res) => controller.switchBranch(req, res)));

  // 获取对话树
  router.get('/conversation-tree', asyncHandler((req, res) => controller.getConversationTree(req, res)));

  // 获取节点的分支列表
  router.get('/node-branches', asyncHandler((req, res) => controller.getNodeBranches(req, res)));

  // 获取话题消息
  router.get('/topic-messages', asyncHandler((req, res) => controller.getTopicMessages(req, res)));

  return router;
};
