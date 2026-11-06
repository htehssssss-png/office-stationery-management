CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  username TEXT UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY, owner_id TEXT, item_code TEXT DEFAULT '', name TEXT NOT NULL,
  spec TEXT DEFAULT '', category TEXT DEFAULT '', unit TEXT DEFAULT '個', stock INTEGER DEFAULT 0,
  safety_stock INTEGER DEFAULT 0, location TEXT DEFAULT '', note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY, owner_id TEXT, name TEXT NOT NULL, department TEXT DEFAULT '', title TEXT DEFAULT '',
  active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS movements (
  id TEXT PRIMARY KEY, owner_id TEXT, type TEXT NOT NULL, date TEXT DEFAULT CURRENT_TIMESTAMP,
  item_id TEXT NOT NULL, item_name TEXT NOT NULL, quantity INTEGER NOT NULL,
  person TEXT DEFAULT '', department TEXT DEFAULT '', source TEXT DEFAULT '', note TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY, owner_id TEXT, item_code TEXT DEFAULT '', name TEXT NOT NULL, spec TEXT DEFAULT '',
  category TEXT DEFAULT '', unit TEXT DEFAULT '個', stock INTEGER DEFAULT 0, safety_stock INTEGER DEFAULT 0,
  location TEXT DEFAULT '', serial TEXT DEFAULT '', holder TEXT DEFAULT '', department TEXT DEFAULT '',
  issue_date TEXT DEFAULT '', status TEXT DEFAULT '在庫', note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tool_movements (
  id TEXT PRIMARY KEY, owner_id TEXT, type TEXT NOT NULL, date TEXT DEFAULT CURRENT_TIMESTAMP,
  tool_id TEXT NOT NULL, tool_name TEXT NOT NULL, serial TEXT DEFAULT '', quantity INTEGER DEFAULT 1,
  person TEXT DEFAULT '', department TEXT DEFAULT '', note TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
CREATE INDEX IF NOT EXISTS idx_tool_movements_date ON tool_movements(date);
