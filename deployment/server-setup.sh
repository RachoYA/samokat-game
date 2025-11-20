#!/bin/bash

# Скрипт первоначальной настройки сервера
# Запускать на сервере: ssh racho@89.232.184.218 < server-setup.sh

set -e

echo "🔧 Настройка сервера для игры 'Самокат Микрорайон'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update
sudo apt upgrade -y

# Установка Node.js 18.x
echo "📦 Установка Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "✅ Node.js $(node -v) установлен"
else
    echo "✅ Node.js уже установлен: $(node -v)"
fi

# Установка PM2
echo "📦 Установка PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo "✅ PM2 установлен"
else
    echo "✅ PM2 уже установлен"
fi

# Установка Nginx
echo "📦 Установка Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    echo "✅ Nginx установлен"
else
    echo "✅ Nginx уже установлен"
fi

# Создание директории проекта
echo "📁 Создание директорий..."
sudo mkdir -p /var/www/samokat-game/{backend,frontend,logs,deployment}
sudo chown -R $USER:$USER /var/www/samokat-game
echo "✅ Директории созданы"

# Настройка Firewall
echo "🔒 Настройка Firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp  # SSH
    sudo ufw allow 80/tcp  # HTTP
    sudo ufw allow 443/tcp # HTTPS
    sudo ufw --force enable
    echo "✅ Firewall настроен"
else
    echo "⚠️  UFW не установлен, пропускаем настройку firewall"
fi

# Настройка PM2 для автозапуска
echo "⚙️  Настройка PM2 автозапуска..."
pm2 startup | grep "sudo" | bash || echo "⚠️  PM2 startup уже настроен"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Сервер настроен!"
echo ""
echo "Следующие шаги:"
echo "1. Запустите деплой с локального компьютера:"
echo "   ./deployment/deploy.sh"
echo ""
echo "2. Проверьте статус:"
echo "   pm2 status"
echo "   sudo systemctl status nginx"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


