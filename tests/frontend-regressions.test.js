const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

function listingForm() {
  const fields = new Map();
  function field(id) {
    if (!fields.has(id)) fields.set(id, { value: '', textContent: '', style: {}, dataset: {}, validity: { valid: true }, parentElement: { setAttribute: jest.fn() } });
    return fields.get(id);
  }
  const context = vm.createContext({
    window: { location: { origin: 'http://localhost:4000' } },
    document: { getElementById: field, addEventListener() {} },
    localStorage: { getItem() { return null; } },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/listing.js'), 'utf8'), context);
  field('title').value = 'Fixture listing';
  field('description').value = 'Fixture details';
  return { context, field, update: () => vm.runInContext('updateListingProgress()', context) };
}

test('photography readiness requires a photo; optional photos do not block other categories', () => {
  const { context, field, update } = listingForm();
  field('category').value = 'photography';
  field('subcategory').value = 'portrait';
  update();
  expect(field('listingProgressLabel').textContent).not.toBe('Ready to publish');
  vm.runInContext('editingListingImages = ["fixture"]', context);
  update();
  expect(field('listingProgressLabel').textContent).toBe('Ready to publish');
  expect(field('listingProgressFill').style.width).toBe('100%');
  vm.runInContext('editingListingImages = []', context);
  field('category').value = 'community';
  field('subcategory').value = 'organizations';
  field('area').value = 'Boston';
  field('contactEmail').value = 'fixture@example.com';
  update();
  expect(field('listingProgressLabel').textContent).toBe('Ready to publish');
});

test('photos cannot compensate for missing rent, whitespace, or invalid email', () => {
  const { context, field, update } = listingForm();
  field('category').value = 'housing';
  field('subcategory').value = 'room';
  field('area').value = 'Boston';
  field('availability').value = 'Available now';
  field('contactEmail').value = 'fixture@example.com';
  vm.runInContext('editingListingImages = ["fixture"]', context);
  update();
  expect(field('listingProgressLabel').textContent).not.toBe('Ready to publish');
  field('price').value = '$950';
  update();
  expect(field('listingProgressLabel').textContent).toBe('Ready to publish');
  field('contactEmail').validity.valid = false;
  update();
  expect(field('listingProgressLabel').textContent).not.toBe('Ready to publish');
  field('contactEmail').validity.valid = true;
  field('title').value = '   ';
  update();
  expect(field('listingProgressLabel').textContent).not.toBe('Ready to publish');
});

function browseFunctions(context) {
  const source = ts.createSourceFile('biscoon.ts', fs.readFileSync(path.join(__dirname, '../assets/ts/biscoon.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const names = ['fetchListingsPage', 'bindSortSelect', 'renderListingsIntoFeed'];
  const code = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(source)).join('\n');
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
}

test('price sort goes to the API and changing sort reloads the first page', async () => {
  const select = { value: 'price-low', dataset: {}, options: ['Newest first', 'Price: Low', 'Price: High'].map(textContent => ({ textContent, value: '' })), addEventListener: jest.fn() };
  const fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ listings: [], total: 0 }) });
  const reload = jest.fn();
  const context = vm.createContext({
    URL, LISTINGS_PAGE_SIZE: 24, getApiBase: () => 'http://localhost:4000',
    getUserLocationCity: async () => 'Boston', fetch,
    document: { querySelectorAll: () => [select] }, browseSession: {},
    inferPageCategory: () => 'jobs', hydrateDynamicListings: reload,
  });
  browseFunctions(context);
  await vm.runInContext('fetchListingsPage({sort:"price-low",category:"jobs",page:2})', context);
  const url = new URL(fetch.mock.calls[0][0]);
  expect(url.searchParams.get('sort')).toBe('price-low');
  expect(url.searchParams.get('page')).toBe('2');
  vm.runInContext('bindSortSelect()', context);
  expect(select.options.map(option => option.value)).toEqual(['newest', 'price-low', 'price-high']);
  select.addEventListener.mock.calls[0][1]();
  expect(reload).toHaveBeenCalledWith('jobs', { page: 1, append: false });
});

test('rendering preserves server order across categories', () => {
  const context = vm.createContext({
    updateFilterChipsFromListings() {}, listingToCard: item => `<article>${item.id}</article>`,
    window: { dispatchEvent() {} }, CustomEvent: class {},
  });
  browseFunctions(context);
  context.feed = { innerHTML: '', parentElement: { setAttribute() {} } };
  vm.runInContext('renderListingsIntoFeed([{id:"cheap",category:"jobs"},{id:"medium",category:"tech"},{id:"expensive",category:"jobs"}],feed,false)', context);
  expect(context.feed.innerHTML).toBe('<article>cheap</article><article>medium</article><article>expensive</article>');
});

