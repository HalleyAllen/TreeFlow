const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/components/mindmap/treeStructure.js');

test('quotes attached to a terminal node remain branches without a main continuation', async () => {
  const { splitNodeChildren } = await load();
  const quotes = [{ id: 'q1', branchType: 'quote' }, { id: 'q2', branchType: 'quote' }];
  const result = splitNodeChildren({ children: quotes });
  assert.equal(result.mainChild, null);
  assert.deepEqual(result.branchChildren, quotes);
});

test('legacy quote-first ordering still distinguishes the main continuation and sibling branches', async () => {
  const { splitNodeChildren } = await load();
  const quote = { id: 'quote', branchType: 'quote' };
  const main = { id: 'main' };
  const branch = { id: 'branch' };
  const result = splitNodeChildren({ children: [quote, main, branch] });
  assert.equal(result.mainChild, main);
  assert.deepEqual(result.branchChildren, [quote, branch]);
  assert.deepEqual(splitNodeChildren({}), { mainChild: null, branchChildren: [] });
});
