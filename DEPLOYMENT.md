# 🚀 Деплой игры на сервер

## 📋 Информация о сервере

- **IP**: 89.232.184.218
- **User**: racho
- **Port**: 22 (SSH)

## 📦 Подготовка к деплою

### 1. Создание production build

```bash
# Фронтенд
cd frontend
npm run build

# Бэкенд (устанавливаем зависимости)
cd ../backend
npm install --production
```

### 2. Структура на сервере

Рекомендуемая структура:
```
/var/www/samokat-game/
├── frontend/          # React production build
├── backend/           # Node.js backend
├── nginx.conf         # Nginx конфигурация
└── ecosystem.config.js # PM2 конфигурация
```

## 🔧 Настройка сервера

### Шаг 1: Подключение к серверу

```bash
ssh racho@89.232.184.218
```

### Шаг 2: Установка необходимого ПО

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js (если нет)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Устанавливаем PM2 для управления процессами
sudo npm install -g pm2

# Устанавливаем Nginx (если нет)
sudo apt install -y nginx

# Устанавливаем certbot для HTTPS (опционально)
# sudo apt install -y certbot python3-certbot-nginx
```

### Шаг 3: Создание директории для проекта

```bash
sudo mkdir -p /var/www/samokat-game
sudo chown -R racho:racho /var/www/samokat-game
```

## 📤 Загрузка файлов на сервер

### Вариант 1: Использование SCP (с локального компьютера)

```bash
# Из корневой директории проекта

# Загружаем backend
scp -r backend racho@89.232.184.218:/var/www/samokat-game/

# Загружаем frontend build
scp -r frontend/build racho@89.232.184.218:/var/www/samokat-game/frontend

# Загружаем конфигурационные файлы
scp deployment/nginx.conf racho@89.232.184.218:/var/www/samokat-game/
scp deployment/ecosystem.config.js racho@89.232.184.218:/var/www/samokat-game/
```

### Вариант 2: Использование rsync (более эффективно)

```bash
# Backend
rsync -avz --exclude 'node_modules' backend/ racho@89.232.184.218:/var/www/samokat-game/backend/

# Frontend
rsync -avz frontend/build/ racho@89.232.184.218:/var/www/samokat-game/frontend/

# Конфигурация
rsync -avz deployment/ racho@89.232.184.218:/var/www/samokat-game/deployment/
```

## ⚙️ Настройка на сервере

### 1. Настройка Backend

```bash
ssh racho@89.232.184.218

cd /var/www/samokat-game/backend
npm install --production

# Создаем .env для production
cat > .env << EOF
PORT=5001
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE=7d
DB_PATH=./database/microraion.db
EOF

# Создаем директорию для базы данных
mkdir -p database
```

### 2. Запуск Backend через PM2

```bash
cd /var/www/samokat-game
pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Настройка Nginx

```bash
sudo cp /var/www/samokat-game/deployment/nginx.conf /etc/nginx/sites-available/samokat-game
sudo ln -s /etc/nginx/sites-available/samokat-game /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. Настройка Firewall

```bash
# Открываем порты
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## 🌐 Доступ к игре

После настройки игра будет доступна по адресу:
- **HTTP**: http://89.232.184.218
- **API**: http://89.232.184.218/api

## 🔒 Настройка HTTPS (опционально, но рекомендуется)

Если у вас есть домен:

```bash
# Получаем SSL сертификат
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление сертификата
sudo certbot renew --dry-run
```

## 🔄 Обновление приложения

Создайте скрипт для быстрого обновления:

```bash
#!/bin/bash
# update.sh на локальном компьютере

# Build frontend
cd frontend
npm run build
cd ..

# Deploy
rsync -avz --exclude 'node_modules' backend/ racho@89.232.184.218:/var/www/samokat-game/backend/
rsync -avz frontend/build/ racho@89.232.184.218:/var/www/samokat-game/frontend/

# Restart backend
ssh racho@89.232.184.218 "cd /var/www/samokat-game && pm2 restart all"

echo "✅ Deployment complete!"
```

## 📊 Мониторинг

```bash
# Проверка статуса PM2
pm2 status
pm2 logs

# Проверка Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Проверка использования ресурсов
pm2 monit
```

## 🐛 Troubleshooting

### Backend не запускается
```bash
pm2 logs
pm2 restart all
```

### Nginx ошибки
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### База данных не создается
```bash
cd /var/www/samokat-game/backend
chmod 755 database
node server.js  # Запуск вручную для проверки
```

## 🎉 Готово!

Ваша игра теперь доступна на:
**http://89.232.184.218**

---

**Важно**: Рекомендуется настроить домен и HTTPS для безопасности!

