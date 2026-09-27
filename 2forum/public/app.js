const feed = document.getElementById('feed');
const stage = document.getElementById('stage');
const composer = document.getElementById('composer');
const composerForm = document.getElementById('composerForm');
const composerToggle = document.getElementById('composerToggle');
const composerCancel = document.getElementById('composerCancel');
const composerSubmit = document.getElementById('composerSubmit');
const titleField = document.getElementById('titleField');
const contentField = document.getElementById('contentField');

const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userLabel = document.getElementById('userLabel');

const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalForm = document.getElementById('modalForm');
const modalNickname = document.getElementById('modalNickname');
const modalPassword = document.getElementById('modalPassword');
const modalPasswordRepeat = document.getElementById('modalPasswordRepeat');
const modalRepeat = document.getElementById('modalRepeat');
const modalError = document.getElementById('modalError');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');
const modalSwitch = document.getElementById('modalSwitch');

const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmText = document.getElementById('confirmText');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');

const state = {
  posts: [],
  user: null,
  modalMode: 'login',
  confirmAction: null
};

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && data.error) || 'Ошибка сервера';
    throw new Error(msg);
  }
  return data;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

function formatDate(ts) {
  return new Date(ts).toLocaleString('ru-RU');
}

function measureNaturalHeight(element) {
  const prevMax = element.style.maxHeight;
  element.style.maxHeight = 'none';
  const h = element.getBoundingClientRect().height;
  element.style.maxHeight = prevMax;
  return h;
}

function measureCollapsedHeight(element) {
  const content = element.querySelector('.post-card__content');
  const prevDisplay = content.style.display;
  content.style.display = 'none';
  const h = element.getBoundingClientRect().height;
  content.style.display = prevDisplay;
  return h;
}

function togglePost(element) {
  const content = element.querySelector('.post-card__content');
  const isExpanded = element.classList.contains('post-card--expanded');

  if (element._onTransitionEnd) {
    element.removeEventListener('transitionend', element._onTransitionEnd);
    element._onTransitionEnd = null;
  }

  if (isExpanded) {
    const targetCollapsed = measureCollapsedHeight(element);
    const currentHeight = element.getBoundingClientRect().height;

    element.style.maxHeight = currentHeight + 'px';
    element.classList.remove('post-card--expanded');

    requestAnimationFrame(() => {
      element.style.maxHeight = targetCollapsed + 'px';
    });

    element._onTransitionEnd = (event) => {
      if (event.propertyName !== 'max-height') return;
      element.removeEventListener('transitionend', element._onTransitionEnd);
      element._onTransitionEnd = null;
      if (!element.classList.contains('post-card--expanded')) {
        content.style.display = 'none';
        element.style.maxHeight = targetCollapsed + 'px';
      }
    };
    element.addEventListener('transitionend', element._onTransitionEnd);
  } else {
    content.style.display = 'block';
    const targetExpanded = measureNaturalHeight(element);

    element.style.maxHeight = element.dataset.collapsedHeight + 'px';
    element.classList.add('post-card--expanded');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.maxHeight = targetExpanded + 'px';
      });
    });

    element._onTransitionEnd = (event) => {
      if (event.propertyName !== 'max-height') return;
      element.removeEventListener('transitionend', element._onTransitionEnd);
      element._onTransitionEnd = null;
      if (element.classList.contains('post-card--expanded')) {
        element.style.maxHeight = 'none';
      }
    };
    element.addEventListener('transitionend', element._onTransitionEnd);
  }
}

function createPostElement(post) {
  const element = document.createElement('article');
  element.className = 'post-card';
  element.dataset.id = post.id;

  const author = post.author ? escapeHtml(post.author) : 'Аноним';
  const timestamp = escapeHtml(formatDate(post.createdAt));

  element.innerHTML = `
    <p class="post-card__meta">
      <span class="post-card__author">${author}</span> · ${timestamp}
    </p>
    <h2 class="post-card__title">${escapeHtml(post.title)}</h2>
    <p class="post-card__content">${escapeHtml(post.content)}</p>
  `;

  element.addEventListener('click', () => togglePost(element));
  return element;
}

function renderAll() {
  feed.innerHTML = '';
  if (!state.posts.length) {
    const empty = document.createElement('div');
    empty.className = 'post-feed__empty';
    empty.textContent = 'Пока нет постов. Создай первый.';
    feed.appendChild(empty);
    return;
  }
  state.posts.forEach((post) => feed.appendChild(createPostElement(post)));
}

function finalizePostHeights() {
  feed.querySelectorAll('.post-card').forEach((element) => {
    const collapsedHeight = Math.ceil(measureCollapsedHeight(element));
    element.dataset.collapsedHeight = collapsedHeight;
    if (!element.classList.contains('post-card--expanded')) {
      element.style.maxHeight = collapsedHeight + 'px';
    }
  });
}

function renderSession() {
  const loggedIn = Boolean(state.user);

  loginBtn.classList.toggle('button--hidden', loggedIn);
  signupBtn.classList.toggle('button--hidden', loggedIn);
  logoutBtn.classList.toggle('button--hidden', !loggedIn);
  userLabel.classList.toggle('button--hidden', !loggedIn);

  if (loggedIn) userLabel.textContent = state.user.nickname;

  renderAll();
  requestAnimationFrame(finalizePostHeights);
}

function clearValidation() {
  titleField.classList.remove('text-field--invalid');
  contentField.classList.remove('text-field--invalid');
}

function markInvalid(field) {
  field.classList.add('text-field--invalid');
}

