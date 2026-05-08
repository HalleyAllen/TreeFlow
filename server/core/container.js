/**
 * ServiceContainer - 依赖注入容器
 * 解耦服务创建和消费，避免控制器直接依赖 TreeFlowAgent 上帝类
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
  }

  /**
   * 注册服务实例
   * @param {string} name - 服务名称
   * @param {any} instance - 服务实例
   * @returns {ServiceContainer} - 支持链式调用
   */
  register(name, instance) {
    this.services.set(name, instance);
    return this;
  }

  /**
   * 获取服务实例
   * @param {string} name - 服务名称
   * @returns {any} - 服务实例
   * @throws {Error} - 服务不存在时抛出错误
   */
  get(name) {
    if (!this.services.has(name)) {
      throw new Error(`服务未注册: ${name}`);
    }
    return this.services.get(name);
  }

  /**
   * 检查服务是否已注册
   * @param {string} name - 服务名称
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }
}

module.exports = { ServiceContainer };
