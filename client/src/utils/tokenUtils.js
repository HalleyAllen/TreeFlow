/**
 * Token 工具函数
 * 厂商规则以 ./tokenProviders.json 为单一数据源，本模块基于该配置派生：
 *  - providerOptions / modelOptions：AI 服务管理界面的下拉选项
 *  - identifyModelFromToken()：按 token 前缀自动识别厂商与默认模型
 *
 * 注意：server/core/services/ModelIdentifier.js 中的后端识别规则需与此处保持一致。
 */
import tokenRules from './tokenProviders.json';

const { providers } = tokenRules;

/** 服务商下拉选项 [{ value, label }] */
export const providerOptions = providers.map(({ value, label }) => ({ value, label }));

/** 服务商 -> 可用模型列表 { value: string[] } */
export const modelOptions = providers.reduce((acc, { value, models }) => {
  acc[value] = models;
  return acc;
}, {});

/**
 * 获取服务商配置
 * @param {string} value - 服务商标识
 * @returns {Object|null} 服务商配置，未找到返回 null
 */
export const getProviderConfig = (value) =>
  providers.find((provider) => provider.value === value) || null;

/**
 * 判断服务商是否需要用户提供自定义 Base URL 接入地址
 * @param {string} value - 服务商标识
 * @returns {boolean}
 */
export const providerRequiresBaseUrl = (value) =>
  getProviderConfig(value)?.baseUrlRequired === true;

/**
 * 根据 Token 自动识别厂商和默认模型
 * 长前缀优先匹配：如 sk-ws- / sk-ant- / sk-ali- 必须先于 sk- 命中，
 * 否则会被 OpenAI 的通用前缀 sk- 吞掉。
 * @param {string} token - 要识别的 Token
 * @returns {Object} - { provider, model }，无法识别时返回 Unknown
 */
export const identifyModelFromToken = (token) => {
  if (!token || typeof token !== 'string') {
    return { provider: 'Unknown', model: 'unknown' };
  }

  let best = null;
  for (const provider of providers) {
    for (const prefix of provider.prefixes) {
      if (token.startsWith(prefix) && (!best || prefix.length > best.prefix.length)) {
        best = { prefix, provider };
      }
    }
  }

  if (!best) {
    return { provider: 'Unknown', model: 'unknown' };
  }
  return { provider: best.provider.value, model: best.provider.defaultModel };
};
