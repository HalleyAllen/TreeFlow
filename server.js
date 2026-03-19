const express = require('express');
const cors = require('cors');
const { TreeFlowAgent } = require('./src/agent');

const app = express();
app.use(cors());
app.use(express.json());

// 创建TreeFlowAgent实例
const agent = new TreeFlowAgent();

// API路由
app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;
    const response = await agent.ask(question);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/branch', (req, res) => {
  try {
    const result = agent.createBranch();
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/switch-branch', (req, res) => {
  try {
    const { branchId } = req.body;
    const result = agent.switchToBranch(branchId);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/add-token', (req, res) => {
  try {
    const { token } = req.body;
    const result = agent.addToken(token);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tokens', (req, res) => {
  try {
    const stats = agent.getTokenStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取可用的模型列表
app.get('/api/models', (req, res) => {
  try {
    // 从token中提取可用的模型
    const tokens = agent.tokenManager.tokens;
    const availableModels = [];
    
    tokens.forEach(token => {
      if (!availableModels.some(model => model.id === token.model)) {
        availableModels.push({
          id: token.model,
          name: `${token.provider} - ${token.model}`,
          available: true
        });
      }
    });
    
    res.json({ models: availableModels });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 设置当前模型
app.post('/api/set-model', (req, res) => {
  try {
    const { model } = req.body;
    const result = agent.setModel(model);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取当前模型
app.get('/api/current-model', (req, res) => {
  try {
    const model = agent.getModel();
    res.json({ model });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/create-topic', (req, res) => {
  try {
    const { name } = req.body;
    const result = agent.createTopic(name);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/switch-topic', (req, res) => {
  try {
    const { topicId } = req.body;
    const result = agent.switchTopic(topicId);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/topics', (req, res) => {
  try {
    const topics = agent.listTopics();
    res.json({ topics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/delete-topic', (req, res) => {
  try {
    const { topicId } = req.body;
    const result = agent.deleteTopic(topicId);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除token
app.post('/api/remove-token', (req, res) => {
  try {
    const { token } = req.body;
    const result = agent.tokenManager.removeToken(token);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新token状态
app.post('/api/update-token-status', (req, res) => {
  try {
    const { token, status } = req.body;
    const result = agent.updateTokenStatus(token, status);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 清除所有token
app.post('/api/clear-tokens', (req, res) => {
  try {
    const result = agent.clearTokens();
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 检查Token健康状态
app.post('/api/check-token-health', async (req, res) => {
  try {
    const { token } = req.body;
    const result = await agent.tokenManager.checkTokenHealth(token);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 批量检查所有Token健康状态
app.post('/api/check-all-tokens-health', async (req, res) => {
  try {
    const results = await agent.tokenManager.checkAllTokensHealth();
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取Token使用统计
app.get('/api/token-usage-stats', (req, res) => {
  try {
    const stats = agent.tokenManager.getTokenUsageStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取指定模型的可用Token数量
app.get('/api/available-tokens/:model', (req, res) => {
  try {
    const { model } = req.params;
    const count = agent.tokenManager.getAvailableTokensByModel(model);
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/current-topic', (req, res) => {
  try {
    const currentTopic = agent.getCurrentTopic();
    res.json({ currentTopic });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversation-tree', (req, res) => {
  try {
    const tree = agent.getConversationTree();
    res.json({ tree });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 启动服务器
const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