function openComposer() {
  stage.classList.add('action-bar__stage--expanded');
  composer.classList.add('composer--expanded');
  composerToggle.classList.add('composer-toggle--hidden');
  setTimeout(() => titleField.focus(), 200);
}

function closeComposer() {
  stage.classList.remove('action-bar__stage--expanded');
  composer.classList.remove('composer--expanded');
  composerToggle.classList.remove('composer-toggle--hidden');
  composerForm.reset();
  clearValidation();
}

async function submitPost() {
  const title = titleField.value.trim();
  const content = contentField.value.trim();

  clearValidation();
  let hasError = false;

  if (!title) { markInvalid(titleField); hasError = true; }
  if (!content) { markInvalid(contentField); hasError = true; }
  if (hasError) {
    if (!title) titleField.focus();
    else contentField.focus();
    return;
  }

  try {
    const data = await api('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content })
    });
    state.posts.unshift(data.post);
    renderAll();
    requestAnimationFrame(finalizePostHeights);
    closeComposer();
  } catch (err) {
    alert(err.message);
  }
}

function renderModalSwitch() {
  const isLogin = state.modalMode === 'login';
  const text = isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?';
  const linkText = isLogin ? 'Зарегистрироваться' : 'Войти';

  modalSwitch.innerHTML = `${escapeHtml(text)} <button type="button" class="modal__switch-link" id="modalSwitchLink">${escapeHtml(linkText)}</button>`;

  document.getElementById('modalSwitchLink').addEventListener('click', () => {
    setModalMode(state.modalMode === 'login' ? 'signup' : 'login');
    setTimeout(() => modalNickname.focus(), 100);
  });
}

function setModalMode(mode) {
  state.modalMode = mode;
  modalError.textContent = '';
  modalForm.reset();

  if (mode === 'login') {
    modalTitle.textContent = 'Войти';
    modalSubmit.textContent = 'Войти';
    modalRepeat.classList.remove('modal__repeat--expanded');
  } else {
    modalTitle.textContent = 'Регистрация';
    modalSubmit.textContent = 'Зарегистрироваться';
    modalRepeat.classList.add('modal__repeat--expanded');
  }

  renderModalSwitch();
}

function openModal(mode) {
  setModalMode(mode);
  modal.classList.add('modal--open');
  setTimeout(() => modalNickname.focus(), 200);
}

function closeModal() {
  modal.classList.remove('modal--open');
  modalError.textContent = '';
  modalForm.reset();
  modalRepeat.classList.remove('modal__repeat--expanded');
}

function openConfirm(title, text, action) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  state.confirmAction = action;
  confirmModal.classList.add('modal--open');
}

function closeConfirm() {
  confirmModal.classList.remove('modal--open');
  state.confirmAction = null;
}

async function handleModalSubmit(event) {
  event.preventDefault();

  const nickname = modalNickname.value.trim();
  const password = modalPassword.value;
  const repeat = modalPasswordRepeat.value;

  modalError.textContent = '';

  if (nickname.length < 3) {
    modalError.textContent = 'Никнейм — минимум 3 символа.';
    return;
  }
  if (password.length < 4) {
    modalError.textContent = 'Пароль — минимум 4 символа.';
    return;
  }

  if (state.modalMode === 'signup') {
    if (password !== repeat) {
      modalError.textContent = 'Пароли не совпадают.';
      return;
    }
    try {
      const data = await api('/api/signup', {
        method: 'POST',
        body: JSON.stringify({ nickname, password })
      });
      state.user = data.user;
    } catch (err) {
      modalError.textContent = err.message;
      return;
    }
  } else {
    try {
      const data = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ nickname, password })
      });
      state.user = data.user;
    } catch (err) {
      modalError.textContent = err.message;
      return;
    }
  }

  renderSession();
  closeModal();
}

function askLogout() {
  openConfirm(
    'Выйти?',
    'Чтобы снова писать посты, придётся войти заново.',
    async () => {
      try { await api('/api/logout', { method: 'POST' }); } catch {}
      state.user = null;
      renderSession();
      closeComposer();
      closeConfirm();
    }
  );
}

composerToggle.addEventListener('click', () => {
  if (!state.user) { openModal('login'); return; }
  if (composer.classList.contains('composer--expanded')) closeComposer();
  else openComposer();
});

composerCancel.addEventListener('click', closeComposer);
composerSubmit.addEventListener('click', submitPost);

titleField.addEventListener('input', () => titleField.classList.remove('text-field--invalid'));
contentField.addEventListener('input', () => contentField.classList.remove('text-field--invalid'));

titleField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); contentField.focus(); }
});

contentField.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPost(); }
});

loginBtn.addEventListener('click', () => openModal('login'));
signupBtn.addEventListener('click', () => openModal('signup'));
logoutBtn.addEventListener('click', askLogout);
modalCancel.addEventListener('click', closeModal);
modalForm.addEventListener('submit', handleModalSubmit);

modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
confirmCancel.addEventListener('click', closeConfirm);
confirmOk.addEventListener('click', () => { if (state.confirmAction) state.confirmAction(); });
confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) closeConfirm(); });

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (modal.classList.contains('modal--open')) closeModal();
  if (confirmModal.classList.contains('modal--open')) closeConfirm();
});

async function init() {
  try {
    const me = await api('/api/me');
    state.user = me.user;
  } catch {
    state.user = null;
  }

  try {
    const data = await api('/api/posts');
    state.posts = data.posts;
  } catch {
    state.posts = [];
  }

  renderSession();
  requestAnimationFrame(finalizePostHeights);
  setModalMode('login');
}

init();