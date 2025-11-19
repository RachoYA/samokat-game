#!/bin/bash
# Команды для настройки сервера
# Выполнить на сервере после подключения: bash < setup-commands.sh

set -e

echo "🔧 Начинаем настройку сервера..."

# Проверка и установка Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    echo "✅ Node.js уже установлен: $(node -v)"
fi

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update && sudo apt upgrade -y

# Установка Nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Установка Nginx..."
    sudo apt install -y nginx
else
    echo "✅ Nginx уже установлен"
fi

# Установка PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 уже установлен"
fi

# Создание директорий
echo "📁 Создание директорий..."
sudo mkdir -p /var/www/samokat-game
sudo chown -R $USER:$USER /var/www/samokat-game
mkdir -p /var/www/samokat-game/{backend,frontend,logs,deployment}

# Настройка Firewall
echo "🔒 Настройка Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable

# Настройка PM2 автозапуска
echo "⚙️  Настройка PM2..."
pm2 startup | tail -1 | grep "sudo" | bash || echo "PM2 startup уже настроен"

echo "✅ Сервер настроен!"
echo ""
echo "Теперь можно запустить деплой с локального компьютера:"
echo "  ./deployment/deploy.sh"

