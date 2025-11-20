# 🎮 Микрорайон - 2D Игра

Игра-симулятор строительства микрорайона на Canvas 2D.

## 🚀 Запуск

```bash
# Установка
npm install

# Backend (терминал 1)
cd backend && node server.js

# Frontend (терминал 2)
cd frontend && npm start
```

Игра: http://localhost:3000

## 📦 Структура

```
├── backend/          # API сервер (Node.js + SQLite)
├── frontend/         # React + Canvas 2D
└── deployment/       # Скрипты деплоя
```

## 🎮 Возможности

- ✅ Размещение зданий на сетке 32×32
- ✅ Система очков и миссий
- ✅ Анимация машин и людей
- ✅ Zoom & Pan камеры
- ✅ Мобильная версия
- ✅ Авторизация

## ⚡ Performance

- Bundle: 75 KB (gzip)
- FPS: 60
- Загрузка: ~2s

## 🚀 Деплой

```bash
cd /var/www/samokat-game
git pull
cd frontend && npm install && npm run build
sudo systemctl reload nginx
```

---

**v3.0.0** - 2D Canvas версия
