/**
 * TreeFlow 服务器主入口
 * 提供RESTful API服务
 * 重构后：使用 ServiceContainer 进行依赖注入，解耦路由对 TreeFlowAgent 的直接依赖
 */
const express = require('express');
const cors = require('cors');
const { TreeFlowAgent } = require('./core/agent/TreeFlowAgent');
const { ServiceContainer } = require('./core/container');
const logger = require('./core/utils/logger');
const config = require('./config');

// 导入中间件
const { errorHandler, notFoundHandler } = require('./server/middleware/errorHandler');
const { responseFormatter } = require('./server/middleware/responseFormatter');

// 导入路由
const { registerRoutes } = require('./server/routes');

// 创建Express应用
const app = express();

// 全局中间件
app.use(cors());
app.use(express.json());
app.use(responseFormatter);

// 创建依赖注入容器
const container = new ServiceContainer();

// 创建TreeFlowAgent实例
const agent = new TreeFlowAgent();

// 将核心服务注册到容器，解耦控制器对 agent 内部结构的直接访问
container
  .register('agent', agent)
  .register('topicManager', agent.topicManager)
  .register('configManager', agent.configManager)
  .register('conversationTreeManager', agent.conversationTreeManager)
  .register('tokenManager', agent.tokenManager)
  .register('apiManager', agent.apiManager)
  .register('skillManager', agent.skillManager);

// 注册路由（传入容器而非 agent 实例）
registerRoutes(app, container);

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || config.backend.port;
app.listen(PORT, () => {
  logger.info('Server', `服务器运行在 http://localhost:${PORT}`);
});

module.exports = { app, agent };
