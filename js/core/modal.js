import { Utils } from './utils.js';

let container = null;
const stack = [];

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.getElementById('modal-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'modal-container';
    container.className = 'modal-container';
    document.body.appendChild(container);
  }
  return container;
}

document.addEventListener('keydown', (event) => {
  if (!stack.length) return;
  const top = stack[stack.length - 1];

  if (event.key === 'Escape') {
    event.preventDefault();
    if (top.onEscape) top.onEscape();
  } else if (event.key === 'Enter') {
    const active = document.activeElement;
    if (active && active.tagName === 'TEXTAREA') return;

    event.preventDefault();
    if (top.onEnter) top.onEnter();
  }
});

function createBase(opts) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop active';
  if (opts.danger) backdrop.classList.add('modal-backdrop-danger');

  const modal = document.createElement('div');
  modal.className = 'modal';
  backdrop.appendChild(modal);

  if (opts.dismissable !== false) {
    backdrop.addEventListener('mousedown', event => {
      if (event.target === backdrop) close(backdrop, null);
    });
  }

  return { backdrop, modal };
}

function close(backdrop, result) {
  const index = stack.findIndex(entry => entry.backdrop === backdrop);
  if (index === -1) return;

  const entry = stack[index];
  stack.splice(index, 1);

  backdrop.classList.add('modal-closing');
  if (entry.resolve) entry.resolve(result);

  setTimeout(() => backdrop.remove(), 180);
}

function register(backdrop, resolve, onEnter, onEscape) {
  stack.push({ backdrop, resolve, onEnter, onEscape });
}

function makeTitle(text) {
  const h = document.createElement('h3');
  h.className = 'modal-title';
  h.textContent = text;
  return h;
}

function makeMessage(text) {
  const p = document.createElement('p');
  p.className = 'modal-message';
  p.textContent = text;
  return p;
}

function makeButton(label, cls, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn ' + cls;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function prompt(opts) {
  opts = typeof opts === 'string' ? { message: opts } : (opts || {});

  return new Promise(resolve => {
    const { backdrop, modal } = createBase(opts);

    if (opts.title) modal.appendChild(makeTitle(opts.title));
    if (opts.message) modal.appendChild(makeMessage(opts.message));

    let input;
    if (opts.type === 'textarea') {
      input = document.createElement('textarea');
      input.className = 'modal-input modal-input-textarea';
      input.rows = opts.rows || 4;
    } else {
      input = document.createElement('input');
      input.type = opts.type || 'text';
      input.className = 'modal-input';
      if (opts.min !== undefined) input.min = opts.min;
      if (opts.max !== undefined) input.max = opts.max;
    }
    input.placeholder = opts.placeholder || '';
    input.value = opts.value || '';
    modal.appendChild(input);

    const submit = () => {
      const value = input.value.trim();
      if (opts.required && !value) {
        input.classList.add('modal-input-error');
        input.focus();
        return;
      }
      close(backdrop, value);
    };

    const cancel = () => close(backdrop, null);

    register(backdrop, resolve, submit, cancel);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    actions.appendChild(makeButton(opts.cancelText || 'Отмена', 'btn-secondary', cancel));
    actions.appendChild(makeButton(opts.okText || 'OK', opts.danger ? 'btn-danger' : 'btn-primary', submit));
    modal.appendChild(actions);

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && opts.type !== 'textarea') {
        event.preventDefault();
        submit();
      }
    });

    ensureContainer().appendChild(backdrop);
    setTimeout(() => input.focus(), 50);
  });
}

function confirm(opts) {
  opts = typeof opts === 'string' ? { message: opts } : (opts || {});

  return new Promise(resolve => {
    const { backdrop, modal } = createBase(opts);

    if (opts.title) modal.appendChild(makeTitle(opts.title));
    if (opts.message) modal.appendChild(makeMessage(opts.message));

    const submit = () => close(backdrop, true);
    const cancel = () => close(backdrop, false);

    register(backdrop, resolve, submit, cancel);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    actions.appendChild(makeButton(opts.cancelText || 'Отмена', 'btn-secondary', cancel));
    const okBtn = makeButton(opts.okText || 'OK', opts.danger ? 'btn-danger' : 'btn-primary', submit);
    actions.appendChild(okBtn);

    modal.appendChild(actions);

    ensureContainer().appendChild(backdrop);
    setTimeout(() => okBtn.focus(), 50);
  });
}

