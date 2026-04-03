/**
 * 统一错误处理中间件
 */
const logger = require('../../core/utils/logger');

/**
 * 异步错误包装器
 * 用于包装异步路由处理函数，捕获错误并传递给错误处理中间件
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * 统一错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error('API', `请求错误: ${req.method} ${req.path}`, { 
    error: err.message,
    stack: err.stack 
  });

  // 设置状态码
  const statusCode = err.statusCode || err.status || 500;
  
  // 返回统一格式的错误响应
  res.status(statusCode).json({
    success: false,
    error: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_ERROR',
    path: req.path,
    timestamp: new Date().toISOString()
  });
};

/**
 * 404错误处理中间件
 * 处理未匹配的路由
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`路径未找到: ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

module.exports = {
  asyncHandler,
  errorHandler,
  notFoundHandler
};
