const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      nickname TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at BIGINT NOT NULL
    );
  `);
}

module.exports = {
  pool,
  init,

  async findUserByNickname(nickname) {
    const r = await pool.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
    return r.rows[0] || null;
  },

  async findUserById(id) {
    const r = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return r.rows[0] || null;
  },

  async createUser(nickname, passwordHash) {
    const r = await pool.query(
      'INSERT INTO users (nickname, password_hash, created_at) VALUES ($1, $2, $3) RETURNING *',
      [nickname, passwordHash, Date.now()]
    );
    return r.rows[0];
  },

  async createSession(token, userId) {
    await pool.query(
      'INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)',
      [token, userId, Date.now()]
    );
  },

  async findSession(token) {
    const r = await pool.query('SELECT * FROM sessions WHERE token = $1', [token]);
    return r.rows[0] || null;
  },

  async deleteSession(token) {
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
  },

  async listPosts() {
    const r = await pool.query(`
      SELECT p.*, u.nickname
      FROM posts p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);
    return r.rows;
  },

  async createPost(title, content, userId) {
    const r = await pool.query(
      'INSERT INTO posts (title, content, user_id, created_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, userId, Date.now()]
    );
    return r.rows[0];
  }
};