/**
 * 话题控制器
 * 处理话题的CRUD操作
 * 重构后：通过 ServiceContainer 依赖注入，不再直接访问 TreeFlowAgent 内部属性
 */
class TopicController {
  constructor(container) {
    // 从容器中获取所需服务，实现依赖注入解耦
    this.topicManager = container.get('topicManager');
    this.configManager = container.get('configManager');
    this.treeManager = container.get('conversationTreeManager');
  }

  /**
   * 获取话题列表
   */
  listTopics(_req, res) {
    const topics = this.topicManager.getTopics().map(topic => ({
      id: topic.id,
      name: topic.name
    }));
    res.success({ topics });
  }

  /**
   * 创建话题
   */
  createTopic(req, res) {
    const { name } = req.body;
    const result = this.topicManager.createTopic(name);
    res.success({ result });
  }

  /**
   * 切换话题
   */
  switchTopic(req, res) {
    const { topicId } = req.body;
    const result = this.topicManager.switchTopic(topicId);
    if (result !== '话题不存在' && result !== '切换话题失败') {
      this.configManager.setCurrentTopic(topicId);
    }
    res.success({ result });
  }

  /**
   * 删除话题
   */
  deleteTopic(req, res) {
    const { topicId } = req.body;
    const result = this.topicManager.deleteTopic(topicId);
    if (result !== '话题不存在' && result !== '删除话题失败' && result !== '默认话题无法删除') {
      if (this.configManager.getCurrentTopic() === topicId) {
        this.configManager.setCurrentTopic('default');
      }
    }
    res.success({ result });
  }

  /**
   * 获取当前话题
   */
  getCurrentTopic(_req, res) {
    let topicId = this.configManager.getCurrentTopic();
    let topic = this.topicManager.getTopic(topicId);
    
    // 如果当前话题不存在，切换到默认话题
    if (!topic) {
      topicId = 'default';
      topic = this.topicManager.getTopic(topicId);
      this.configManager.setCurrentTopic(topicId);
    }
    
    const currentTopic = {
      id: topicId,
      name: topic ? topic.name : '默认话题'
    };
    res.success({ currentTopic });
  }

  /**
   * 获取话题消息列表
   */
  getTopicMessages(req, res) {
    const { topicId } = req.params;
    const messages = this.treeManager.getConversationMessages(topicId);
    res.success({ messages });
  }
}

module.exports = TopicController;