test('message attachment requests send auth only to this application', async () => {
  const fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => 'fixture-blob' });
  const context = vm.createContext({
    URL, fetch, window: { location: { origin: 'http://localhost:4000' }, addEventListener() {} },
    document: { addEventListener() {} }, localStorage: { getItem: () => 'fixture-token' },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/messages.js'), 'utf8'), context);
  await expect(vm.runInContext('fetchMessageAttachment("/api/messages/thread/attachments/message/0")', context)).resolves.toBe('fixture-blob');
  expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/messages/thread/attachments/message/0', { headers: { Authorization: 'Bearer fixture-token' } });
  await expect(vm.runInContext('fetchMessageAttachment("https://other.example/api/messages/file")', context)).rejects.toThrow('Invalid attachment URL');
  expect(fetch).toHaveBeenCalledTimes(1);
  const markup = vm.runInContext('renderBubbleAttachments([{name:"photo.jpg",mimeType:"image/jpeg",data:"/api/messages/thread/attachments/message/0"}])', context);
  expect(markup).toContain('data-attachment-url=');
  expect(markup).not.toContain('src=');
  expect(markup).toContain('tabindex="0"');
  expect(markup).toContain('aria-label="Preview photo.jpg"');
});

function messageContext(document) {
  const context = vm.createContext({
    URL, window: { location: { origin: 'http://localhost:4000' }, addEventListener() {} },
    document, localStorage: { getItem: () => 'fixture-token' },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../assets/js/messages.js'), 'utf8'), context);
  return context;
}

test('message dialogs use native modal focus containment and restore the opener on close', () => {
  const opener = { isConnected: true, focus: jest.fn() };
  const focus = jest.fn();
  let close;
  const dialog = {
    addEventListener: (event, handler) => { if (event === 'close') close = handler; },
    remove: jest.fn(), showModal: jest.fn(), querySelector: () => ({ focus }),
  };
  const document = { addEventListener() {}, activeElement: opener, body: { appendChild: jest.fn() }, querySelector: jest.fn().mockReturnValue(null) };
  const context = messageContext(document);
  context.dialog = dialog;
  vm.runInContext('showMessageDialog(dialog, "button")', context);
  expect(dialog.showModal).toHaveBeenCalledTimes(1);
  expect(focus).toHaveBeenCalledTimes(1);
  close();
  expect(dialog.remove).toHaveBeenCalledTimes(1);
  expect(opener.focus).toHaveBeenCalledTimes(1);
  document.querySelector.mockReturnValue({ open: true });
  close();
  expect(opener.focus).toHaveBeenCalledTimes(1);
});

test('modal attachment previews and removal do not change reply attachments or submit forms', () => {
  const handlers = [];
  const modal = { innerHTML: '' };
  const reply = { innerHTML: '' };
  const context = messageContext({
    addEventListener: (event, handler) => { if (event === 'click') handlers.push(handler); },
    getElementById: id => id === 'modalAttachPreview' ? modal : reply,
  });
  vm.runInContext(`
    pendingAttachments = [{name:'reply.txt',mimeType:'text/plain',data:'fixture'}];
    modalPendingAttachments = [{name:'modal.txt',mimeType:'text/plain',data:'fixture'}];
    renderAttachmentPreview('modalAttachPreview');
    renderAttachmentPreview();
  `, context);
  expect(modal.innerHTML).toContain('Remove modal.txt');
  expect(modal.innerHTML).toContain('type="button"');
  expect(reply.innerHTML).toContain('reply.txt');
  const button = { dataset: { remove: '0' }, closest: () => modal };
  handlers[0]({ target: { closest: () => button } });
  expect(modal.innerHTML).toBe('');
  expect(vm.runInContext('pendingAttachments.length', context)).toBe(1);
});

test('mobile Back clears the thread, cancels stale selection, and restores list focus', () => {
  const handlers = [];
  const remove = jest.fn();
  const focus = jest.fn();
  const thread = { innerHTML: 'Previous messages' };
  const context = messageContext({
    addEventListener: (event, handler) => { if (event === 'click') handlers.push(handler); },
    querySelector: () => ({ classList: { remove } }),
    querySelectorAll: () => [{ dataset: { convId: 'thread-1' }, focus }],
    getElementById: () => thread,
  });
  context.window.location.href = 'http://localhost:4000/pages/auth/messages.html?id=thread-1';
  context.window.history = { replaceState: jest.fn() };
  vm.runInContext('activeConversationId = "thread-1"', context);
  const handler = handlers.find(fn => fn.toString().includes('#messagesBack'));
  handler({ target: { closest: selector => selector === '#messagesBack' ? {} : null } });
  expect(remove).toHaveBeenCalledWith('thread-open');
  expect(focus).toHaveBeenCalledTimes(1);
  expect(vm.runInContext('activeConversationId', context)).toBe(null);
  expect(thread.innerHTML).not.toContain('Previous messages');
  expect(context.window.history.replaceState.mock.calls[0][2].search).toBe('');
});
