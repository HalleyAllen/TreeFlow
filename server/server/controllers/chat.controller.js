/**
 * 对话控制器
 * 处理AI对话和流式响应的业务逻辑
 */
const logger = require('../../core/utils/logger');

class ChatController {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * 发送消息
   */
  async ask(req, res) {
    const { question, fromNodeId, skillId } = req.body;
    const result = await this.agent.ask(question, fromNodeId, skillId);
    res.success({ response: result.response, nodeId: result.nodeId });
  }

  /**
   * 创建分支
   */
  createBranch(req, res) {
    const { fromNodeId } = req.body;
    const result = this.agent.createBranch(fromNodeId);
    res.success({ result });
  }

  /**
   * 切换分支
   */
  switchBranch(req, res) {
    const { branchId } = req.body;
    const result = this.agent.switchToBranch(branchId);
    res.success({ result });
  }

  /**
   * 获取对话树
   */
  getConversationTree(req, res) {
    const tree = this.agent.getConversationTree();
    res.success({ tree });
  }

  /**
   * 获取节点的分支列表
   */
  getNodeBranches(req, res) {
    const { nodeId } = req.query;
    const branches = this.agent.getNodeBranches(nodeId);
    res.success({ branches });
  }

  /**
   * 获取话题消息
   */
  getTopicMessages(req, res) {
    const { topicId } = req.query;
    const messages = this.agent.getTopicMessages(topicId);
    res.success({ messages });
  }

  /**
   * 流式对话（Ollama）
   */
  async askStream(req, res) {
    const { question, fromNodeId, skillId } = req.body;
    const model = this.agent.getModel();

    // 只有Ollama模型支持流式输出
    if (!model.startsWith('ollama/')) {
      const result = await this.agent.ask(question, fromNodeId, skillId);
      return res.success({ response: result.response, nodeId: result.nodeId, stream: false });
    }

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const modelName = model.replace('ollama/', '');
      const ollamaBaseUrl = this.agent.configManager.getOllamaBaseUrl();
      const currentTopic = this.agent.configManager.getCurrentTopic();

      // 获取对话历史
      let conversationHistory = [];
      if (this.agent.topicManager.conversations && this.agent.topicManager.conversations.has(currentTopic)) {
        const nodes = this.agent.topicManager.getConversationSequence(currentTopic);
        conversationHistory = nodes
          .filter(node => node.type === 'ai')
          .slice(-5)
          .flatMap(node => [
            { role: 'user', content: node.question },
            { role: 'assistant', content: node.response }
          ]);
      }

      const messages = [
        ...conversationHistory,
        { role: 'user', content: question }
      ];

      // 发送Ollama流式请求
      const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API请求失败: ${response.statusText}`);
      }

      // 处理流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              const content = data.message.content;
              fullResponse += content;
              res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }

      // 保存对话
      const result = await this.agent.ask(question, fromNodeId, skillId);
      
      // 发送完成事件
      res.write(`data: ${JSON.stringify({ done: true, nodeId: result.nodeId })}\n\n`);
      res.end();
    } catch (error) {
      logger.error('ChatController', '流式响应失败:', { error: error.message });
      res.write(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
      res.end();
    }
  }
}

module.exports = ChatController;
