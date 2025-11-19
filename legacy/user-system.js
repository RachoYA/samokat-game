// Система управления пользователями (LocalStorage + IndexedDB)

class UserDatabase {
    constructor() {
        this.currentUser = null;
        this.dbName = 'MicrorayonGameDB';
        this.dbVersion = 1;
        this.db = null;
        this.initDB();
        this.loadCurrentUser();
    }

    // Инициализация IndexedDB
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Хранилище пользователей
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                    userStore.createIndex('email', 'email', { unique: false });
                }

                // Хранилище игровых сессий
                if (!db.objectStoreNames.contains('gameSessions')) {
                    const sessionStore = db.createObjectStore('gameSessions', { keyPath: 'id', autoIncrement: true });
                    sessionStore.createIndex('userId', 'userId', { unique: false });
                    sessionStore.createIndex('date', 'date', { unique: false });
                }

                // Хранилище достижений
                if (!db.objectStoreNames.contains('achievements')) {
                    const achievementStore = db.createObjectStore('achievements', { keyPath: 'id', autoIncrement: true });
                    achievementStore.createIndex('userId', 'userId', { unique: false });
                }

                console.log('Database structure created');
            };
        });
    }

    // Регистрация нового пользователя
    async registerUser(username, email = '') {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');

            // Проверяем, существует ли пользователь
            const index = store.index('username');
            const checkRequest = index.get(username);

            checkRequest.onsuccess = () => {
                if (checkRequest.result) {
                    reject('Пользователь с таким именем уже существует');
                } else {
                    const user = {
                        username: username,
                        email: email,
                        createdAt: new Date().toISOString(),
                        totalGames: 0,
                        bestScore: 0,
                        totalScore: 0,
                        achievements: [],
                        settings: {
                            soundEnabled: true,
                            musicEnabled: true,
                            theme: 'light'
                        }
                    };

                    const addRequest = store.add(user);

                    addRequest.onsuccess = () => {
                        user.id = addRequest.result;
                        this.currentUser = user;
                        this.saveCurrentUser();
                        console.log('User registered:', username);
                        resolve(user);
                    };

                    addRequest.onerror = () => {
                        reject(addRequest.error);
                    };
                }
            };

            checkRequest.onerror = () => {
                reject(checkRequest.error);
            };
        });
    }

    // Вход пользователя
    async loginUser(username) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const index = store.index('username');
            const request = index.get(username);

            request.onsuccess = () => {
                if (request.result) {
                    this.currentUser = request.result;
                    this.saveCurrentUser();
                    console.log('User logged in:', username);
                    resolve(request.result);
                } else {
                    reject('Пользователь не найден');
                }
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Выход пользователя
    logoutUser() {
        this.currentUser = null;
        localStorage.removeItem('currentUserId');
        console.log('User logged out');
    }

    // Сохранение текущего пользователя в localStorage
    saveCurrentUser() {
        if (this.currentUser) {
            localStorage.setItem('currentUserId', this.currentUser.id);
        }
    }

    // Загрузка текущего пользователя из localStorage
    async loadCurrentUser() {
        const userId = localStorage.getItem('currentUserId');
        if (userId) {
            try {
                const user = await this.getUserById(parseInt(userId));
                if (user) {
                    this.currentUser = user;
                    console.log('Current user loaded:', user.username);
                }
            } catch (error) {
                console.error('Error loading current user:', error);
            }
        }
    }

    // Получение пользователя по ID
    async getUserById(userId) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.get(userId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Обновление данных пользователя
    async updateUser(userId, updates) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['users'], 'readwrite');
            const store = transaction.objectStore('users');
            const getRequest = store.get(userId);

            getRequest.onsuccess = () => {
                const user = getRequest.result;
                if (user) {
                    Object.assign(user, updates);
                    const updateRequest = store.put(user);

                    updateRequest.onsuccess = () => {
                        if (this.currentUser && this.currentUser.id === userId) {
                            this.currentUser = user;
                        }
                        console.log('User updated:', userId);
                        resolve(user);
                    };

                    updateRequest.onerror = () => {
                        reject(updateRequest.error);
                    };
                } else {
                    reject('Пользователь не найден');
                }
            };

            getRequest.onerror = () => {
                reject(getRequest.error);
            };
        });
    }

    // Сохранение игровой сессии
    async saveGameSession(score, moves, missionsCompleted) {
        if (!this.currentUser) {
            console.warn('No current user, session not saved');
            return;
        }

        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const session = {
                userId: this.currentUser.id,
                score: score,
                moves: moves,
                missionsCompleted: missionsCompleted,
                date: new Date().toISOString()
            };

            const transaction = this.db.transaction(['gameSessions'], 'readwrite');
            const store = transaction.objectStore('gameSessions');
            const request = store.add(session);

            request.onsuccess = () => {
                console.log('Game session saved');
                
                // Обновляем статистику пользователя
                const totalGames = this.currentUser.totalGames + 1;
                const totalScore = this.currentUser.totalScore + score;
                const bestScore = Math.max(this.currentUser.bestScore, score);

                this.updateUser(this.currentUser.id, {
                    totalGames: totalGames,
                    totalScore: totalScore,
                    bestScore: bestScore
                }).then(() => {
                    resolve(session);
                });
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Получение истории игр пользователя
    async getUserGameHistory(userId, limit = 10) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['gameSessions'], 'readonly');
            const store = transaction.objectStore('gameSessions');
            const index = store.index('userId');
            const request = index.getAll(userId);

            request.onsuccess = () => {
                const sessions = request.result;
                // Сортировка по дате (новые первые) и ограничение
                sessions.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(sessions.slice(0, limit));
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Получение всех пользователей (для таблицы лидеров)
    async getAllUsers() {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['users'], 'readonly');
            const store = transaction.objectStore('users');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Получение топ пользователей по очкам
    async getLeaderboard(limit = 10) {
        const users = await this.getAllUsers();
        users.sort((a, b) => b.bestScore - a.bestScore);
        return users.slice(0, limit);
    }

    // Добавление достижения
    async addAchievement(userId, achievementName, description) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const achievement = {
                userId: userId,
                name: achievementName,
                description: description,
                unlockedAt: new Date().toISOString()
            };

            const transaction = this.db.transaction(['achievements'], 'readwrite');
            const store = transaction.objectStore('achievements');
            const request = store.add(achievement);

            request.onsuccess = () => {
                console.log('Achievement unlocked:', achievementName);
                resolve(achievement);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Получение достижений пользователя
    async getUserAchievements(userId) {
        return new Promise(async (resolve, reject) => {
            if (!this.db) {
                await this.initDB();
            }

            const transaction = this.db.transaction(['achievements'], 'readonly');
            const store = transaction.objectStore('achievements');
            const index = store.index('userId');
            const request = index.getAll(userId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

// Глобальный экземпляр базы данных
const userDB = new UserDatabase();

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserDatabase, userDB };
}

