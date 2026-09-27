const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const SESSION_COOKIE = 'forum_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

async function getSessionUser(req) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;

  const session = await db.findSession(token);
  if (!session) return null;

  if (Date.now() - Number(session.created_at) > SESSION_TTL_MS) {
    await db.deleteSession(token);
    return null;
  }

  const user = await db.findUserById(session.user_id);
  if (!user) return null;
  return { id: user.id, nickname: user.nickname };
}

async function requireAuth(req, res, next) {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: 'Не авторизован' });
  req.user = user;
  next();
}

app.get('/api/me', async (req, res) => {
  res.json({ user: await getSessionUser(req) });
});

app.post('/api/signup', async (req, res) => {
  const { nickname, password } = req.body || {};

  if (typeof nickname !== 'string' || nickname.trim().length < 3) {
    return res.status(400).json({ error: 'Никнейм — минимум 3 символа.' });
  }
  if (typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Пароль — минимум 4 символа.' });
  }

  const nick = nickname.trim();
  if (await db.findUserByNickname(nick)) {
    return res.status(409).json({ error: 'Этот никнейм уже занят.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await db.createUser(nick, hash);

  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, user.id);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS
  });
  res.json({ user: { id: user.id, nickname: user.nickname } });
});

app.post('/api/login', async (req, res) => {
  const { nickname, password } = req.body || {};

  if (typeof nickname !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Неверный никнейм или пароль.' });
  }

  const user = await db.findUserByNickname(nickname.trim());
  if (!user) {
    return res.status(401).json({ error: 'Неверный никнейм или пароль.' });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Неверный никнейм или пароль.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  await db.createSession(token, user.id);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS
  });
  res.json({ user: { id: user.id, nickname: user.nickname } });
});

app.post('/api/logout', async (req, res) => {
  const token = req.cookies[SESSION_COOKIE];
  if (token) await db.deleteSession(token);
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

app.get('/api/posts', async (req, res) => {
  const rows = await db.listPosts();
  const posts = rows.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    createdAt: Number(p.created_at),
    author: p.nickname || null
  }));
  res.json({ posts });
});

app.post('/api/posts', requireAuth, async (req, res) => {
  const { title, content } = req.body || {};

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Заголовок обязателен.' });
  }
  if (typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ error: 'Текст поста обязателен.' });
  }

  const post = await db.createPost(title.trim(), content.trim(), req.user.id);

  res.status(201).json({
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
      createdAt: Number(post.created_at),
      author: req.user.nickname
    }
  });
});

db.init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`2forum запущен: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Ошибка инициализации базы:', err);
    process.exit(1);
  });