const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChatHarness } = require('./helpers/chat-harness.cjs');

test('newly created questions identify the previous submitted node and remain available after completion', async () => {
  let count = 0;
  const harness = createChatHarness({ sendMessageStream: async (_question, _parent, ...args) => {
    const nodeId = `question-${++count}`;
    args.at(-1).onNode({ nodeId });
    return { nodeId, response: 'Answer' };
  } });
  harness.render('topic'); let chat = harness.render('topic');
  chat.setActiveEndNodeId('existing-end'); chat = harness.render('topic');
  await chat.sendMessage('First question'); chat = harness.render('topic');
  assert.deepEqual(JSON.parse(JSON.stringify(chat.questionNode)), { nodeId: 'question-1', previousNodeId: 'existing-end', topicId: 'topic' });
  chat.setActiveEndNodeId('other-branch'); chat = harness.render('topic');
  await chat.sendMessage('Second question'); chat = harness.render('topic');
  assert.deepEqual(JSON.parse(JSON.stringify(chat.questionNode)), { nodeId: 'question-2', previousNodeId: 'question-1', topicId: 'topic' });
});

test('a request that fails before creating a node keeps the previous expansion event', async () => {
  let count = 0;
  const harness = createChatHarness({ sendMessageStream: async (_question, _parent, ...args) => {
    if (++count > 1) throw new Error('Request failed before node creation');
    args.at(-1).onNode({ nodeId: 'created' });
    return { nodeId: 'created', response: 'Answer' };
  } });
  harness.render('topic'); let chat = harness.render('topic');
  await chat.sendMessage('First question'); chat = harness.render('topic');
  const previous = chat.questionNode;
  assert.equal((await chat.sendMessage('Failed request')).success, false);
  chat = harness.render('topic');
  assert.equal(chat.questionNode, previous);
});

test('topic changes reset automatic expansion history and reject late node notifications', async () => {
  let delayed;
  const harness = createChatHarness({ sendMessageStream: async (_question, _parent, ...args) => {
    const options = args.at(-1);
    return new Promise(resolve => { delayed = () => { options.onNode({ nodeId: 'old-node' }); resolve({ nodeId: 'old-node', response: 'Old reply' }); }; });
  } });
  harness.render('a'); let chat = harness.render('a');
  const sending = chat.sendMessage('Question in A');
  harness.render('b'); chat = harness.render('b');
  assert.equal(chat.questionNode, null);
  delayed(); await sending; chat = harness.render('b');
  assert.equal(chat.questionNode, null);
});
