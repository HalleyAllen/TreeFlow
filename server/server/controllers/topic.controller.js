/**
 * 话题控制器
 * 处理话题的CRUD操作
 */
class TopicController {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * 获取话题列表
   */
  listTopics(req, res) {
    const topics = this.agent.listTopics();
    res.success({ topics });
  }

  /**
   * 创建话题
   */
  createTopic(req, res) {
    const { name } = req.body;
    const result = this.agent.createTopic(name);
    res.success({ result });
  }

  /**
   * 切换话题
   */
  switchTopic(req, res) {
    const { topicId } = req.body;
    const result = this.agent.switchTopic(topicId);
    res.success({ result });
  }

  /**
   * 删除话题
   */
  deleteTopic(req, res) {
    const { topicId } = req.body;
    const result = this.agent.deleteTopic(topicId);
    res.success({ result });
  }

  /**
   * 获取当前话题
   */
  getCurrentTopic(req, res) {
    const currentTopic = this.agent.getCurrentTopic();
    res.success({ currentTopic });
  }
}

module.exports = TopicController;
