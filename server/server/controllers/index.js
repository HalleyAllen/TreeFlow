/**
 * 控制器模块统一导出
 */
const ChatController = require('./chat.controller');
const TopicController = require('./topic.controller');
const TokenController = require('./token.controller');

module.exports = {
  ChatController,
  TopicController,
  TokenController
};
