#!/bin/bash

# Интерактивный скрипт настройки сервера
# Использование: ./deployment/setup-server-interactive.sh

SERVER_IP="89.232.184.218"
SERVER_USER="racho"

echo "🚀 Настройка сервера для игры 'Самокат Микрорайон'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Подключение к серверу: ${SERVER_USER}@${SERVER_IP}"
echo "Пароль: cv7AE5HpRC"
echo ""
echo "Будут выполнены следующие действия:"
echo "  1. Установка Node.js 18.x"
echo "  2. Установка Nginx"
echo "  3. Установка PM2"
echo "  4. Создание директорий"
echo "  5. Настройка Firewall"
echo ""
read -p "Продолжить? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 1
fi

echo ""
echo "📡 Подключаемся к серверу..."
echo "Пожалуйста, введите пароль когда попросит: cv7AE5HpRC"
echo ""

ssh ${SERVER_USER}@${SERVER_IP} 'bash -s' << 'ENDSSH'
#!/bin/bash
set -e

echo "🔧 Начинаем настройку сервера..."

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo "📦 Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
    echo "✅ Node.js $(node -v) установлен"
else
    echo "✅ Node.js уже установлен: $(node -v)"
fi

# Обновление системы
echo "📦 Обновление системы..."
sudo apt update
sudo apt upgrade -y

# Установка Nginx
if ! command -v nginx &> /dev/null; then
    echo "📦 Установка Nginx..."
    sudo apt install -y nginx
    echo "✅ Nginx установлен"
else
    echo "✅ Nginx уже установлен"
fi

# Установка PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Установка PM2..."
    sudo npm install -g pm2
    echo "✅ PM2 установлен"
else
    echo "✅ PM2 уже установлен"
fi

# Создание директорий
echo "📁 Создание директорий..."
sudo mkdir -p /var/www/samokat-game
sudo chown -R $USER:$USER /var/www/samokat-game
mkdir -p /var/www/samokat-game/{backend,frontend,logs,deployment}
echo "✅ Директории созданы"

# Настройка Firewall
echo "🔒 Настройка Firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    echo "y" | sudo ufw enable || true
    echo "✅ Firewall настроен"
fi

# Настройка PM2 автозапуска
echo "⚙️  Настройка PM2 автозапуска..."
pm2 startup systemd -u $USER --hp $HOME | tail -1 | grep "sudo" | bash || echo "PM2 startup уже настроен"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Сервер успешно настроен!"
echo ""
echo "Версии установленного ПО:"
echo "  Node.js: $(node -v)"
echo "  NPM: $(npm -v)"
echo "  PM2: $(pm2 -v)"
echo "  Nginx: $(nginx -v 2>&1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')"
echo ""
echo "Теперь можно запустить деплой с локального компьютера:"
echo "  ./deployment/deploy.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ENDSSH

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Настройка сервера завершена успешно!"
    echo ""
    echo "Следующий шаг: запустите деплой"
    echo "  ./deployment/deploy.sh"
else
    echo ""
    echo "❌ Произошла ошибка при настройке сервера"
    echo "Проверьте подключение и попробуйте снова"
fi


