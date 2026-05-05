// ── Finance Portal API Worker ─────────────────────────────────────────────────
// Runs on Cloudflare Workers, connected to D1 database
// User identity comes from Cloudflare Access header: CF-Access-Authenticated-User-Email

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,CF-Access-Authenticated-User-Email',
  'Content-Type': 'application/json',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: CORS });
}

// Get user email from Cloudflare Access header or fallback for dev
function getUser(request) {
  return request.headers.get('CF-Access-Authenticated-User-Email') || 
         request.headers.get('X-User-Email') || 
         null;
}

// ── DB INIT ───────────────────────────────────────────────────────────────────
async function initDB(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      income REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      month_key TEXT NOT NULL,
      date TEXT,
      merchant TEXT,
      amount REAL,
      category TEXT,
      source TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      balance REAL,
      original_balance REAL,
      payment REAL,
      rate REAL,
      deadline TEXT,
      deadline_date TEXT,
      type TEXT,
      priority INTEGER,
      note TEXT,
      color TEXT,
      bg TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS monthly_settings (
      email TEXT NOT NULL,
      month_key TEXT NOT NULL,
      income REAL,
      PRIMARY KEY (email, month_key)
    );
    CREATE INDEX IF NOT EXISTS idx_txs_email_month ON transactions(email, month_key);
    CREATE INDEX IF NOT EXISTS idx_debts_email ON debts(email);
  `);
}

// ── DEFAULT TEMPLATE ──────────────────────────────────────────────────────────
const DEFAULT_DEBTS = []; // blank — users add their own

async function ensureUser(db, email) {
  const existing = await db.prepare('SELECT email FROM users WHERE email = ?').bind(email).first();
  if (!existing) {
    await db.prepare('INSERT INTO users (email, income) VALUES (?, ?)').bind(email, 0).run();
  }
}

// ── ROUTER ────────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      await initDB(env.DB);
    } catch(e) {
      // DB might already be initialized
    }

    const user = getUser(request);
    if (!user) return err('Unauthorized - not logged in', 401);

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    await ensureUser(env.DB, user);

    // ── USER ──────────────────────────────────────────────────────────────────
    if (path === '/api/user' && method === 'GET') {
      const userData = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(user).first();
      return json(userData);
    }

    if (path === '/api/user' && method === 'PUT') {
      const body = await request.json();
      await env.DB.prepare('UPDATE users SET income = ? WHERE email = ?').bind(body.income, user).run();
      return json({ ok: true });
    }

    // ── TRANSACTIONS ──────────────────────────────────────────────────────────
    if (path === '/api/transactions' && method === 'GET') {
      const monthKey = url.searchParams.get('month');
      if (!monthKey) return err('month param required');
      const txs = await env.DB.prepare(
        'SELECT * FROM transactions WHERE email = ? AND month_key = ? ORDER BY date DESC'
      ).bind(user, monthKey).all();
      return json(txs.results || []);
    }

    if (path === '/api/transactions' && method === 'POST') {
      const body = await request.json();
      const txs = Array.isArray(body) ? body : [body];
      const monthKey = url.searchParams.get('month');
      if (!monthKey) return err('month param required');
      
      for (const tx of txs) {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO transactions (id, email, month_key, date, merchant, amount, category, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(tx.id || crypto.randomUUID(), user, monthKey, tx.date, tx.merchant, tx.amount, tx.category, tx.source).run();
      }
      return json({ ok: true, count: txs.length });
    }

    if (path === '/api/transactions' && method === 'DELETE') {
      const monthKey = url.searchParams.get('month');
      const txId = url.searchParams.get('id');
      if (txId) {
        await env.DB.prepare('DELETE FROM transactions WHERE id = ? AND email = ?').bind(txId, user).run();
      } else if (monthKey) {
        await env.DB.prepare('DELETE FROM transactions WHERE email = ? AND month_key = ?').bind(user, monthKey).run();
      }
      return json({ ok: true });
    }

    if (path.startsWith('/api/transactions/') && method === 'PUT') {
      const txId = path.split('/').pop();
      const body = await request.json();
      await env.DB.prepare(
        'UPDATE transactions SET category = ? WHERE id = ? AND email = ?'
      ).bind(body.category, txId, user).run();
      return json({ ok: true });
    }

    // ── DEBTS ─────────────────────────────────────────────────────────────────
    if (path === '/api/debts' && method === 'GET') {
      const debts = await env.DB.prepare(
        'SELECT * FROM debts WHERE email = ? ORDER BY priority ASC'
      ).bind(user).all();
      return json(debts.results || []);
    }

    if (path === '/api/debts' && method === 'POST') {
      const body = await request.json();
      const id = body.id || crypto.randomUUID();
      await env.DB.prepare(
        `INSERT OR REPLACE INTO debts 
        (id, email, name, balance, original_balance, payment, rate, deadline, deadline_date, type, priority, note, color, bg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, user, body.name, body.balance, body.original_balance || body.balance,
        body.payment, body.rate || 0, body.deadline || 'ongoing', body.deadline_date || null,
        body.type || 'loan', body.priority || 99, body.note || '', body.color || '#C4603A', body.bg || '#F5E6DF'
      ).run();
      return json({ ok: true, id });
    }

    if (path.startsWith('/api/debts/') && method === 'PUT') {
      const debtId = path.split('/').pop();
      const body = await request.json();
      // Build dynamic update
      const fields = [];
      const values = [];
      if (body.balance !== undefined) { fields.push('balance = ?'); values.push(body.balance); }
      if (body.name !== undefined) { fields.push('name = ?'); values.push(body.name); }
      if (body.payment !== undefined) { fields.push('payment = ?'); values.push(body.payment); }
      if (body.rate !== undefined) { fields.push('rate = ?'); values.push(body.rate); }
      if (body.deadline !== undefined) { fields.push('deadline = ?'); values.push(body.deadline); }
      if (body.deadline_date !== undefined) { fields.push('deadline_date = ?'); values.push(body.deadline_date); }
      if (body.priority !== undefined) { fields.push('priority = ?'); values.push(body.priority); }
      if (body.note !== undefined) { fields.push('note = ?'); values.push(body.note); }
      if (fields.length === 0) return err('No fields to update');
      values.push(debtId, user);
      await env.DB.prepare(
        `UPDATE debts SET ${fields.join(', ')} WHERE id = ? AND email = ?`
      ).bind(...values).run();
      return json({ ok: true });
    }

    if (path.startsWith('/api/debts/') && method === 'DELETE') {
      const debtId = path.split('/').pop();
      await env.DB.prepare('DELETE FROM debts WHERE id = ? AND email = ?').bind(debtId, user).run();
      return json({ ok: true });
    }

    // Reorder debts
    if (path === '/api/debts/reorder' && method === 'POST') {
      const body = await request.json(); // [{id, priority}]
      for (const item of body) {
        await env.DB.prepare('UPDATE debts SET priority = ? WHERE id = ? AND email = ?')
          .bind(item.priority, item.id, user).run();
      }
      return json({ ok: true });
    }

    // ── MONTHLY SETTINGS ──────────────────────────────────────────────────────
    if (path === '/api/monthly' && method === 'GET') {
      const monthKey = url.searchParams.get('month');
      const settings = await env.DB.prepare(
        'SELECT * FROM monthly_settings WHERE email = ? AND month_key = ?'
      ).bind(user, monthKey).first();
      return json(settings || {});
    }

    if (path === '/api/monthly' && method === 'PUT') {
      const monthKey = url.searchParams.get('month');
      const body = await request.json();
      await env.DB.prepare(
        'INSERT OR REPLACE INTO monthly_settings (email, month_key, income) VALUES (?, ?, ?)'
      ).bind(user, monthKey, body.income).run();
      return json({ ok: true });
    }

    // ── MONTHS LIST ───────────────────────────────────────────────────────────
    if (path === '/api/months' && method === 'GET') {
      const months = await env.DB.prepare(
        'SELECT DISTINCT month_key FROM transactions WHERE email = ? ORDER BY month_key DESC'
      ).bind(user).all();
      return json((months.results || []).map(m => m.month_key));
    }

    return err('Not found', 404);
  }
};
