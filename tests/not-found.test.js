const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, '404.html'), 'utf8');

test.each(['/missing', '/pages/housing/missing.html', '/missing/deep/path/'])('404 assets and recovery links resolve at %s', missingPath => {
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map(match => match[1]);
  expect(references.length).toBeGreaterThan(10);
  for (const reference of references) {
    expect(reference.startsWith('/')).toBe(true);
    const url = new URL(reference, `https://biscoon.com${missingPath}`);
    expect(url.pathname).toBe(reference);
    expect(fs.existsSync(path.join(root, reference))).toBe(true);
  }
  expect(html).toContain('content="noindex"');
  expect(html).not.toContain('assets/js/biscoon.js');
});

test('404 menu supports toggle, Escape, focus return, and desktop reset without app services', () => {
  const handlers = {};
  const button = { classList: { toggle: jest.fn() }, setAttribute: (_, value) => { button.expanded = value; },
    getAttribute: () => button.expanded, addEventListener: (_, handler) => { handlers.toggle = handler; }, focus: jest.fn() };
  const drawer = { classList: { toggle: jest.fn() } };
  const document = { getElementById: id => id === 'hamburger' ? button : drawer,
    addEventListener: (event, handler) => { handlers[event] = handler; } };
  const window = { matchMedia: () => ({ addEventListener: (_, handler) => { handlers.resize = handler; } }) };
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(script, { document, window });
  expect(drawer.inert).toBe(true);
  handlers.toggle();
  expect(button.expanded).toBe('true');
  expect(drawer.inert).toBe(false);
  handlers.keydown({ key: 'Escape' });
  expect(button.expanded).toBe('false');
  expect(button.focus).toHaveBeenCalledTimes(1);
  handlers.toggle();
  handlers.resize({ matches: true });
  expect(drawer.inert).toBe(true);
});
