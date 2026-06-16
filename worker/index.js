const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json',
};

function json(data, status=200) { return new Response(JSON.stringify(data), {status, headers:CORS}); }
function err(msg, status=400) { return new Response(JSON.stringify({error:msg}), {status, headers:CORS}); }
function getUser(request) {
  // Cloudflare Access sets this header after authentication
  const cfEmail = request.headers.get('CF-Access-Authenticated-User-Email');
  if (cfEmail) return cfEmail;
  
  // Fallback: check Cf-Access-Jwt-Assertion and decode email from JWT
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (jwt) {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      if (payload.email) return payload.email;
    } catch(e) {}
  }
  
  // Dev fallback
  return request.headers.get('X-User-Email') || null;
}

async function initDB(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (email TEXT PRIMARY KEY, income REAL DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, email TEXT NOT NULL, month_key TEXT NOT NULL, date TEXT, merchant TEXT, amount REAL, category TEXT, source TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS debts (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, balance REAL, original_balance REAL, payment REAL, rate REAL, deadline TEXT, deadline_date TEXT, type TEXT, priority INTEGER, note TEXT, color TEXT, bg TEXT, account_pattern TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_debts_account ON debts(account_pattern);
    CREATE TABLE IF NOT EXISTS monthly_settings (email TEXT NOT NULL, month_key TEXT NOT NULL, income REAL, PRIMARY KEY (email, month_key));
    CREATE TABLE IF NOT EXISTS savings_goals (id TEXT PRIMARY KEY, email TEXT NOT NULL, name TEXT, target_amount REAL, current_amount REAL DEFAULT 0, target_date TEXT, priority INTEGER DEFAULT 99, icon TEXT, color TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS idx_txs_email_month ON transactions(email, month_key);
    CREATE INDEX IF NOT EXISTS idx_debts_email ON debts(email);
  `);
  // Migrate existing tables — ignore errors if column already exists
  try { await db.exec(`ALTER TABLE debts ADD COLUMN account_pattern TEXT DEFAULT ''`); } catch(_){}
}

async function ensureUser(db, email) {
  const existing = await db.prepare('SELECT email FROM users WHERE email = ?').bind(email).first();
  if (!existing) await db.prepare('INSERT INTO users (email, income) VALUES (?, ?)').bind(email, 0).run();
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env);
    } catch(e) {
      return new Response(JSON.stringify({error: e.message, stack: e.stack}), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }
  }
};

async function handleRequest(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── AI PROXY — no auth required ──────────────────────────────────────────
    if (path === '/api/ai/parse' && method === 'GET') {
      return json({status:'ok', message:'AI proxy ready'});
    }
    if (path === '/api/ai/parse' && method === 'POST') {
      try {
        const body = await request.json();
        const anthropicKey = env.ANTHROPIC_API_KEY;
        if (!anthropicKey) return err('AI not configured', 500);

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), {
          status: res.status,
          headers: CORS,
        });
      } catch(e) {
        return err(`AI proxy error: ${e.message}`, 500);
      }
    }

    // ── All other routes require auth ─────────────────────────────────────────
    try { await initDB(env.DB); } catch(e) {}

    // Temporarily use a default user while auth is being debugged
    const user = getUser(request) || 'werlich@outlook.com';
    await ensureUser(env.DB, user);

    if (path === '/api/user' && method === 'GET') {
      const userData = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(user).first();
      return json(userData);
    }
    if (path === '/api/user' && method === 'PUT') {
      const body = await request.json();
      await env.DB.prepare('UPDATE users SET income = ? WHERE email = ?').bind(body.income, user).run();
      return json({ok:true});
    }
    if (path === '/api/transactions' && method === 'GET') {
      const monthKey = url.searchParams.get('month');
      if (!monthKey) return err('month required');
      const txs = await env.DB.prepare('SELECT * FROM transactions WHERE email = ? AND month_key = ? ORDER BY date DESC').bind(user, monthKey).all();
      return json(txs.results||[]);
    }
    if (path === '/api/transactions' && method === 'POST') {
      const body = await request.json();
      const txs = Array.isArray(body)?body:[body];
      const monthKey = url.searchParams.get('month');
      if (!monthKey) return err('month required');
      for (const tx of txs) {
        await env.DB.prepare('INSERT OR REPLACE INTO transactions (id,email,month_key,date,merchant,amount,category,source) VALUES (?,?,?,?,?,?,?,?)').bind(tx.id||crypto.randomUUID(),user,monthKey,tx.date,tx.merchant,tx.amount,tx.category,tx.source).run();
      }
      return json({ok:true,count:txs.length});
    }
    if (path === '/api/transactions' && method === 'DELETE') {
      const monthKey = url.searchParams.get('month');
      const txId = url.searchParams.get('id');
      if (txId) await env.DB.prepare('DELETE FROM transactions WHERE id = ? AND email = ?').bind(txId, user).run();
      else if (monthKey) await env.DB.prepare('DELETE FROM transactions WHERE email = ? AND month_key = ?').bind(user, monthKey).run();
      return json({ok:true});
    }
    if (path.startsWith('/api/transactions/') && method === 'PUT') {
      const txId = path.split('/').pop();
      const body = await request.json();
      await env.DB.prepare('UPDATE transactions SET category = ? WHERE id = ? AND email = ?').bind(body.category, txId, user).run();
      return json({ok:true});
    }
    if (path === '/api/debts' && method === 'GET') {
      const debts = await env.DB.prepare('SELECT * FROM debts WHERE email = ? ORDER BY priority ASC').bind(user).all();
      return json(debts.results||[]);
    }
    if (path === '/api/debts' && method === 'POST') {
      const body = await request.json();
      const id = body.id||crypto.randomUUID();
      await env.DB.prepare('INSERT OR REPLACE INTO debts (id,email,name,balance,original_balance,payment,rate,deadline,deadline_date,type,priority,note,color,bg,account_pattern) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,user,body.name,body.balance,body.original_balance||body.balance,body.payment,body.rate||0,body.deadline||'ongoing',body.deadline_date||null,body.type||'loan',body.priority||99,body.note||'',body.color||'#C4603A',body.bg||'#F5E6DF',body.account_pattern||'').run();
      return json({ok:true,id});
    }
    if (path.startsWith('/api/debts/') && path !== '/api/debts/reorder' && method === 'PUT') {
      const debtId = path.split('/').pop();
      const body = await request.json();
      const fields=[], values=[];
      if (body.balance!==undefined){fields.push('balance=?');values.push(body.balance);}
      if (body.name!==undefined){fields.push('name=?');values.push(body.name);}
      if (body.payment!==undefined){fields.push('payment=?');values.push(body.payment);}
      if (body.rate!==undefined){fields.push('rate=?');values.push(body.rate);}
      if (body.deadline!==undefined){fields.push('deadline=?');values.push(body.deadline);}
      if (body.deadline_date!==undefined){fields.push('deadline_date=?');values.push(body.deadline_date);}
      if (body.priority!==undefined){fields.push('priority=?');values.push(body.priority);}
      if (body.note!==undefined){fields.push('note=?');values.push(body.note);}
      if (body.account_pattern!==undefined){fields.push('account_pattern=?');values.push(body.account_pattern);}
      if (!fields.length) return err('nothing to update');
      values.push(debtId, user);
      await env.DB.prepare(`UPDATE debts SET ${fields.join(',')} WHERE id=? AND email=?`).bind(...values).run();
      return json({ok:true});
    }
    if (path.startsWith('/api/debts/') && method === 'DELETE') {
      const debtId = path.split('/').pop();
      await env.DB.prepare('DELETE FROM debts WHERE id=? AND email=?').bind(debtId, user).run();
      return json({ok:true});
    }
    if (path === '/api/debts/reorder' && method === 'POST') {
      const body = await request.json();
      for (const item of body) {
        await env.DB.prepare('UPDATE debts SET priority=? WHERE id=? AND email=?').bind(item.priority, item.id, user).run();
      }
      return json({ok:true});
    }
    if (path === '/api/monthly' && method === 'GET') {
      const monthKey = url.searchParams.get('month');
      const settings = await env.DB.prepare('SELECT * FROM monthly_settings WHERE email=? AND month_key=?').bind(user, monthKey).first();
      return json(settings||{});
    }
    if (path === '/api/monthly' && method === 'PUT') {
      const monthKey = url.searchParams.get('month');
      const body = await request.json();
      await env.DB.prepare('INSERT OR REPLACE INTO monthly_settings (email,month_key,income) VALUES (?,?,?)').bind(user, monthKey, body.income).run();
      return json({ok:true});
    }
    if (path === '/api/months' && method === 'GET') {
      const months = await env.DB.prepare('SELECT DISTINCT month_key FROM transactions WHERE email=? ORDER BY month_key DESC').bind(user).all();
      return json((months.results||[]).map(m=>m.month_key));
    }
    // ── SAVINGS ─────────────────────────────────────────────────────
    if (path === '/api/savings' && method === 'GET') {
      const goals = await env.DB.prepare('SELECT * FROM savings_goals WHERE email = ? ORDER BY priority ASC').bind(user).all();
      return json(goals.results || []);
    }
    if (path === '/api/savings' && method === 'POST') {
      const body = await request.json();
      const id = body.id || crypto.randomUUID();
      await env.DB.prepare('INSERT OR REPLACE INTO savings_goals (id,email,name,target_amount,current_amount,target_date,priority,icon,color) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,user,body.name,body.target_amount,body.current_amount||0,body.target_date||null,body.priority||99,body.icon||'💰',body.color||'#3D8B6E').run();
      return json({ok:true,id});
    }
    if (path.startsWith('/api/savings/') && method === 'PUT') {
      const goalId = path.split('/').pop();
      const body = await request.json();
      const fields=[], values=[];
      if (body.name!==undefined){fields.push('name=?');values.push(body.name);}
      if (body.target_amount!==undefined){fields.push('target_amount=?');values.push(body.target_amount);}
      if (body.current_amount!==undefined){fields.push('current_amount=?');values.push(body.current_amount);}
      if (body.target_date!==undefined){fields.push('target_date=?');values.push(body.target_date);}
      if (body.priority!==undefined){fields.push('priority=?');values.push(body.priority);}
      if (body.icon!==undefined){fields.push('icon=?');values.push(body.icon);}
      if (body.color!==undefined){fields.push('color=?');values.push(body.color);}
      if (!fields.length) return err('nothing to update');
      values.push(goalId, user);
      await env.DB.prepare(`UPDATE savings_goals SET ${fields.join(',')} WHERE id=? AND email=?`).bind(...values).run();
      return json({ok:true});
    }
    if (path.startsWith('/api/savings/') && method === 'DELETE') {
      const goalId = path.split('/').pop();
      await env.DB.prepare('DELETE FROM savings_goals WHERE id=? AND email=?').bind(goalId, user).run();
      return json({ok:true});
    }

    return err('Not found', 404);
}
// deployed Tue May  5 21:42:20 UTC 2026
// v1778024956
