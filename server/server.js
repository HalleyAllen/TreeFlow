/**
 * TreeFlow 服务器主入口
 * 提供RESTful API服务
 */
const express = require('express');
const cors = require('cors');
const { TreeFlowAgent } = require('./core/agent/TreeFlowAgent');
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

// 创建TreeFlowAgent实例
const agent = new TreeFlowAgent();

// 注册路由
registerRoutes(app, agent);

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
