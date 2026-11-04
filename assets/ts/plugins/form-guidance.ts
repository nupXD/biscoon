/** Shared, progressive form assistance for static pages and dynamically opened editors. */
(() => {
  type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  let sequence = 0;
  const describedBy = (field: Field, id: string) => {
    const ids = new Set((field.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
    ids.add(id);
    field.setAttribute('aria-describedby', [...ids].join(' '));
  };
  const labelText = (field: Field) => field.labels?.[0]?.textContent?.replace(/\s*\(required\)\s*$/, '').trim() || field.getAttribute('aria-label') || 'this field';
  function error(field: Field) {
    if (!field.id) field.id = `guided-field-${++sequence}`;
    const id = `${field.id}-error`;
    let message = document.getElementById(id);
    if (!message) {
      message = document.createElement('p');
      message.id = id;
      message.className = 'field-guidance-error';
      message.setAttribute('aria-live', 'polite');
      const anchor = field.closest('label') || field;
      anchor.insertAdjacentElement('afterend', message);
      describedBy(field, id);
    }
    const valid = field.validity.valid;
    field.setAttribute('aria-invalid', String(!valid));
    message.hidden = valid;
    message.textContent = valid ? '' : field.validity.valueMissing
      ? (field.type === 'checkbox' ? 'Please select this checkbox to continue.' : `Please complete ${labelText(field)}.`)
      : field.validity.typeMismatch && field.type === 'email' ? 'Enter an email address, such as you@example.com.'
      : field.validity.typeMismatch && field.type === 'url' ? 'Enter a complete link starting with https://.'
      : field.validationMessage;
  }
  function enhance() {
    document.querySelectorAll<Field>('input, select, textarea').forEach(field => {
      if (field.dataset.guided || ['hidden', 'submit', 'button'].includes(field.type)) return;
      field.dataset.guided = 'true';
      if (!field.id) field.id = `guided-field-${++sequence}`;
      // Associate existing visible labels before adding any fallback label.
      const container = field.closest('.form-group, .admin-modal-field');
      const label = container?.querySelector<HTMLLabelElement>('label:not([for])');
      if (label && !field.labels?.length) label.htmlFor = field.id;
      if (!field.labels?.length && !field.hasAttribute('aria-label') && !field.hasAttribute('aria-labelledby')) {
        const caption = field.getAttribute('placeholder') || (field.type === 'file' ? 'Choose attachments' : field.name || 'Choose an option');
        const fallback = document.createElement('label');
        fallback.htmlFor = field.id;
        fallback.className = 'guidance-label';
        fallback.textContent = caption;
        field.insertAdjacentElement('beforebegin', fallback);
      }
      if (field.required && field.labels?.[0] && !field.labels[0].classList.contains('required')) {
        const mark = document.createElement('span');
        mark.className = 'guidance-required';
        mark.textContent = ' (required)';
        field.labels[0].append(mark);
      }
      field.addEventListener('invalid', () => error(field));
      field.addEventListener('input', () => { if (field.hasAttribute('aria-invalid')) error(field); });
      field.addEventListener('change', () => { if (field.hasAttribute('aria-invalid')) error(field); });
      if (field instanceof HTMLInputElement && field.type === 'password') {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'password-visibility';
        toggle.textContent = 'Show password';
        toggle.setAttribute('aria-controls', field.id);
        toggle.setAttribute('aria-pressed', 'false');
        toggle.addEventListener('click', () => {
          const show = field.type === 'password';
          field.type = show ? 'text' : 'password';
          toggle.textContent = show ? 'Hide password' : 'Show password';
          toggle.setAttribute('aria-pressed', String(show));
        });
        field.insertAdjacentElement('afterend', toggle);
        if (field.autocomplete === 'new-password') {
          const hint = document.createElement('p');
          hint.id = `${field.id}-hint`;
          hint.className = 'field-guidance';
          hint.textContent = /confirm/i.test(field.id) ? 'Enter the same password again to check for typing mistakes.' : 'Use at least 8 characters. A longer, unique password is safer.';
          toggle.insertAdjacentElement('afterend', hint);
          describedBy(field, hint.id);
        }
      }
    });
  }
  document.addEventListener('reset', event => {
    const form = event.target as HTMLFormElement;
    queueMicrotask(() => {
      form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
      form.querySelectorAll<HTMLElement>('.field-guidance-error').forEach(message => { message.hidden = true; message.textContent = ''; });
    });
  });
  enhance();
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; enhance(); });
  }).observe(document.body, { childList: true, subtree: true });
})();
