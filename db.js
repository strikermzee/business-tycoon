// db.js — Using sql.js (pure JavaScript, no native compilation needed on Windows)
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');

let SQL;
let db;

// Initialize database
const initPromise = (async () => {
    SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS game_results (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            won INTEGER DEFAULT 0,
            final_balance INTEGER DEFAULT 0,
            played_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    saveDatabase();
    console.log('✅ Database initialized successfully');
})();

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

// Create a wrapper that mimics better-sqlite3 API
const dbWrapper = {
    prepare: (sql) => ({
        run: (...params) => {
            try {
                db.run(sql, params);
                saveDatabase();
                return { changes: db.getRowsModified(), lastInsertRowid: 0 };
            } catch (e) {
                console.error('DB run error:', e.message);
                throw e;
            }
        },
        get: (...params) => {
            try {
                const stmt = db.prepare(sql);
                stmt.bind(params);
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    stmt.free();
                    return row;
                }
                stmt.free();
                return undefined;
            } catch (e) {
                console.error('DB get error:', e.message);
                return undefined;
            }
        },
        all: (...params) => {
            try {
                const results = [];
                const stmt = db.prepare(sql);
                stmt.bind(params);
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            } catch (e) {
                console.error('DB all error:', e.message);
                return [];
            }
        }
    }),
    exec: (sql) => {
        db.run(sql);
        saveDatabase();
    },
    ready: initPromise
};

module.exports = dbWrapper;
