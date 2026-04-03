/**
 * 响应格式化中间件
 * 统一API响应格式
 */

/**
 * 成功响应格式
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
const successResponse = (res, data, message = '操作成功', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * 错误响应格式
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {string} code - 错误代码
 */
const errorResponse = (res, message = '操作失败', statusCode = 500, code = 'ERROR') => {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString()
  });
};

/**
 * 响应格式化中间件
 * 为res对象添加统一响应方法
 */
const responseFormatter = (req, res, next) => {
  res.success = (data, message) => successResponse(res, data, message);
  res.error = (message, statusCode, code) => errorResponse(res, message, statusCode, code);
  next();
};

module.exports = {
  responseFormatter,
  successResponse,
  errorResponse
};
