# 🚀 Инструкция по запуску — Микрорайон 3D

## 📋 Требования

- **Node.js** 16+ ([скачать](https://nodejs.org/))
- **npm** 8+ (идет с Node.js)
- **Современный браузер** с поддержкой WebGL

---

## ⚡ Быстрый старт

### 1. Установка зависимостей

```bash
# В корневой папке проекта
npm run install:all
```

Эта команда установит зависимости для:
- Корневого package.json
- Backend (Node.js + Express)
- Frontend (React + Babylon.js)

### 2. Запуск проекта

```bash
# Запуск backend и frontend одновременно
npm start
```

Это запустит:
- **Backend API** на http://localhost:5000
- **Frontend** на http://localhost:3000

Игра автоматически откроется в браузере!

---

## 🛠️ Альтернативные команды

### Запуск только backend

```bash
npm run server
# или с автоперезагрузкой
npm run server:dev
```

### Запуск только frontend

```bash
cd frontend
npm start
```

### Сборка production

```bash
npm run build
```

---

## 📂 Структура проекта

```
Самокат игра/
├── backend/              # Node.js + Express API
│   ├── routes/          # API роуты
│   │   ├── auth.js     # Авторизация
│   │   ├── users.js    # Пользователи
│   │   ├── sessions.js # Игровые сессии
│   │   └── missions.js # Миссии
│   ├── models/         # Модели данных
│   │   └── database.js # SQLite БД
│   ├── middleware/     # Middleware (auth)
│   ├── database/       # Файлы БД
│   ├── server.js       # Главный файл сервера
│   ├── package.json    # Зависимости backend
│   └── .env            # Конфигурация
│
├── frontend/           # React приложение
│   ├── public/        # Статика
│   ├── src/
│   │   ├── components/ # React компоненты
│   │   │   ├── AuthScreen.js    # Экран авторизации
│   │   │   ├── GameScreen.js    # Экран игры
│   │   │   └── Game3D.js        # 3D движок
│   │   ├── services/   # API клиент
│   │   │   └── api.js  # Axios конфиг
│   │   ├── App.js      # Главный компонент
│   │   └── index.js    # Entry point
│   └── package.json    # Зависимости frontend
│
├── package.json        # Корневые зависимости
├── README.md           # Документация
└── SETUP.md           # Этот файл
```

---

## 🔧 Конфигурация

### Backend (.env)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
DB_PATH=./database/microraion.db
```

### Frontend (proxy в package.json)

```json
"proxy": "http://localhost:5000"
```

---

## 🎮 Как играть

### 1. Авторизация

- Откройте http://localhost:3000
- **Зарегистрируйтесь** (введите имя пользователя)
- Или **войдите** если аккаунт уже есть

### 2. Игра

- Выбирайте здания из карточек
- Размещайте на сетке
- Выполняйте миссии
- Набирайте максимум очков!

### 3. Статистика

- Ваш прогресс автоматически сохраняется
- Лучший результат, количество игр
- История всех сессий

---

## 🔌 API Endpoints

### Авторизация
- `POST /api/auth/register` - Регистрация
- `POST /api/auth/login` - Вход

### Пользователи
- `GET /api/users/me` - Текущий пользователь (требует токен)
- `GET /api/users/:id` - Пользователь по ID
- `GET /api/users/leaderboard/top` - Таблица лидеров

### Игровые сессии
- `POST /api/sessions` - Создать сессию (требует токен)
- `GET /api/sessions/my` - Мои сессии (требует токен)
- `GET /api/sessions/user/:userId` - Сессии пользователя

### Миссии
- `GET /api/missions` - Все миссии
- `GET /api/missions/random` - Случайные миссии
- `GET /api/missions/:id` - Миссия по ID

---

## 🐛 Решение проблем

### Ошибка "Port 3000 is already in use"

```bash
# Убить процесс на порту 3000
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Ошибка "Port 5000 is already in use"

```bash
# Измените PORT в backend/.env
PORT=5001
```

### Не работает авторизация

- Проверьте что backend запущен
- Откройте http://localhost:5000/api/health
- Должно вернуть: `{"status":"OK"}`

### 3D не отображается

- Проверьте консоль браузера (F12)
- Убедитесь что WebGL поддерживается
- Обновите драйверы видеокарты

---

## 📦 Зависимости

### Backend

- **express** - Web-фреймворк
- **cors** - CORS middleware
- **sqlite3** - База данных
- **jsonwebtoken** - JWT токены
- **bcryptjs** - Хеширование паролей
- **express-validator** - Валидация

### Frontend

- **react** - UI библиотека
- **@babylonjs/core** - 3D движок
- **axios** - HTTP клиент
- **react-router-dom** - Роутинг

---

## 🎯 Development

### Запуск с hot-reload

```bash
# Terminal 1: Backend с nodemon
npm run server:dev

# Terminal 2: Frontend с react-scripts
cd frontend && npm start
```

### Очистка БД

```bash
rm backend/database/microraion.db
# БД пересоздастся при следующем запуске
```

---

## 🚢 Production Deployment

### 1. Сборка frontend

```bash
cd frontend
npm run build
```

### 2. Настройка Express для статики

```javascript
// backend/server.js
app.use(express.static(path.join(__dirname, '../frontend/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});
```

### 3. Запуск production сервера

```bash
cd backend
NODE_ENV=production node server.js
```

---

## 💡 Советы

1. **Используйте nodemon** для разработки backend
2. **Включите React DevTools** в браузере
3. **Проверяйте Network tab** для отладки API
4. **Используйте console.log** в Game3D для отладки

---

## 🆘 Поддержка

Если возникли проблемы:

1. Проверьте что все зависимости установлены
2. Проверьте версии Node.js (node -v) и npm (npm -v)
3. Очистите кэш: `npm cache clean --force`
4. Переустановите зависимости: `rm -rf node_modules && npm install`

---

**Готово! Удачной игры!** 🎮✨🛴

