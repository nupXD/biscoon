const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

test('signed-in navigation adds one adjacent Post Ad link and removes it on sign-out', () => {
  let inserted = null;
  const parent = {
    querySelector: () => inserted,
    insertBefore: jest.fn(button => { inserted = button; }),
  };
  const account = { setAttribute: jest.fn() };
  const dropdown = { parentElement: parent, querySelector: () => account };
  const context = vm.createContext({
    dropdown, document: { createElement: () => ({ remove: () => { inserted = null; } }) },
  });
  const source = ts.createSourceFile('biscoon.ts', fs.readFileSync(path.join(__dirname, '../assets/ts/biscoon.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const code = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'syncUserPostButton').getText(source);
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  vm.runInContext('syncUserPostButton(dropdown, true); syncUserPostButton(dropdown, true);', context);
  expect(parent.insertBefore).toHaveBeenCalledTimes(1);
  expect(parent.insertBefore.mock.calls[0][1]).toBe(dropdown);
  expect(inserted.href).toBe('/pages/post/listing.html');
  expect(inserted.textContent).toBe('Post Ad');
  expect(account.setAttribute).toHaveBeenCalledWith('aria-label', 'Account menu');
  vm.runInContext('syncUserPostButton(dropdown, false)', context);
  expect(inserted).toBe(null);
});

test('homepage keeps newspaper and radio directories on the left and recent posts on the right', () => {
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const left = html.slice(html.indexOf('<aside class="left-panel'), html.indexOf('</aside>'));
  const right = html.slice(html.indexOf('<main class="right-panel'), html.indexOf('</main>'));
  for (const heading of ['homePatrikaHeading', 'homeRadioHeading']) {
    expect(left).toContain(`id="${heading}"`);
    expect(right).not.toContain(`id="${heading}"`);
    expect(html.split(`id="${heading}"`)).toHaveLength(2);
  }
  expect(left).toContain('https://radionepal.gov.np');
  expect(left).toContain('https://ekantipur.com');
  expect(right).toContain('id="homeRecentPosts"');
});

function listingForm() {
  const fields = new Map();
  function field(id) {
    if (!fields.has(id)) fields.set(id, { value: '', textContent: '', style: {}, dataset: {}, validity: { valid: true }, classList: { toggle: jest.fn() }, querySelectorAll: () => [], parentElement: { setAttribute: jest.fn() } });
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

test.each([
  ['housing', 'room', 'Rent / monthly cost', 'Housing details'],
  ['jobs', 'full-time', 'Pay / compensation (optional)', 'Job description'],
  ['marketplace', 'services', 'Rate / starting price (optional)', 'Service details'],
  ['marketplace', 'kinbech', 'Asking price', 'Item details'],
  ['community', 'event', 'Ticket / entry cost (optional)', 'Event details'],
])('posting labels adapt to %s / %s', (category, type, price, description) => {
  const { context, field } = listingForm();
  field('category').value = category;
  field('subcategory').value = type;
  vm.runInContext(`applyCategoryContext(${JSON.stringify(category)}, ${JSON.stringify(type)})`, context);
  expect(field('priceLabel').textContent).toBe(price);
  expect(field('descriptionLabel').textContent).toBe(description);
  expect(field('linkLabel').textContent).toContain('(optional)');
});

test('photography hides unrelated sections without erasing values and preview omits them', () => {
  const { context, field } = listingForm();
  field('category').value = 'photography';
  field('subcategory').value = 'portrait';
  field('price').value = '$950';
  field('contactEmail').value = 'not-an-email';
  field('area').value = 'Boston';
  field('logisticsSection').querySelectorAll = () => [field('price'), field('area')];
  field('contactDetailsSection').querySelectorAll = () => [field('contactEmail')];
  context.document.body = { classList: { toggle() {} } };
  vm.runInContext('applyListingFormProfile("photography", "portrait"); updateAdPreview()', context);
  expect(field('logisticsSection').classList.toggle).toHaveBeenCalledWith('listing-field-hidden', true);
  expect(field('contactEmail').disabled).toBe(true);
  expect(field('contactEmail').value).toBe('not-an-email');
  expect(field('postPreviewPrice').textContent).toBe('');
  expect(field('postPreviewLocation').textContent).toBe('');
  vm.runInContext('applyListingFormProfile("housing", "room")', context);
  expect(field('contactEmail').disabled).toBe(false);
  expect(field('price').value).toBe('$950');
});

test('news ticker refreshes latest headlines, links to stories, and recovers from failures', async () => {
  const ticker = { innerHTML: '', dataset: {}, setAttribute: jest.fn() };
  const listeners = {};
  const document = {
    hidden: false,
    getElementById: id => id === 'homeNewsTicker' ? ticker : null,
    addEventListener: (event, handler) => { listeners[event] = handler; },
  };
  const fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ news: [
    { slug: 'latest-story', title: 'Latest <news>' },
    { slug: 'older-story', title: 'Older story' },
  ] }) });
  const setInterval = jest.fn();
  const context = vm.createContext({ document, fetch, window: { setInterval }, getApiBase: () => 'http://localhost:4000' });
  const source = ts.createSourceFile('biscoon.ts', fs.readFileSync(path.join(__dirname, '../assets/ts/biscoon.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const names = ['initHomeNewsTicker', 'renderHomeNewsTicker', 'newsArticleHref', 'escapeHtml'];
  const code = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(source)).join('\n');
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  vm.runInContext('initHomeNewsTicker(); initHomeNewsTicker();', context);
  await new Promise(resolve => setImmediate(resolve));
  expect(fetch).toHaveBeenCalledWith('http://localhost:4000/api/news?sort=latest&limit=12', { cache: 'no-store' });
  expect(ticker.innerHTML).toContain('href="pages/news/index.html?story=latest-story"');
  expect(ticker.innerHTML).toContain('Latest &lt;news&gt;');
  expect(ticker.innerHTML.indexOf('Latest')).toBeLessThan(ticker.innerHTML.indexOf('Older'));
  expect(setInterval).toHaveBeenCalledTimes(1);
  expect(setInterval.mock.calls[0][1]).toBe(60000);

  const refresh = setInterval.mock.calls[0][0];
  document.hidden = true;
  refresh();
  expect(fetch).toHaveBeenCalledTimes(1);
  document.hidden = false;
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ news: [{ slug: 'new-story', title: 'Newly published' }] }) });
  listeners.visibilitychange();
  await new Promise(resolve => setImmediate(resolve));
  expect(ticker.innerHTML).toContain('Newly published');
  expect(ticker.innerHTML).not.toContain('Older story');

  fetch.mockRejectedValueOnce(new Error('offline'));
  refresh();
  await new Promise(resolve => setImmediate(resolve));
  expect(ticker.innerHTML).toContain('Headlines unavailable');
  expect(ticker.innerHTML).toContain('href="pages/news/index.html"');
  fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ news: [] }) });
  refresh();
  await new Promise(resolve => setImmediate(resolve));
  expect(ticker.innerHTML).toContain('No headlines yet');
  expect(ticker.setAttribute).toHaveBeenLastCalledWith('aria-busy', 'false');
});

