const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const TopicManager = require('../core/managers/TopicManager');
const TreeManager = require('../core/managers/ConversationTreeManager');
const TreeController = require('../server/controllers/tree.controller');
const { TreeFlowAgent } = require('../core/agent/TreeFlowAgent');
const logger = require('../core/utils/logger');
for (const level of ['info', 'warn', 'error']) logger[level] = () => {};

function fixture(file = 'unused') {
  const topics = new TopicManager(file);
  if (file === 'unused') topics.saveTopics = () => true;
  const trees = new TreeManager(topics);
  const agent = Object.create(TreeFlowAgent.prototype);
  Object.assign(agent, { topicManager: topics, conversationTreeManager: trees, configManager: {
    getCurrentTopic: () => 'default', getCurrentModel: () => 'mock', getOllamaBaseUrl: () => '',
  }, skillManager: { executeSkill: () => ({}) } });
  const services = { topicManager: topics, conversationTreeManager: trees, agent };
  const controller = new TreeController({ get: key => services[key] });
  return { topics, trees, agent, controller };
}

test('quote branches preserve a selectable main endpoint; continuing it inserts a main child before quotes', () => {
  const { topics, trees, agent, controller } = fixture();
  const root = trees.addConversationNode('default', 'Main question', 'Main answer');
  const quote1 = agent._prepareAsk('Quoted question', root.id, null, null, 'quote', [root.id]).newNode;
  const quote2 = agent._prepareAsk('Another quote', root.id, null, null, 'quote', [root.id]).newNode;
  let view = controller.buildTreeNode(root, topics.getTopic('default'));
  assert.equal(view.isContinuationEnd, true);
  assert.equal(view.branchCount, 2);
  const continued = agent._prepareAsk('Continue main', root.id);
  assert.deepEqual(root.children.map(child => child.id), [continued.newNode.id, quote1.id, quote2.id]);
  assert.deepEqual(continued.conversationHistory.map(message => message.content), ['Main question', 'Main answer']);
  view = controller.buildTreeNode(root, topics.getTopic('default'));
  assert.equal(view.isContinuationEnd, false);
  assert.equal(view.branchCount, 2);
  const quoteContinuation = agent._prepareAsk('Continue quote branch', quote1.id).newNode;
  assert.equal(quoteContinuation.parentId, quote1.id);
  assert.equal(root.children[0].id, continued.newNode.id);
  assert.equal(controller.serializeNode(quote2, topics.getTopic('default')).isContinuationEnd, true);
});

test('quote-only endpoints, selection and main ordering persist through reload', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'treeflow-quote-main-'));
  try {
    const { topics, trees } = fixture(path.join(directory, 'topics.json'));
    const root = trees.addConversationNode('default', 'Main', 'Answer');
    const quote = trees.addConversationNode('default', 'Quote', 'Answer', { branchType: 'quote' }, root.id);
    topics.getTopic('default').activeEndNodeId = root.id;
    topics.saveTopics();
    let loaded = new TopicManager(topics.topicsFile); loaded.loadTopics();
    assert.equal(loaded.getTopic('default').activeEndNodeId, root.id);
    const continuation = new TreeManager(loaded).addConversationNode('default', 'Continue', 'Answer', {}, root.id);
    loaded = new TopicManager(topics.topicsFile); loaded.loadTopics();
    assert.deepEqual(loaded.getTopic('default').conversationTree.children.map(child => child.id), [continuation.id, quote.id]);
  } finally { assert.equal(path.dirname(directory), os.tmpdir()); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('existing normal continuations retain priority when ordinary or quote siblings are added', () => {
  const { trees, topics, controller } = fixture();
  const root = trees.addConversationNode('default', 'Root', 'Answer');
  const main = trees.addConversationNode('default', 'Main', 'Answer', {}, root.id);
  const sibling = trees.addConversationNode('default', 'Sibling', 'Answer', {}, root.id);
  const quote = trees.addConversationNode('default', 'Quote', 'Answer', { branchType: 'quote' }, root.id);
  assert.deepEqual(root.children.map(child => child.id), [main.id, sibling.id, quote.id]);
  const view = controller.buildTreeNode(root, topics.getTopic('default'));
  assert.equal(view.isContinuationEnd, false);
  assert.equal(view.branchCount, 2);
});
