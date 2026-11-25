export const TreeRenderer = {
  render(root, sections, opts = {}) {
    if (!root) return;
    root.innerHTML = '';

    const tree = document.createElement('div');
    tree.className = opts.wrapperClass || 'reg-tree';

    (sections || []).forEach((section, index) => {
      tree.appendChild(renderNode(section, index + 1, 1));
    });

    root.appendChild(tree);
  }
};

function renderNode(node, index, depth) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const hasContent = node.content && String(node.content).trim().length > 0;

  const wrap = document.createElement('div');
  wrap.className = 'reg-node reg-depth-' + depth;

  const head = document.createElement('button');
  head.type = 'button';
  head.className = 'reg-head';

  const num = document.createElement('span');
  num.className = 'reg-num';
  num.textContent = index + '.';
  head.appendChild(num);

  const title = document.createElement('span');
  title.className = 'reg-title';
  title.textContent = node.title || 'Без названия';
  head.appendChild(title);

  wrap.appendChild(head);

  if (!hasChildren && !hasContent) {
    return wrap;
  }

  const arrow = document.createElement('span');
  arrow.className = 'material-icons reg-arrow';
  arrow.textContent = 'expand_more';
  head.appendChild(arrow);

  const body = document.createElement('div');
  body.className = 'reg-body';

  const inner = document.createElement('div');
  inner.className = 'reg-body-inner';

  if (hasContent) {
    const content = document.createElement('div');
    content.className = 'reg-content';
    content.innerHTML = node.content;
    inner.appendChild(content);
  }

  if (hasChildren) {
    const children = document.createElement('div');
    children.className = 'reg-children';
    node.children.forEach((child, i) => {
      children.appendChild(renderNode(child, i + 1, depth + 1));
    });
    inner.appendChild(children);
  }

  body.appendChild(inner);
  wrap.appendChild(body);

  head.addEventListener('click', () => {
    const isOpen = wrap.classList.toggle('open');
    arrow.textContent = isOpen ? 'expand_less' : 'expand_more';
  });

  return wrap;
}