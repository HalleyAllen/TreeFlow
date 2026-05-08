/**
 * 路由聚合导出
 * 重构后：路由工厂函数接收 ServiceContainer 而非 TreeFlowAgent，实现依赖注入解耦
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
 * @param {ServiceContainer} container - 依赖注入容器
 */
function registerRoutes(app, container) {
  app.use('/api', chatRoutes(container));
  app.use('/api/topics', topicRoutes(container));
  app.use('/api/tokens', tokenRoutes(container));
  app.use('/api/models', modelRoutes(container));
  app.use('/api/providers', providerRoutes(container));
  app.use('/api/ollama', ollamaRoutes(container));
  app.use('/api/skills', skillRoutes(container));
  app.use('/api/theme', themeRoutes(container));
  app.use('/api/tree', treeRoutes(container));
}

module.exports = {
  registerRoutes
};
