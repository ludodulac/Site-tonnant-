// Native Node.js smoke test: no packages or browser automation required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const code = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
assert.match(html, /<html lang="fr">/);
assert.match(html, /id="universe"/);
assert.match(css, /@media\(max-width:760px\)/);
const ids = [...code.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
for (const id of new Set(ids)) assert.ok(html.includes('id="' + id + '"'), 'Missing DOM id: ' + id);

function context2D() {
  return new Proxy({}, {
    get(o, key) {
      if (key in o) return o[key];
      if (key === 'createRadialGradient' || key === 'createLinearGradient')
        return () => ({ addColorStop() {} });
      return () => {};
    },
    set(o, key, value) { o[key] = value; return true; }
  });
}
const ctx = context2D();
const elements = new Map();
const classList = () => ({ add() {}, remove() {}, contains() { return false; } });
function element(name) {
  return {
    tagName: name === 'worldInput' ? 'INPUT' : 'DIV',
    style: { setProperty() {} },
    classList: classList(), hidden: false, textContent: '', value: '',
    listeners: {},
    addEventListener(type, handler) { this.listeners[type] = handler; },
    setAttribute() {}, focus() {}, blur() {}, append() {}, remove() {},
    replaceChildren() {}, click() {}, select() {},
    getContext() { return ctx; },
    toDataURL() { return 'data:image/png;base64,abc'; },
    querySelectorAll() { return []; }
  };
}
function get(id) {
  if (!elements.has(id)) elements.set(id, element(id));
  return elements.get(id);
}
const records = {};
const localStorage = {
  getItem(key) { return records[key] || null; },
  setItem(key, value) { records[key] = value; }
};
let draw = null;
const location = { href: 'https://example.com/', pathname: '/', search: '', hash: '' };
const sandbox = {
  window: {
    innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: () => ({ matches: false }), addEventListener() {}
  },
  document: {
    getElementById: get, createElement: element,
    addEventListener() {}, contains() { return true; },
    body: { classList: classList(), append() {} }, hidden: false
  },
  location, history: { replaceState() {} }, localStorage,
  requestAnimationFrame(cb) { draw = cb; },
  setTimeout, clearTimeout, Math, Date, performance: { now: () => 1000 },
  navigator: {}, URL, URLSearchParams,
};
sandbox.window.location = location;
vm.runInNewContext(code, sandbox, { timeout: 3000, filename: 'app.js' });
assert.equal(typeof draw, 'function', 'Scene did not start rendering');
draw(16);
assert.equal(get('intro').hidden, false);
get('worldInput').value = 'Le secret du ciel';
get('worldForm').listeners.submit({ preventDefault() {} });
draw(32);
assert.equal(get('experience').hidden, false);
assert.match(get('worldTitle').textContent, /Le secret du ciel/);
assert.equal(JSON.parse(records['anomalia.atlas.v1']).length, 1);
const space = get('universe');
space.listeners.pointerdown({ clientX: 420, clientY: 320, pointerType: 'mouse' });
space.listeners.pointerup({ clientX: 420, clientY: 320, pointerType: 'mouse' });
draw(48);
assert.equal(get('starCount').textContent, '01');
assert.equal(JSON.parse(records['anomalia.atlas.v1'])[0].stars.length, 1);
get('newWorldButton').listeners.click();
assert.equal(get('intro').hidden, false);
console.log('✓ DOM, rendering, world generation, star planting, atlas persistence and return home');
