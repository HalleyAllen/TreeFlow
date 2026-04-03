/**
 * 配置管理模块
 * 处理配置的加载、保存和默认配置设置
 */
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ConfigManager {
  constructor(configFile) {
    this.configFile = configFile;
    this.config = {
      currentModel: 'gpt-3.5-turbo',
      ollamaBaseUrl: 'http://localhost:11434',
      ollamaEnabled: false,
      currentTopic: 'default',
      theme: 'dark', // 默认深色主题
      providers: {
        "OpenAI": {
          "apiUrl": "https://api.openai.com/v1/chat/completions",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer {{token}}"
          },
          "requestBody": {
            "model": "{{model}}",
            "messages": [
              { "role": "system", "content": "You are a helpful assistant." },
              { "role": "user", "content": "{{question}}" }
            ]
          },
          "responsePath": "choices[0].message.content"
        },
        "阿里云": {
          "apiUrl": "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
          "method": "POST",
          "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer {{token}}"
          },
          "parameters": {
            "result_format": "message"
          },
          "requestBody": {
            "model": "{{model}}",
            "input": {
              "messages": [
                { "role": "system", "content": "You are a helpful assistant." },
                { "role": "user", "content": "{{question}}" }
              ]
            }
          },
          "responsePath": "output.choices[0].message.content"
        },
        "default": "OpenAI"
      }
    };
  }

  /**
   * 加载配置数据
   * 从config.json文件加载配置数据，如果文件不存在或加载失败则使用默认配置
   */
  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        const loadedConfig = JSON.parse(data);
        this.config = { ...this.config, ...loadedConfig };
        logger.info('ConfigManager', '加载配置成功', {
          currentModel: this.config.currentModel,
          ollamaBaseUrl: this.config.ollamaBaseUrl,
          currentTopic: this.config.currentTopic,
          providers: Object.keys(this.config.providers)
        });
      } else {
        logger.info('ConfigManager', '配置文件不存在，使用默认配置');
      }
    } catch (error) {
      logger.error('ConfigManager', '加载配置失败，使用默认配置:', { error: error.message });
    }
  }

  /**
   * 保存配置数据
   * 将当前配置保存到config.json文件
   */
  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      logger.info('ConfigManager', '保存配置成功', { providers: Object.keys(this.config.providers) });
    } catch (error) {
      logger.error('ConfigManager', '保存配置失败:', { error: error.message });
    }
  }

  /**
   * 获取配置
   * @returns {Object} - 配置对象
   */
  getConfig() {
    return this.config;
  }

  /**
   * 设置配置
   * @param {Object} newConfig - 新的配置对象
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * 获取当前模型
   * @returns {string} - 当前模型名称
   */
  getCurrentModel() {
    return this.config.currentModel;
  }

  /**
   * 设置当前模型
   * @param {string} model - 模型名称
   */
  setCurrentModel(model) {
    this.config.currentModel = model;
    this.saveConfig();
  }

  /**
   * 获取Ollama基础URL
   * @returns {string} - Ollama基础URL
   */
  getOllamaBaseUrl() {
    return this.config.ollamaBaseUrl;
  }

  /**
   * 设置Ollama基础URL
   * @param {string} url - Ollama基础URL
   */
  setOllamaBaseUrl(url) {
    this.config.ollamaBaseUrl = url;
    this.saveConfig();
  }

  /**
   * 获取当前话题
   * @returns {string} - 当前话题ID
   */
  getCurrentTopic() {
    return this.config.currentTopic;
  }

  /**
   * 设置当前话题
   * @param {string} topicId - 话题ID
   */
  setCurrentTopic(topicId) {
    this.config.currentTopic = topicId;
    this.saveConfig();
  }

  /**
   * 获取提供商配置
   * @returns {Object} - 提供商配置
   */
  getProviders() {
    return this.config.providers;
  }

  /**
   * 设置提供商配置
   * @param {Object} providers - 提供商配置
   */
  setProviders(providers) {
    this.config.providers = providers;
    this.saveConfig();
  }

  /**
   * 获取当前主题
   * @returns {string} - 主题名称 ('light' | 'dark')
   */
  getTheme() {
    return this.config.theme || 'dark';
  }

  /**
   * 设置当前主题
   * @param {string} theme - 主题名称
   */
  setTheme(theme) {
    this.config.theme = theme;
    this.saveConfig();
    logger.info('ConfigManager', '设置主题', { theme });
  }
}

module.exports = ConfigManager;
