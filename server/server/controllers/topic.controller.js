/**
 * 话题控制器
 * 处理话题的CRUD操作
 * 重构后：直接使用 TopicManager
 */
class TopicController {
  constructor(agent) {
    this.agent = agent;
    // 直接使用 TopicManager
    this.topicManager = agent.topicManager;
    this.configManager = agent.configManager;
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
    const treeManager = this.agent.conversationTreeManager;
    const messages = treeManager.getConversationMessages(topicId);
    res.success({ messages });
  }
}

module.exports = TopicController;
