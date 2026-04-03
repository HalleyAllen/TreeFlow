/**
 * 路由聚合导出
 */
const chatRoutes = require('./chat.routes');
const topicRoutes = require('./topic.routes');
const tokenRoutes = require('./token.routes');
const modelRoutes = require('./model.routes');
const providerRoutes = require('./provider.routes');
const ollamaRoutes = require('./ollama.routes');
const skillRoutes = require('./skill.routes');
const themeRoutes = require('./theme.routes');
const treeRoutes = require('./tree.routes');

/**
 * 注册所有路由
 * @param {Object} app - Express应用实例
 * @param {TreeFlowAgent} agent - TreeFlowAgent实例
 */
function registerRoutes(app, agent) {
  app.use('/api', chatRoutes(agent));
  app.use('/api/topics', topicRoutes(agent));
  app.use('/api/tokens', tokenRoutes(agent));
  app.use('/api/models', modelRoutes(agent));
  app.use('/api/providers', providerRoutes(agent));
  app.use('/api/ollama', ollamaRoutes(agent));
  app.use('/api/skills', skillRoutes(agent));
  app.use('/api/theme', themeRoutes(agent));
  app.use('/api/tree', treeRoutes(agent));
}

module.exports = {
  registerRoutes
};
