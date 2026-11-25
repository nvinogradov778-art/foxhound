const PAGE_TO_HASH = {
  'page-home':         '#/home',
  'page-operators':    '#/operators',
  'page-regulations':  '#/regulations',
  'page-docs':         '#/docs',
  'page-photo':        '#/photo',
  'page-scenarios':    '#/scenarios',
  'page-maps':         '#/maps',
  'page-instructions': '#/instructions',
  'page-atak':         '#/atak',
  'page-devices':      '#/devices',
  'page-calc':         '#/calc',
  'page-logs':         '#/logs',
  'page-profile':      '#/profile',
  'page-settings':     '#/settings',
  'page-chat':         '#/chat',
  'page-polls':        '#/polls',
  'page-events':       '#/events'
};

const HASH_TO_PAGE = Object.fromEntries(
  Object.entries(PAGE_TO_HASH).map(([page, hash]) => [hash, page])
);

function getPageFromHash() {
  return HASH_TO_PAGE[location.hash || '#/home'] || 'page-home';
}

function setHash(pageId) {
  const hash = PAGE_TO_HASH[pageId];
  if (hash && location.hash !== hash) {
    location.hash = hash;
  }
}

function init(onRoute) {
  onRoute(getPageFromHash(), { first: true });
  window.addEventListener('hashchange', () => {
    onRoute(getPageFromHash(), { first: false });
  });
}

export const Router = { getPageFromHash, setHash, init };