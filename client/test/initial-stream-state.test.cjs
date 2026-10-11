const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createChatHarness } = require('./helpers/chat-harness.cjs');

test('generation state is available from node creation, before the first text arrives', async () => {
  let options, finish;
  const harness = createChatHarness({ sendMessageStream: async (_question, _parent, ...args) => {
    options = args.at(-1);
    return new Promise(resolve => { finish = resolve; });
  } });
  harness.render('topic'); let chat = harness.render('topic');
  const sending = chat.sendMessage('Question');
  options.onNode({ nodeId: 'new-node' }); chat = harness.render('topic');
  assert.equal(chat.streamingNode.nodeId, 'new-node');
  assert.equal(chat.streamingNode.content, '');
  assert.equal(chat.streamingNode.done, false);
  options.onDelta({ content: 'Partial text' }); chat = harness.render('topic');
  assert.equal(chat.streamingNode.content, 'Partial text');
  finish({ nodeId: 'new-node', response: 'Complete text' }); await sending; chat = harness.render('topic');
  assert.equal(chat.streamingNode.done, true);
  assert.equal(chat.streamingNode.content, 'Complete text');
});
