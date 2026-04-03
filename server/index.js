/**
 * TreeFlow CLI 入口
 * 提供命令行交互界面
 */
const { TreeFlowAgent } = require('./core/agent/TreeFlowAgent');
const readline = require('readline');
const logger = require('./core/utils/logger');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const agent = new TreeFlowAgent();

function startConversation() {
  rl.question('请输入您的问题 (输入exit退出，输入branch创建分支，输入switch [分支ID] 切换分支，输入tokens查看token状态，输入create topic [话题名称] 创建话题，输入switch topic [话题ID] 切换话题，输入list topics 列出话题，输入delete topic [话题ID] 删除话题，输入current topic 查看当前话题): ', (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      return;
    }

    if (input.toLowerCase() === 'branch') {
      const result = agent.createBranch();
      logger.info('CLI', result);
      startConversation();
      return;
    }

    if (input.toLowerCase().startsWith('switch ')) {
      const parts = input.substring(7).trim().split(' ');
      if (parts[0] === 'topic') {
        const topicId = parts.slice(1).join(' ');
        const result = agent.switchTopic(topicId);
        logger.info('CLI', result);
        startConversation();
        return;
      } else {
        const branchId = input.substring(7).trim();
        const result = agent.switchToBranch(branchId);
        logger.info('CLI', result);
        startConversation();
        return;
      }
    }

    if (input.toLowerCase() === 'tokens') {
      const stats = agent.getTokenStats();
      logger.info('CLI', 'Token状态:', stats);
      startConversation();
      return;
    }

    if (input.toLowerCase().startsWith('addtoken ')) {
      const token = input.substring(8).trim();
      const result = agent.addToken(token);
      logger.info('CLI', result);
      startConversation();
      return;
    }

    if (input.toLowerCase().startsWith('create topic ')) {
      const topicName = input.substring(13).trim();
      const result = agent.createTopic(topicName);
      logger.info('CLI', result);
      startConversation();
      return;
    }

    if (input.toLowerCase() === 'list topics') {
      const topics = agent.listTopics();
      logger.info('CLI', '话题列表:', topics);
      startConversation();
      return;
    }

    if (input.toLowerCase().startsWith('delete topic ')) {
      const topicId = input.substring(13).trim();
      const result = agent.deleteTopic(topicId);
      logger.info('CLI', result);
      startConversation();
      return;
    }

    if (input.toLowerCase() === 'current topic') {
      const currentTopic = agent.getCurrentTopic();
      logger.info('CLI', '当前话题:', currentTopic);
      startConversation();
      return;
    }

    agent.ask(input).then((response) => {
      logger.info('CLI', 'AI:', response);
      startConversation();
    }).catch((error) => {
      logger.error('CLI', '错误:', { error: error.message });
      startConversation();
    });
  });
}

logger.info('CLI', 'TreeFlow AI代理系统已启动');
logger.info('CLI', '您可以开始与AI对话，输入exit退出');
startConversation();
