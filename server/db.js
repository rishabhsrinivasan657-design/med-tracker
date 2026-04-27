const Database = require('better-sqlite3')
const path = require('path')
 
const db = new Database(path.join(__dirname, 'medbuddy.db'))
 
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscription TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
 
  CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medications TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    updated_at TEXT DEFAULT (datetime('now'))
  );
 
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    logs TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`)
 
// Migrations — safe to run every time
try { db.exec(`ALTER TABLE config ADD COLUMN timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata'`) } catch (e) {}
 
module.exports = db