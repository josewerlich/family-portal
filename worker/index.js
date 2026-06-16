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
    CREATE TABLE IF NOT EXISTS custom_categories (id TEXT PRIMARY KEY, email TEXT NOT NULL, label TEXT, icon TEXT, color TEXT, bg TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS receipt_items (id TEXT PRIMARY KEY, tx_id TEXT NOT NULL, email TEXT NOT NULL, name TEXT, amount REAL, category TEXT, sort_order INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS income_sources (id TEXT PRIMARY KEY, email TEXT NOT NULL, description TEXT, amount REAL DEFAULT 0, frequency TEXT DEFAULT 'monthly', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS households (id TEXT PRIMARY KEY, name TEXT, owner_email TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS household_members (household_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT DEFAULT 'member', joined_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (household_id, email));
    CREATE INDEX IF NOT EXISTS idx_txs_email_month ON transactions(email, month_key);
    CREATE INDEX IF NOT EXISTS idx_receipt_tx ON receipt_items(tx_id);
    CREATE INDEX IF NOT EXISTS idx_debts_email ON debts(email);
    CREATE INDEX IF NOT EXISTS idx_hm_email ON household_members(email);
  `);
  // Migrate existing tables — ignore errors if column already exists
  try { await db.exec(`ALTER TABLE debts ADD COLUMN account_pattern TEXT DEFAULT ''`); } catch(_){}
  try { await db.exec(`ALTER TABLE transactions ADD COLUMN has_receipt INTEGER DEFAULT 0`); } catch(_){}
  try { await db.exec(`ALTER TABLE monthly_settings ADD COLUMN budgets TEXT DEFAULT '{}'`); } catch(_){}
  try { await db.exec(`ALTER TABLE users ADD COLUMN display_name TEXT DEFAULT ''`); } catch(_){}
  try { await db.exec(`ALTER TABLE users ADD COLUMN household_id TEXT DEFAULT NULL`); } catch(_){}
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

    const user = getUser(request);
    if (!user) return new Response(JSON.stringify({error:'Unauthorized'}), {status:401, headers:CORS});
    await ensureUser(env.DB, user);

    // ── /api/me ───────────────────────────────────────────────────────────────
    if (path === '/api/me' && method === 'GET') {
      const userData = await env.DB.prepare('SELECT email, display_name, household_id FROM users WHERE email=?').bind(user).first();
      return json(userData || {email: user, display_name: '', household_id: null});
    }
    if (path === '/api/me' && method === 'PUT') {
      const body = await request.json();
      if (body.display_name !== undefined) {
        await env.DB.prepare('UPDATE users SET display_name=? WHERE email=?').bind(body.display_name, user).run();
      }
      return json({ok:true});
    }

    // ── HOUSEHOLDS ────────────────────────────────────────────────────────────
    if (path === '/api/households' && method === 'POST') {
      const body = await request.json();
      const hid = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO households (id,name,owner_email) VALUES (?,?,?)').bind(hid, body.name||'My Household', user).run();
      await env.DB.prepare('INSERT OR IGNORE INTO household_members (household_id,email,role) VALUES (?,?,?)').bind(hid, user, 'owner').run();
      await env.DB.prepare('UPDATE users SET household_id=? WHERE email=?').bind(hid, user).run();
      return json({ok:true, id:hid});
    }
    if (path === '/api/households/invite' && method === 'POST') {
      const body = await request.json();
      const me = await env.DB.prepare('SELECT household_id FROM users WHERE email=?').bind(user).first();
      if (!me?.household_id) return err('You are not in a household');
      const hh = await env.DB.prepare('SELECT * FROM households WHERE id=? AND owner_email=?').bind(me.household_id, user).first();
      if (!hh) return err('Only the owner can invite members');
      await ensureUser(env.DB, body.email);
      await env.DB.prepare('INSERT OR IGNORE INTO household_members (household_id,email,role) VALUES (?,?,?)').bind(me.household_id, body.email, 'member').run();
      await env.DB.prepare('UPDATE users SET household_id=? WHERE email=?').bind(me.household_id, body.email).run();
      return json({ok:true});
    }
    if (path === '/api/households/members' && method === 'GET') {
      const me = await env.DB.prepare('SELECT household_id FROM users WHERE email=?').bind(user).first();
      if (!me?.household_id) return json([]);
      const members = await env.DB.prepare('SELECT hm.email, hm.role, u.display_name FROM household_members hm LEFT JOIN users u ON u.email=hm.email WHERE hm.household_id=?').bind(me.household_id).all();
      return json(members.results||[]);
    }
    if (path === '/api/households/leave' && method === 'POST') {
      const me = await env.DB.prepare('SELECT household_id FROM users WHERE email=?').bind(user).first();
      if (!me?.household_id) return err('Not in a household');
      await env.DB.prepare('DELETE FROM household_members WHERE household_id=? AND email=?').bind(me.household_id, user).run();
      await env.DB.prepare('UPDATE users SET household_id=NULL WHERE email=?').bind(user).run();
      return json({ok:true});
    }

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
      if (body.category !== undefined) await env.DB.prepare('UPDATE transactions SET category = ? WHERE id = ? AND email = ?').bind(body.category, txId, user).run();
      if (body.has_receipt !== undefined) await env.DB.prepare('UPDATE transactions SET has_receipt = ? WHERE id = ? AND email = ?').bind(body.has_receipt?1:0, txId, user).run();
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
      if (!settings) return json({});
      return json({...settings, budgets: JSON.parse(settings.budgets||'{}')});
    }
    if (path === '/api/monthly' && method === 'PUT') {
      const monthKey = url.searchParams.get('month');
      const body = await request.json();
      await env.DB.prepare('INSERT OR REPLACE INTO monthly_settings (email,month_key,income,budgets) VALUES (?,?,?,?)').bind(user, monthKey, body.income, JSON.stringify(body.budgets||{})).run();
      return json({ok:true});
    }
    // ── RECEIPT ITEMS ─────────────────────────────────────────────────
    if (path === '/api/receipt-items' && method === 'GET') {
      const txId = url.searchParams.get('tx_id');
      const items = await env.DB.prepare('SELECT * FROM receipt_items WHERE tx_id=? AND email=? ORDER BY sort_order ASC').bind(txId, user).all();
      return json(items.results||[]);
    }
    if (path === '/api/receipt-items' && method === 'POST') {
      const body = await request.json();
      // Replace all items for this tx_id
      await env.DB.prepare('DELETE FROM receipt_items WHERE tx_id=? AND email=?').bind(body.tx_id, user).run();
      for (let i=0; i<body.items.length; i++) {
        const item = body.items[i];
        await env.DB.prepare('INSERT INTO receipt_items (id,tx_id,email,name,amount,category,sort_order) VALUES (?,?,?,?,?,?,?)').bind(crypto.randomUUID(),body.tx_id,user,item.name,item.amount,item.category,i).run();
      }
      return json({ok:true});
    }
    if (path.startsWith('/api/receipt-items/') && method === 'PUT') {
      const itemId = path.split('/').pop();
      const body = await request.json();
      await env.DB.prepare('UPDATE receipt_items SET category=? WHERE id=? AND email=?').bind(body.category, itemId, user).run();
      return json({ok:true});
    }
    // ── CUSTOM CATEGORIES ────────────────────────────────────────────
    if (path === '/api/categories' && method === 'GET') {
      const cats = await env.DB.prepare('SELECT * FROM custom_categories WHERE email=? ORDER BY created_at ASC').bind(user).all();
      return json(cats.results||[]);
    }
    if (path === '/api/categories' && method === 'POST') {
      const body = await request.json();
      const id = crypto.randomUUID();
      await env.DB.prepare('INSERT INTO custom_categories (id,email,label,icon,color,bg) VALUES (?,?,?,?,?,?)').bind(id,user,body.label,body.icon||'📌',body.color||'#6B6560',body.bg||'#F0EDE8').run();
      return json({ok:true,id});
    }
    if (path.startsWith('/api/categories/') && method === 'DELETE') {
      const catId = path.split('/').pop();
      await env.DB.prepare('DELETE FROM custom_categories WHERE id=? AND email=?').bind(catId,user).run();
      return json({ok:true});
    }
    if (path === '/api/months' && method === 'GET') {
      const months = await env.DB.prepare('SELECT DISTINCT month_key FROM transactions WHERE email=? ORDER BY month_key DESC').bind(user).all();
      return json((months.results||[]).map(m=>m.month_key));
    }
    // ── INCOME SOURCES ───────────────────────────────────────────────
    if (path === '/api/income-sources' && method === 'GET') {
      const sources = await env.DB.prepare('SELECT * FROM income_sources WHERE email=? ORDER BY created_at ASC').bind(user).all();
      return json(sources.results||[]);
    }
    if (path === '/api/income-sources' && method === 'POST') {
      const body = await request.json();
      const id = body.id || crypto.randomUUID();
      await env.DB.prepare('INSERT OR REPLACE INTO income_sources (id,email,description,amount,frequency) VALUES (?,?,?,?,?)').bind(id,user,body.description||'',body.amount||0,body.frequency||'monthly').run();
      return json({ok:true,id});
    }
    if (path.startsWith('/api/income-sources/') && method === 'PUT') {
      const srcId = path.split('/').pop();
      const body = await request.json();
      const fields=[],values=[];
      if(body.description!==undefined){fields.push('description=?');values.push(body.description);}
      if(body.amount!==undefined){fields.push('amount=?');values.push(body.amount);}
      if(body.frequency!==undefined){fields.push('frequency=?');values.push(body.frequency);}
      if(!fields.length) return json({ok:true});
      values.push(srcId,user);
      await env.DB.prepare(`UPDATE income_sources SET ${fields.join(',')} WHERE id=? AND email=?`).bind(...values).run();
      return json({ok:true});
    }
    if (path.startsWith('/api/income-sources/') && method === 'DELETE') {
      const srcId = path.split('/').pop();
      await env.DB.prepare('DELETE FROM income_sources WHERE id=? AND email=?').bind(srcId,user).run();
      return json({ok:true});
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
// deployed Mon Jun 16 2026
// v1.0.37 - Cloudflare Access auth + household model
