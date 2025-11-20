#!/bin/bash

# Скрипт для деплоя игры с GitHub на production сервер
# Выполнять на сервере после подключения

set -e

echo "🚀 Деплой игры 'Самокат Микрорайон' с GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Переменные
REPO_URL="https://github.com/RachoYA/samokat-game.git"
INSTALL_DIR="/var/www/samokat-game"
JWT_SECRET=$(openssl rand -hex 32)

# Шаг 1: Клонирование репозитория
echo "📦 Шаг 1/8: Клонирование репозитория..."
if [ -d "$INSTALL_DIR/.git" ]; then
    echo "  Репозиторий уже существует, обновляем..."
    cd $INSTALL_DIR
    git pull
else
    echo "  Клонируем новый репозиторий..."
    sudo mkdir -p $INSTALL_DIR
    sudo chown -R $USER:$USER $INSTALL_DIR
    git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
fi
echo "✅ Репозиторий готов"

# Шаг 2: Установка зависимостей Backend
echo ""
echo "📦 Шаг 2/8: Установка зависимостей Backend..."
cd $INSTALL_DIR/backend
npm install --production
echo "✅ Зависимости Backend установлены"

# Шаг 3: Установка зависимостей Frontend
echo ""
echo "📦 Шаг 3/8: Установка зависимостей Frontend..."
cd $INSTALL_DIR/frontend
npm install
echo "✅ Зависимости Frontend установлены"

# Шаг 4: Сборка Frontend
echo ""
echo "🔨 Шаг 4/8: Сборка Frontend..."
npm run build
echo "✅ Frontend собран"

# Шаг 5: Создание .env файла
echo ""
echo "⚙️  Шаг 5/8: Создание .env файла..."
cd $INSTALL_DIR/backend
if [ ! -f .env ]; then
    cat > .env << EOF
PORT=5001
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
JWT_EXPIRE=7d
DB_PATH=./database/microraion.db
EOF
    echo "✅ .env файл создан"
else
    echo "✅ .env файл уже существует"
fi

# Шаг 6: Создание директории для БД
echo ""
echo "📁 Шаг 6/8: Создание директории для базы данных..."
mkdir -p $INSTALL_DIR/backend/database
echo "✅ Директория создана"

# Шаг 7: Запуск/перезапуск PM2
echo ""
echo "🔄 Шаг 7/8: Запуск приложения через PM2..."
cd $INSTALL_DIR
if pm2 list | grep -q "samokat-game-backend"; then
    echo "  Перезапускаем существующий процесс..."
    pm2 reload deployment/ecosystem.config.js
else
    echo "  Запускаем новый процесс..."
    pm2 start deployment/ecosystem.config.js
fi
pm2 save
echo "✅ Приложение запущено"

# Шаг 8: Настройка Nginx
echo ""
echo "🌐 Шаг 8/8: Настройка Nginx..."
if [ ! -f /etc/nginx/sites-enabled/samokat-game ]; then
    echo "  Настраиваем Nginx..."
    sudo cp $INSTALL_DIR/deployment/nginx.conf /etc/nginx/sites-available/samokat-game
    sudo ln -s /etc/nginx/sites-available/samokat-game /etc/nginx/sites-enabled/samokat-game
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx настроен"
else
    echo "  Обновляем конфигурацию Nginx..."
    sudo cp $INSTALL_DIR/deployment/nginx.conf /etc/nginx/sites-available/samokat-game
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx обновлен"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Деплой завершен успешно!"
echo ""
echo "Игра доступна по адресу:"
echo "  → http://89.232.184.218"
echo ""
echo "Проверка статуса:"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


