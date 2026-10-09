const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { buildSync } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let component, directory;

before(async () => {
  directory = fs.mkdtempSync(path.join(__dirname, '.markdown-render-'));
  const result = buildSync({
    entryPoints: [path.join(__dirname, '../src/components/common/MarkdownAnswer.jsx')],
    bundle: true, packages: 'external', format: 'esm', platform: 'node', jsx: 'automatic', write: false,
  });
  const modulePath = path.join(directory, 'component.mjs');
  fs.writeFileSync(modulePath, result.outputFiles[0].text);
  component = (await import(pathToFileURL(modulePath).href)).default;
});
after(() => {
  if (directory) {
    assert.equal(path.dirname(directory), __dirname);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
const render = content => renderToStaticMarkup(React.createElement(component, { content }));

test('renders answer headings, emphasis, lists, quotations and code as elements', () => {
  const html = render('# Title\n\n**Bold** and *italic* with `inline` code.\n\n- First\n- Second\n\n> Quoted text\n\n```js\nconst value = 1;\n```');
  for (const expected of ['<h1>Title</h1>', '<strong>Bold</strong>', '<em>italic</em>', '<li>First</li>', '<blockquote>', '<code>inline</code>', 'language-js', 'const value = 1;']) assert.ok(html.includes(expected), expected);
});
test('renders GFM tables, task lists and strikethrough', () => {
  const html = render('| Name | Value |\n| --- | --- |\n| Alpha | 1 |\n\n- [x] Complete\n\n~~Removed~~');
  for (const expected of ['<table>', '<th>Name</th>', '<td>Alpha</td>', 'type="checkbox"', '<del>Removed</del>']) assert.ok(html.includes(expected), expected);
});
test('does not execute model-provided HTML or expose unsafe URL protocols', () => {
  const html = render('<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n[Docs](https://example.com)');
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('href="https://example.com"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});
test('incomplete streaming Markdown still renders readable content', () => {
  assert.ok(render('Starting **partial').includes('partial'));
  assert.ok(render('```js\nconst partial =').includes('const partial ='));
});
