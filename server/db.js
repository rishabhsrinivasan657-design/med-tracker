const Database = require('better-sqlite3')
const path = require('path')

const db = new Database(path.join(__dirname, 'medbuddy.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medications TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medications TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    logs TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`)
// Add timezone column if it doesn't exist yet (migration)
try {
  db.exec(`ALTER TABLE config ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/New_York'`)
} catch (e) {
  // Column already exists, ignore
}
module.exports = db