function alert(opts) {
  opts = typeof opts === 'string' ? { message: opts } : (opts || {});

  return new Promise(resolve => {
    const { backdrop, modal } = createBase(opts);

    if (opts.title) modal.appendChild(makeTitle(opts.title));
    modal.appendChild(makeMessage(opts.message || ''));

    const submit = () => close(backdrop, true);
    register(backdrop, resolve, submit, submit);

    const actions = document.createElement('div');
    actions.className = 'modal-actions modal-actions-single';

    const okBtn = makeButton(opts.okText || 'OK', opts.danger ? 'btn-danger' : 'btn-primary', submit);
    actions.appendChild(okBtn);
    modal.appendChild(actions);

    ensureContainer().appendChild(backdrop);
    setTimeout(() => okBtn.focus(), 50);
  });
}

function form(opts) {
  opts = opts || {};

  return new Promise(resolve => {
    const { backdrop, modal } = createBase(opts);

    if (opts.title) modal.appendChild(makeTitle(opts.title));
    if (opts.message) modal.appendChild(makeMessage(opts.message));

    const formEl = document.createElement('form');
    formEl.className = 'modal-form';
    const inputs = {};

    (opts.fields || []).forEach(field => {
      const group = document.createElement('div');
      group.className = 'modal-field';

      if (field.label) {
        const label = document.createElement('label');
        label.textContent = field.label;
        label.htmlFor = 'modal-field-' + field.name;
        group.appendChild(label);
      }

      let input;
      if (field.type === 'textarea') {
        input = document.createElement('textarea');
        input.rows = field.rows || 4;
        input.className = 'modal-input modal-input-textarea';
      } else if (field.type === 'select') {
        input = document.createElement('select');
        input.className = 'modal-input';
        (field.options || []).forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.label;
          if (opt.value === field.value) option.selected = true;
          input.appendChild(option);
        });
      } else if (field.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!field.value;
        input.className = 'modal-checkbox';
      } else {
        input = document.createElement('input');
        input.type = field.type || 'text';
        input.className = 'modal-input';
        input.value = field.value !== undefined ? field.value : '';
      }

      if (input.tagName !== 'SELECT' && input.type !== 'checkbox') {
        input.placeholder = field.placeholder || '';
      }
      if (field.required) input.required = true;
      if (field.maxLength) input.maxLength = field.maxLength;
      input.id = 'modal-field-' + field.name;

      inputs[field.name] = input;
      group.appendChild(input);

      if (field.hint) {
        const hint = document.createElement('div');
        hint.className = 'modal-field-hint';
        hint.textContent = field.hint;
        group.appendChild(hint);
      }

      formEl.appendChild(group);
    });

    const submitForm = () => {
      const data = {};
      let valid = true;

      (opts.fields || []).forEach(field => {
        const input = inputs[field.name];
        const value = field.type === 'checkbox' ? input.checked : input.value.trim();

        if (field.required && field.type !== 'checkbox' && !value) {
          input.classList.add('modal-input-error');
          valid = false;
        } else {
          input.classList.remove('modal-input-error');
        }
        data[field.name] = value;
      });

      if (!valid) return;

      if (typeof opts.validate === 'function') {
        const err = opts.validate(data);
        if (err) {
          alert({ title: 'Ошибка', message: err, danger: true });
          return;
        }
      }

      close(backdrop, data);
    };

    const cancelForm = () => close(backdrop, null);

    register(backdrop, resolve, submitForm, cancelForm);

    const actions = document.createElement('div');
    actions.className = 'modal-actions';

    actions.appendChild(makeButton(opts.cancelText || 'Отмена', 'btn-secondary', cancelForm));

    const okBtn = document.createElement('button');
    okBtn.type = 'submit';
    okBtn.className = 'btn ' + (opts.danger ? 'btn-danger' : 'btn-primary');
    okBtn.textContent = opts.okText || 'OK';
    actions.appendChild(okBtn);

    formEl.appendChild(actions);
    modal.appendChild(formEl);

    formEl.addEventListener('submit', event => {
      event.preventDefault();
      submitForm();
    });

    ensureContainer().appendChild(backdrop);

    const firstField = (opts.fields || [])[0];
    if (firstField && inputs[firstField.name]) {
      setTimeout(() => inputs[firstField.name].focus(), 50);
    }
  });
}

export const Modal = { prompt, confirm, alert, form };