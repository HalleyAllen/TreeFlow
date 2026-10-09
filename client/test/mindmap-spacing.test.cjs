const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function layoutFunctions() {
  const { splitNodeChildren } = await import('../src/components/mindmap/treeStructure.js');
  const source = fs.readFileSync(path.join(__dirname, '../src/components/mindmap/MindMap.jsx'), 'utf8');
  const start = source.indexOf('const MAIN_VERTICAL_SPACING');
  const end = source.indexOf('function MindMapInner');
  const context = { NODE_WIDTH: 280, NODE_HEIGHT: 220, splitNodeChildren };
  vm.runInNewContext(`${source.slice(start, end)}\nthis.layout = calculateLayout; this.height = calculateSubtreeHeight;`, context);
  return context;
}

const node = (id, children = [], quote = false) => ({ id, children, ...(quote ? { branchType: 'quote' } : {}) });

test('horizontal quote descendants share height and sibling branches use a compact gap', async () => {
  const { layout, height } = await layoutFunctions();
  const nested = node('nested', [], true);
  const first = node('first', [nested], true);
  const second = node('second', [], true);
  const root = node('root', [first, second]);
  assert.equal(height(first), 220);
  const { nodes } = layout(root);
  const positions = Object.fromEntries(nodes.map(n => [n.id, n.position]));
  assert.equal(positions.first.y, 0);
  assert.equal(positions.nested.y, 0);
  assert.equal(positions.second.y, 280);
  assert.ok(positions.nested.x > positions.first.x);
});

test('expanded and vertically continued branches reserve their real footprint without overlap', async () => {
  const { layout } = await layoutFunctions();
  const continued = node('continued');
  const nested = node('nested', [], true);
  const first = node('first', [continued, nested], true);
  const second = node('second', [], true);
  const root = node('root', [first, second]);
  const heights = { root: 200, first: 640, continued: 230, nested: 1100, second: 200 };
  const run = measured => Object.fromEntries(layout(root, {}, {}, {}, null, null, measured).nodes.map(n => [n.id, n.position]));
  let positions = run(heights);
  assert.equal(positions.continued.y, 720);
  assert.equal(positions.second.y, 1160);
  heights.nested = 200;
  positions = run(heights);
  assert.equal(positions.second.y, positions.continued.y + heights.continued + 60);
  heights.first = 200;
  positions = run(heights);
  assert.equal(positions.second.y, 200 + 80 + 230 + 60);
});

test('manual positions and widths survive compact branch spacing', async () => {
  const { layout } = await layoutFunctions();
  const first = node('first', [], true), second = node('second', [], true);
  const root = node('root', [first, second]);
  const offsets = {};
  const result = layout(root, {}, { root: { answer: true } }, { second: { x: 560, y: 700 } }, null, null, {}, offsets, {}, { root: { width: 800, height: 220 } });
  assert.equal(result.nodes.find(n => n.id === 'first').position.x, 920);
  assert.equal(result.nodes.find(n => n.id === 'second').position.x, 560);
  assert.equal(result.nodes.find(n => n.id === 'second').position.y, 700);
});
