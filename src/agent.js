const { OpenAI } = require('openai');
const TokenManager = require('./tokenManager');

class TreeFlowAgent {
  constructor() {
    this.tokenManager = new TokenManager();
    this.openai = null;
    this.topics = {
      'default': {
        id: 'default',
        name: '默认话题',
        conversationTree: {
          id: 'root',
          parentId: null,
          message: '',
          response: '',
          children: []
        },
        currentNode: null
      }
    };
    this.currentTopic = 'default';
    this.currentModel = 'gpt-3.5-turbo';
    // 初始化默认话题的currentNode
    this.topics[this.currentTopic].currentNode = this.topics[this.currentTopic].conversationTree;
  }

  setModel(model) {
    this.currentModel = model;
    return `已切换到模型: ${model}`;
  }

  getModel() {
    return this.currentModel;
  }

  setApiKey(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || 'your-api-key-here'
    });
    return 'API Key已设置';
  }

  addToken(token) {
    return this.tokenManager.addToken(token);
  }

  getTokenStats() {
    return this.tokenManager.getTokenStats();
  }

  // 更新Token状态
  updateTokenStatus(token, status) {
    return this.tokenManager.updateTokenStatus(token, status);
  }

  // 清除所有Token
  clearTokens() {
    return this.tokenManager.clearTokens();
  }

  // 获取Token详细信息
  getTokenDetails(token) {
    return this.tokenManager.getTokenDetails(token);
  }

  async ask(question) {
    try {
      if (!this.openai) {
        try {
          // 根据当前模型获取合适的Token
          const token = this.tokenManager.getTokenByModel(this.currentModel);
          this.setApiKey(token);
        } catch (error) {
          throw new Error('没有可用的token，请先添加token');
        }
      }

      const response = await this.openai.chat.completions.create({
        model: this.currentModel,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: question }
        ]
      });

      const aiResponse = response.choices[0].message.content;

      const newNode = {
        id: `node-${Date.now()}`,
        parentId: this.topics[this.currentTopic].currentNode.id,
        message: question,
        response: aiResponse,
        children: []
      };

      this.topics[this.currentTopic].currentNode.children.push(newNode);
      this.topics[this.currentTopic].currentNode = newNode;

      return aiResponse;
    } catch (error) {
      throw new Error(`AI请求失败: ${error.message}`);
    }
  }

  createBranch() {
    const currentTopic = this.topics[this.currentTopic];
    const newBranch = {
      id: `branch-${Date.now()}`,
      parentId: currentTopic.currentNode.parentId,
      message: currentTopic.currentNode.message,
      response: currentTopic.currentNode.response,
      children: []
    };

    if (currentTopic.currentNode.parentId) {
      const parentNode = this.findNodeById(currentTopic.conversationTree, currentTopic.currentNode.parentId);
      if (parentNode) {
        parentNode.children.push(newBranch);
        currentTopic.currentNode = newBranch;
        return `已创建新分支: ${newBranch.id}`;
      }
    }
    return '无法创建分支';
  }

  switchToBranch(branchId) {
    const currentTopic = this.topics[this.currentTopic];
    const targetNode = this.findNodeById(currentTopic.conversationTree, branchId);
    if (targetNode) {
      currentTopic.currentNode = targetNode;
      return `已切换到分支: ${branchId}`;
    }
    return '分支不存在';
  }

  findNodeById(node, id) {
    if (node.id === id) {
      return node;
    }
    for (const child of node.children) {
      const found = this.findNodeById(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  getCurrentBranch() {
    return this.topics[this.currentTopic].currentNode.id;
  }

  getConversationTree() {
    return this.topics[this.currentTopic].conversationTree;
  }

  // 话题管理方法
  createTopic(name) {
    const topicId = `topic-${Date.now()}`;
    this.topics[topicId] = {
      id: topicId,
      name: name,
      conversationTree: {
        id: 'root',
        parentId: null,
        message: '',
        response: '',
        children: []
      },
      currentNode: null
    };
    this.topics[topicId].currentNode = this.topics[topicId].conversationTree;
    return `已创建话题: ${name} (ID: ${topicId})`;
  }

  switchTopic(topicId) {
    if (this.topics[topicId]) {
      this.currentTopic = topicId;
      return `已切换到话题: ${this.topics[topicId].name}`;
    }
    return '话题不存在';
  }

  listTopics() {
    return Object.values(this.topics).map(topic => ({
      id: topic.id,
      name: topic.name
    }));
  }

  deleteTopic(topicId) {
    if (topicId === 'default') {
      return '默认话题无法删除';
    }
    if (this.topics[topicId]) {
      delete this.topics[topicId];
      if (this.currentTopic === topicId) {
        this.currentTopic = 'default';
      }
      return `已删除话题: ${topicId}`;
    }
    return '话题不存在';
  }

  getCurrentTopic() {
    return {
      id: this.currentTopic,
      name: this.topics[this.currentTopic].name
    };
  }
}

module.exports = { TreeFlowAgent };