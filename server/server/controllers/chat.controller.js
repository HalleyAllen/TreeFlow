/**
 * 对话控制器
 * 处理AI对话和流式响应的业务逻辑
 * 重构后：通过 ServiceContainer 依赖注入，不再直接访问 TreeFlowAgent 内部属性
 */
class ChatController {
  constructor(container) {
    // 从容器中获取所需服务，实现依赖注入解耦
    this.agent = container.get('agent');
    this.treeManager = container.get('conversationTreeManager');
    this.topicManager = container.get('topicManager');
    this.configManager = container.get('configManager');
  }

  /**
   * 发送消息
   */
  async ask(req, res) {
    const { question, fromNodeId, skillId, model, provider, branchType, quoteNodeIds } = req.body;
    const result = await this.agent.ask(question, fromNodeId, skillId, model, provider, branchType, quoteNodeIds);
    res.success({ response: result.response, nodeId: result.nodeId });
  }

  /**
   * 创建分支
   */
  createBranch(req, res) {
    const { fromNodeId } = req.body;
    const currentTopic = this.configManager.getCurrentTopic();
    const result = this.treeManager.createBranchFromNode(currentTopic, fromNodeId);
    res.success({ result });
  }

  /**
   * 切换分支
   */
  switchBranch(req, res) {
    const { branchId } = req.body;
    const currentTopic = this.configManager.getCurrentTopic();
    const result = this.treeManager.switchToBranch(currentTopic, branchId);
    res.success({ result });
  }

  /**
   * 获取对话树
   */
  getConversationTree(_req, res) {
    const currentTopic = this.configManager.getCurrentTopic();
    const tree = this.treeManager.getConversationTree(currentTopic);
    res.success({ tree });
  }

  /**
   * 获取节点的分支列表
   */
  getNodeBranches(req, res) {
    const { nodeId } = req.query;
    const currentTopic = this.configManager.getCurrentTopic();
    const branches = this.treeManager.getNodeBranches(currentTopic, nodeId);
    res.success({ branches });
  }

  /**
   * 获取话题消息
   */
  getTopicMessages(req, res) {
    const { topicId } = req.query;
    const tid = topicId || this.configManager.getCurrentTopic();
    const messages = this.treeManager.getConversationMessages(tid);
    res.success({ messages });
  }
}

module.exports = ChatController;