function browseFunctions(context) {
  const source = ts.createSourceFile('biscoon.ts', fs.readFileSync(path.join(__dirname, '../assets/ts/biscoon.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const names = ['fetchListingsPage', 'bindSortSelect', 'renderListingsIntoFeed'];
  const code = source.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text)).map(node => node.getText(source)).join('\n');
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
}

test('recent posts request the newest six listings and support empty, error, and retry states', async () => {
  const target = { innerHTML: '', setAttribute: jest.fn(), querySelector: () => ({ addEventListener: jest.fn((_, handler) => { target.retry = handler; }) }) };
  const fetchListingsPage = jest.fn().mockResolvedValue({ listings: [{ id: 'new' }, { id: 'older' }] });
  const source = ts.createSourceFile('biscoon.ts', fs.readFileSync(path.join(__dirname, '../assets/ts/biscoon.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const code = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'initHomeRecentPosts').getText(source);
  const context = vm.createContext({ document: { getElementById: () => target }, fetchListingsPage, renderRecentPost: post => `<a>${post.id}</a>` });
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
  await vm.runInContext('initHomeRecentPosts()', context);
  expect(fetchListingsPage).toHaveBeenCalledWith({ page: 1, limit: 6, sort: 'newest' });
  expect(target.innerHTML).toBe('<a>new</a><a>older</a>');
  expect(target.setAttribute).toHaveBeenLastCalledWith('aria-busy', 'false');
  fetchListingsPage.mockResolvedValueOnce({ listings: [] });
  await vm.runInContext('initHomeRecentPosts()', context);
  expect(target.innerHTML).toContain('No posts yet.');
  fetchListingsPage.mockRejectedValueOnce(new Error('offline'));
  await vm.runInContext('initHomeRecentPosts()', context);
  expect(target.innerHTML).toContain('Try again');
  target.retry();
  await new Promise(resolve => setImmediate(resolve));
  expect(fetchListingsPage).toHaveBeenCalledTimes(4);
  expect(target.innerHTML).toBe('<a>new</a><a>older</a>');
});

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
