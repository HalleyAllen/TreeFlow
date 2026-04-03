/**
 * 日志模块 - 统一的日志记录工具
 * 支持控制台输出和文件写入
 */
const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'info';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
    this.logDir = path.join(__dirname, '../../logs');
    this.logFile = path.join(this.logDir, 'app.log');
    
    // 创建日志目录
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  _shouldLog(level) {
    return this.levels[level] >= this.levels[this.level];
  }

  _formatMessage(level, module, message, meta) {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
    if (meta) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    return logMessage;
  }

  _writeToFile(message) {
    fs.appendFile(this.logFile, message + '\n', (err) => {
      if (err) {
        console.error('写入日志文件失败:', err);
      }
    });
  }

  debug(module, message, meta) {
    if (this._shouldLog('debug')) {
      const logMessage = this._formatMessage('debug', module, message, meta);
      console.log(logMessage);
      this._writeToFile(logMessage);
    }
  }

  info(module, message, meta) {
    if (this._shouldLog('info')) {
      const logMessage = this._formatMessage('info', module, message, meta);
      console.log(logMessage);
      this._writeToFile(logMessage);
    }
  }

  warn(module, message, meta) {
    if (this._shouldLog('warn')) {
      const logMessage = this._formatMessage('warn', module, message, meta);
      console.warn(logMessage);
      this._writeToFile(logMessage);
    }
  }

  error(module, message, meta) {
    if (this._shouldLog('error')) {
      const logMessage = this._formatMessage('error', module, message, meta);
      console.error(logMessage);
      this._writeToFile(logMessage);
    }
  }

  fatal(module, message, meta) {
    if (this._shouldLog('fatal')) {
      const logMessage = this._formatMessage('fatal', module, message, meta);
      console.error(logMessage);
      this._writeToFile(logMessage);
    }
  }
}

// 导出单例实例
module.exports = new Logger();
