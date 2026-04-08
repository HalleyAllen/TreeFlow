/**
 * 对话控制器
 * 处理AI对话和流式响应的业务逻辑
 * 重构后：直接使用 ConversationTreeManager 处理对话树相关操作
 */
class ChatController {
  constructor(agent) {
    this.agent = agent;
    // 直接使用 ConversationTreeManager
    this.treeManager = agent.conversationTreeManager;
    this.topicManager = agent.topicManager;
    this.configManager = agent.configManager;
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
