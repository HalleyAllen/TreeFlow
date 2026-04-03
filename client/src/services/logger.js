class Logger {
  constructor() {
    this.level = import.meta.env.VITE_LOG_LEVEL || 'info';
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      fatal: 4
    };
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

  debug(module, message, meta) {
    if (this._shouldLog('debug')) {
      console.log(this._formatMessage('debug', module, message, meta));
    }
  }

  info(module, message, meta) {
    if (this._shouldLog('info')) {
      console.log(this._formatMessage('info', module, message, meta));
    }
  }

  warn(module, message, meta) {
    if (this._shouldLog('warn')) {
      console.warn(this._formatMessage('warn', module, message, meta));
    }
  }

  error(module, message, meta) {
    if (this._shouldLog('error')) {
      console.error(this._formatMessage('error', module, message, meta));
    }
  }

  fatal(module, message, meta) {
    if (this._shouldLog('fatal')) {
      console.error(this._formatMessage('fatal', module, message, meta));
    }
  }
}

export default new Logger();