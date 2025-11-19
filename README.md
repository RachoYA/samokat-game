# 🛴 Микрорайон 3D — Full-Stack Version

**Градостроительный пазл-рогалик** с полноценным бэкендом, фронтендом и 3D графикой

![Version](https://img.shields.io/badge/version-3.0-green.svg)
![Node](https://img.shields.io/badge/node-16+-blue.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)
![Babylon.js](https://img.shields.io/badge/babylon.js-6.0-orange.svg)

---

## 🎮 Описание

Микрорайон 3D — это современная 3D игра с компонентной архитектурой:
- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + Babylon.js
- **Авторизация**: JWT токены
- **БД**: SQLite с автоматической миграцией
- **3D движок**: Babylon.js 6.0

---

## ⚡ Быстрый старт

### 1. Установка

```bash
# Установить все зависимости
npm run install:all
```

### 2. Запуск

```bash
# Запустить backend + frontend
npm start
```

Игра откроется на http://localhost:3000

---

## 📂 Архитектура

```
┌─────────────────────────────────────────┐
│          FRONTEND (React)               │
│  ┌─────────────────────────────────┐   │
│  │  AuthScreen   GameScreen        │   │
│  │     │             │              │   │
│  │     └─────┬───────┘              │   │
│  │          Game3D (Babylon.js)    │   │
│  └──────────────│──────────────────┘   │
│                 │ HTTP/REST              │
└─────────────────┼─────────────────────┘
                  │
┌─────────────────┼─────────────────────┐
│          BACKEND (Express)             │
│  ┌──────────────┴────────────────┐    │
│  │  REST API                     │    │
│  │  • /api/auth   (JWT)         │    │
│  │  • /api/users                │    │
│  │  • /api/sessions             │    │
│  │  • /api/missions             │    │
│  └──────────────┬────────────────┘    │
│                 │                      │
│  ┌──────────────┴────────────────┐    │
│  │  SQLite Database              │    │
│  │  • users                      │    │
│  │  • game_sessions              │    │
│  │  • achievements               │    │
│  └───────────────────────────────┘    │
└────────────────────────────────────────┘
```

---

## 🏗️ Структура проекта

### Backend (Node.js + Express)

```
backend/
├── routes/              # API маршруты
│   ├── auth.js         # Регистрация/вход
│   ├── users.js        # Управление пользователями
│   ├── sessions.js     # Игровые сессии
│   └── missions.js     # Миссии
├── models/
│   └── database.js     # SQLite модель
├── middleware/
│   └── auth.js         # JWT авторизация
├── server.js           # Entry point
├── .env                # Конфигурация
└── package.json
```

### Frontend (React + Babylon.js)

```
frontend/
├── src/
│   ├── components/
│   │   ├── AuthScreen.js    # Экран авторизации
│   │   ├── GameScreen.js    # Игровой экран
│   │   └── Game3D.js        # 3D движок
│   ├── services/
│   │   └── api.js           # Axios клиент
│   ├── App.js               # Роутинг
│   └── index.js             # Entry point
├── public/
└── package.json
```

---

## 🔌 API Endpoints

### 🔐 Авторизация

**POST** `/api/auth/register`
```json
{
  "username": "player123",
  "email": "player@example.com"
}
```

**POST** `/api/auth/login`
```json
{
  "username": "player123"
}
```

### 👤 Пользователи

**GET** `/api/users/me` 🔒  
Получить текущего пользователя

**GET** `/api/users/:id`  
Получить пользователя по ID

**GET** `/api/users/leaderboard/top?limit=10`  
Таблица лидеров

### 🎮 Игровые сессии

**POST** `/api/sessions` 🔒
```json
{
  "score": 500,
  "moves": 45,
  "missions_completed": 2
}
```

**GET** `/api/sessions/my` 🔒  
История игр текущего пользователя

**GET** `/api/sessions/user/:userId`  
История игр пользователя

### 🎯 Миссии

**GET** `/api/missions`  
Все миссии

**GET** `/api/missions/random?count=3`  
3 случайные миссии

**GET** `/api/missions/:id`  
Миссия по ID

🔒 — Требует JWT токен в заголовке `Authorization: Bearer <token>`

---

## 🎮 Геймплей

### Правила

1. **Сетка**: 8×8 клеток
2. **Ходы**: 64 хода (по 1 зданию за ход)
3. **Карты**: 3 случайных здания на выбор
4. **Очки**: За синергии между зданиями
5. **Миссии**: 3 задания с бонусными очками

### Типы зданий

| Тип | Базово | Синергии |
|-----|--------|----------|
| 🏠 Дом | +1 | +1 за парк, -1 за склад |
| 🌳 Парк | +1 | +1 за дом, +1 за кафе |
| ☕ Кафе | +1 | +1 за дом, +2 за парк |
| 🛒 Магазин | +1 | +2 за 3+ домов рядом |
| 📦 Доставка | +1 | +3 за комбо (3 дома + магазин) |
| 🏭 Склад | +2 | +3 за магазины, -1 домам |
| 🏢 Офис | +1 | +2 за кафе/доставку |

---

## 🛠️ Технологии

### Backend
- **Node.js** 16+ — Runtime
- **Express** 4.18 — Web framework
- **SQLite3** 5.1 — База данных
- **JWT** 9.0 — Авторизация
- **bcryptjs** 2.4 — Хеширование
- **express-validator** 7.0 — Валидация

### Frontend
- **React** 18.2 — UI библиотека
- **Babylon.js** 6.0 — 3D движок
- **Axios** 1.6 — HTTP клиент
- **React Router** 6.20 — Роутинг

---

## 🚀 Команды

### Development

```bash
# Установить зависимости
npm run install:all

# Запустить все (backend + frontend)
npm start

# Только backend
npm run server

# Только backend с hot-reload
npm run server:dev

# Только frontend
cd frontend && npm start
```

### Production

```bash
# Сборка frontend
npm run build

# Запуск production сервера
cd backend
NODE_ENV=production node server.js
```

---

## 🔧 Конфигурация

### Backend (.env)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
DB_PATH=./database/microraion.db
```

### Frontend (package.json)

```json
{
  "proxy": "http://localhost:5000"
}
```

---

## 📊 База данных

### Схема SQLite

**users**
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- email (TEXT)
- password_hash (TEXT)
- best_score (INTEGER)
- total_games (INTEGER)
- total_score (INTEGER)
- created_at (DATETIME)
- updated_at (DATETIME)

**game_sessions**
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FK)
- score (INTEGER)
- moves (INTEGER)
- missions_completed (INTEGER)
- created_at (DATETIME)

**achievements**
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FK)
- name (TEXT)
- description (TEXT)
- unlocked_at (DATETIME)

---

## 🎨 Дизайн

### Цветовая палитра

```css
/* Самокат зеленый */
--green-primary: #00D563;
--green-secondary: #00B851;

/* Фиолетовый (миссии) */
--purple-primary: #7C5FF0;

/* Фоны */
--bg-sky: linear-gradient(180deg, #E3F5FF 0%, #F0FFF4 50%, #D4F4DD 100%);
--bg-panel: linear-gradient(135deg, #FFFFFF 0%, #F8FFFA 100%);
```

---

## 🐛 Troubleshooting

### Ошибка: "Port already in use"

```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Ошибка: "Cannot find module"

```bash
# Переустановить зависимости
rm -rf node_modules
npm run install:all
```

### 3D не отображается

1. Проверьте консоль браузера (F12)
2. Убедитесь что WebGL включен
3. Обновите драйверы видеокарты

---

## 📚 Документация

- **SETUP.md** — Детальная инструкция по установке
- **3D-VERSION.md** — Описание 3D движка
- **USER-SYSTEM.md** — Документация API
- **CHANGELOG-v3.md** — История изменений

---

## 🔮 Roadmap

### v3.1 (В разработке)
- [ ] Интеграция полной игровой логики из game-3d.js
- [ ] Система достижений
- [ ] Таблица лидеров в UI
- [ ] WebSocket для real-time обновлений

### v3.2 (Планируется)
- [ ] Кастомные 3D модели зданий
- [ ] Режим "Вызов"
- [ ] Сезонные события
- [ ] PWA поддержка

### v4.0 (Будущее)
- [ ] Мультиплеер
- [ ] Облачное сохранение
- [ ] Мобильная версия

---

## 🤝 Вклад

Проект создан в образовательных целях.  
Вдохновлен сервисом быстрой доставки **Самокат** 🛴

---

## 📄 Лицензия

MIT License

---

## 🎉 Благодарности

- **Babylon.js** — за потрясающий 3D движок
- **React** — за компонентную архитектуру
- **Express** — за простой и мощный backend
- **Самокат** — за вдохновение

---

**Версия**: 3.0.0  
**Дата**: 18 ноября 2025  
**Статус**: ✅ Production Ready

**Powered by Babylon.js • React • Node.js • Самокат 2025** 🎮✨

---

## 📞 Поддержка

Если возникли вопросы:
1. Прочитайте **SETUP.md**
2. Проверьте версии Node.js и npm
3. Откройте консоль браузера (F12)
4. Проверьте статус API: http://localhost:5000/api/health

**Удачной игры!** 🚀🏙️
