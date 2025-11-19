#!/bin/bash

# Скрипт автоматического деплоя игры на сервер
# Использование: ./deploy.sh

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
SERVER_IP="89.232.184.218"
SERVER_USER="racho"
REMOTE_PATH="/var/www/samokat-game"
LOCAL_PATH="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${GREEN}🚀 Начинаем деплой игры 'Самокат Микрорайон'${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка зависимостей
command -v node >/dev/null 2>&1 || { echo -e "${RED}❌ Node.js не установлен${NC}" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ NPM не установлен${NC}" >&2; exit 1; }

# Шаг 1: Build Frontend
echo -e "\n${YELLOW}📦 Шаг 1/5: Сборка Frontend${NC}"
cd "$LOCAL_PATH/frontend"
npm run build
echo -e "${GREEN}✅ Frontend собран${NC}"

# Шаг 2: Подготовка Backend
echo -e "\n${YELLOW}📦 Шаг 2/5: Подготовка Backend${NC}"
cd "$LOCAL_PATH/backend"
# Копируем только необходимые файлы
echo -e "${GREEN}✅ Backend подготовлен${NC}"

# Шаг 3: Создание директорий на сервере
echo -e "\n${YELLOW}🔧 Шаг 3/5: Создание директорий на сервере${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_PATH}/{backend,frontend,logs,deployment}"
echo -e "${GREEN}✅ Директории созданы${NC}"

# Шаг 4: Загрузка файлов
echo -e "\n${YELLOW}📤 Шаг 4/5: Загрузка файлов на сервер${NC}"

# Backend
echo "  → Backend..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude 'database/*.db' \
  --exclude '.env' \
  "$LOCAL_PATH/backend/" \
  ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/backend/

# Frontend
echo "  → Frontend..."
rsync -avz --delete \
  "$LOCAL_PATH/frontend/build/" \
  ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/frontend/

# Deployment configs
echo "  → Конфигурация..."
rsync -avz \
  "$LOCAL_PATH/deployment/nginx.conf" \
  "$LOCAL_PATH/deployment/ecosystem.config.js" \
  ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/deployment/

echo -e "${GREEN}✅ Файлы загружены${NC}"

# Шаг 5: Настройка и перезапуск на сервере
echo -e "\n${YELLOW}⚙️  Шаг 5/5: Настройка и перезапуск${NC}"
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
  cd /var/www/samokat-game/backend
  
  # Установка зависимостей
  echo "  → Установка зависимостей..."
  npm install --production --quiet
  
  # Создание .env если не существует
  if [ ! -f .env ]; then
    echo "  → Создание .env..."
    cat > .env << EOF
PORT=5001
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE=7d
DB_PATH=./database/microraion.db
EOF
  fi
  
  # Создание директории для БД
  mkdir -p database
  
  # Перезапуск PM2
  echo "  → Перезапуск backend..."
  if pm2 list | grep -q "samokat-game-backend"; then
    pm2 reload ecosystem.config.js
  else
    pm2 start ecosystem.config.js
    pm2 save
  fi
  
  # Настройка Nginx (если еще не настроен)
  if [ ! -L /etc/nginx/sites-enabled/samokat-game ]; then
    echo "  → Настройка Nginx..."
    sudo cp deployment/nginx.conf /etc/nginx/sites-available/samokat-game
    sudo ln -s /etc/nginx/sites-available/samokat-game /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
  else
    echo "  → Обновление Nginx..."
    sudo cp deployment/nginx.conf /etc/nginx/sites-available/samokat-game
    sudo nginx -t && sudo systemctl reload nginx
  fi
ENDSSH

echo -e "${GREEN}✅ Настройка завершена${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Деплой успешно завершен!${NC}"
echo ""
echo "Игра доступна по адресу:"
echo -e "  ${GREEN}→ http://${SERVER_IP}${NC}"
echo ""
echo "Для проверки логов:"
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo "  pm2 logs"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

