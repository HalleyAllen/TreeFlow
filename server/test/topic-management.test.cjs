const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const TopicManager = require('../core/managers/TopicManager');
const TreeManager = require('../core/managers/ConversationTreeManager');
const TopicController = require('../server/controllers/topic.controller');
const logger = require('../core/utils/logger');
for (const level of ['info', 'warn', 'error']) logger[level] = () => {};

function setup(manager = new TopicManager('unused')) {
  let selected = 'default';
  const services = { topicManager: manager, conversationTreeManager: new TreeManager(manager), configManager: {
    getCurrentTopic: () => selected, setCurrentTopic: id => { selected = id; },
  } };
  const controller = new TopicController({ get: name => services[name] });
  const call = (method, req) => {
    let response;
    controller[method](req, { success: data => { response = { status: 200, data }; }, error: (error, status) => { response = { status, error }; } });
    return response;
  };
  return { manager, trees: services.conversationTreeManager, call, select: id => { selected = id; }, selected: () => selected };
}

test('manual title persists and is not overwritten by the first question', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'treeflow-topic-edit-'));
  try {
    const s = setup(new TopicManager(path.join(directory, 'topics.json')));
    const { topic } = s.manager.createTopic(undefined, true);
    assert.equal(s.call('renameTopic', { params: { topicId: topic.id }, body: { name: '  Manual title  ' } }).status, 200);
    s.trees.addConversationNode(topic.id, 'First question', 'Answer');
    assert.equal(topic.name, 'Manual title');
    assert.equal(topic.autoNameFromFirstQuestion, false);
    const reloaded = new TopicManager(s.manager.topicsFile); reloaded.loadTopics();
    assert.equal(reloaded.getTopic(topic.id).name, 'Manual title');
    assert.equal(reloaded.getTopic(topic.id).conversationTree.message, 'First question');
  } finally { assert.equal(path.dirname(directory), os.tmpdir()); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('rename rejects missing topics, blank and non-string names without changing state', () => {
  const s = setup(); s.manager.saveTopics = () => true;
  const original = s.manager.getTopic('default').name;
  for (const name of ['', '   ', null, {}, 42]) {
    assert.equal(s.call('renameTopic', { params: { topicId: 'default' }, body: { name } }).status, 400);
  }
  assert.equal(s.call('renameTopic', { params: { topicId: 'missing' }, body: { name: 'Title' } }).status, 404);
  assert.equal(s.manager.getTopic('default').name, original);
});

test('rename and delete roll back when persistence fails', () => {
  const s = setup(); s.manager.saveTopics = () => true;
  const { topic } = s.manager.createTopic(undefined, true);
  s.select(topic.id);
  const original = { ...topic };
  s.manager.saveTopics = () => false;
  assert.equal(s.call('renameTopic', { params: { topicId: topic.id }, body: { name: 'Changed' } }).status, 500);
  assert.deepEqual(topic, original);
  assert.equal(s.call('deleteTopic', { body: { topicId: topic.id } }).status, 500);
  assert.equal(s.manager.getTopic(topic.id), topic);
  assert.equal(s.selected(), topic.id);
});

test('delete inactive topic keeps selection; deleting active topic selects a remaining topic', () => {
  const s = setup(); s.manager.saveTopics = () => true;
  const a = s.manager.createTopic('A', true).topic;
  const b = s.manager.createTopic('B', true).topic;
  s.select(a.id);
  assert.equal(s.call('deleteTopic', { body: { topicId: b.id } }).status, 200);
  assert.equal(s.selected(), a.id);
  assert.equal(s.call('deleteTopic', { body: { topicId: a.id } }).status, 200);
  assert.equal(s.selected(), 'default');
  assert.equal(s.call('deleteTopic', { body: { topicId: a.id } }).status, 404);
});

test('deleted default does not reappear on reload and current-topic recovery uses a remaining topic', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'treeflow-topic-delete-'));
  try {
    const s = setup(new TopicManager(path.join(directory, 'topics.json')));
    const remaining = s.manager.createTopic('Remaining', true).topic;
    assert.equal(s.call('deleteTopic', { body: { topicId: 'default' } }).status, 200);
    assert.equal(s.selected(), remaining.id);
    const reloaded = new TopicManager(s.manager.topicsFile); reloaded.loadTopics();
    assert.equal(reloaded.getTopic('default'), null);
    const recovered = setup(reloaded);
    assert.equal(recovered.call('getCurrentTopic', {}).data.currentTopic.id, remaining.id);
  } finally { assert.equal(path.dirname(directory), os.tmpdir()); fs.rmSync(directory, { recursive: true, force: true }); }
});

test('deleting the last topic provides a fresh empty topic with a new identity', () => {
  const s = setup(); s.manager.saveTopics = () => true;
  s.trees.addConversationNode('default', 'Old question', 'Old answer');
  assert.equal(s.call('deleteTopic', { body: { topicId: 'default' } }).status, 200);
  const [replacement] = s.manager.getTopics();
  assert.equal(s.manager.getTopics().length, 1);
  assert.notEqual(replacement.id, 'default');
  assert.equal(s.selected(), replacement.id);
  assert.equal(replacement.conversationTree, null);
  assert.equal(replacement.currentNode, null);
  assert.equal(replacement.autoNameFromFirstQuestion, true);
  assert.deepEqual(replacement.nodePositions, {});
  assert.deepEqual(replacement.nodeSizes, {});
  assert.equal(s.call('deleteTopic', { body: { topicId: replacement.id } }).status, 200);
  assert.notEqual(s.selected(), replacement.id);
});
