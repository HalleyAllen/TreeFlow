const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = () => import('../src/components/mindmap/focusViewport.js');

test('new nodes are centered in the visible canvas above the composer without changing readable zoom', async () => {
  const { getNodeFocusViewport } = await load();
  const position = { x: 4000, y: 2500 }, size = { width: 280, height: 220 };
  const area = { width: 1200, top: 72, bottom: 680 };
  const viewport = getNodeFocusViewport(position, size, 0.8, area);
  assert.equal(viewport.zoom, 0.8);
  const left = position.x * viewport.zoom + viewport.x;
  const top = position.y * viewport.zoom + viewport.y;
  assert.ok(Math.abs(left + size.width * viewport.zoom / 2 - area.width / 2) < 0.01);
  assert.ok(top >= area.top && top + size.height * viewport.zoom <= area.bottom);
});

test('tall expanded nodes keep their question visible at the top rather than centering hidden text', async () => {
  const { getNodeFocusViewport } = await load();
  const position = { x: -500, y: 2000 }, size = { width: 280, height: 1600 };
  const viewport = getNodeFocusViewport(position, size, 1, { width: 1200, top: 72, bottom: 650 });
  assert.equal(viewport.zoom, 1);
  assert.equal(position.y * viewport.zoom + viewport.y, 72);
});

test('wide resized nodes zoom out only enough to fit a narrow canvas', async () => {
  const { getNodeFocusViewport } = await load();
  const position = { x: 900, y: 300 }, size = { width: 1200, height: 350 };
  const viewport = getNodeFocusViewport(position, size, 1.5, { width: 374, top: 72, bottom: 700 });
  const left = position.x * viewport.zoom + viewport.x;
  assert.ok(viewport.zoom < 1.5 && viewport.zoom >= 0.1);
  assert.ok(left >= 24 && left + size.width * viewport.zoom <= 350);
});
