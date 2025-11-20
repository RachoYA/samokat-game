const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database/microraion.db');

// Создаем директорию если не существует
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('❌ Ошибка подключения к БД:', err);
    } else {
        console.log('✅ Подключено к SQLite БД');
    }
});

// Инициализация таблиц
function init() {
    db.serialize(() => {
        // Таблица пользователей
        db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT,
                password_hash TEXT,
                best_score INTEGER DEFAULT 0,
                total_games INTEGER DEFAULT 0,
                total_score INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица игровых сессий
        db.run(`
            CREATE TABLE IF NOT EXISTS game_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                score INTEGER NOT NULL,
                moves INTEGER NOT NULL,
                missions_completed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        // Таблица достижений
        db.run(`
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        `);

        console.log('✅ Таблицы базы данных созданы');
    });
}

// Промисифицированные методы
db.getAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.allAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.runAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

module.exports = { db, init };



