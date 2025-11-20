#!/bin/bash

# Упрощенный деплой без sudo (требует предварительной настройки сервера)
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SERVER_IP="89.232.184.218"
SERVER_USER="racho"
REMOTE_PATH="/var/www/samokat-game"
LOCAL_PATH="$(cd "$(dirname "$0")/.." && pwd)"

echo -e "${GREEN}🚀 Упрощенный деплой игры 'Самокат Микрорайон'${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Проверка сборки frontend
if [ ! -d "$LOCAL_PATH/frontend/build" ]; then
    echo -e "${RED}❌ Frontend не собран!${NC}"
    echo "Запустите: cd frontend && npm run build"
    exit 1
fi

# Шаг 1: Создание директорий на сервере
echo -e "\n${YELLOW}📁 Шаг 1/4: Создание директорий на сервере${NC}"
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_PATH}/{backend,frontend,logs,deployment}" && echo -e "${GREEN}✅ Директории созданы${NC}" || echo -e "${YELLOW}⚠️ Директории возможно уже существуют${NC}"

# Шаг 2: Загрузка Backend
echo -e "\n${YELLOW}📤 Шаг 2/4: Загрузка Backend${NC}"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'database/*.db' \
  --exclude '.env' \
  "$LOCAL_PATH/backend/" \
  ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/backend/
echo -e "${GREEN}✅ Backend загружен${NC}"

# Шаг 3: Загрузка Frontend
echo -e "\n${YELLOW}📤 Шаг 3/4: Загрузка Frontend${NC}"
rsync -avz --progress --delete \
  "$LOCAL_PATH/frontend/build/" \
  ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/frontend/
echo -e "${GREEN}✅ Frontend загружен${NC}"

# Шаг 4: Загрузка конфигурации
echo -e "\n${YELLOW}📤 Шаг 4/4: Загрузка конфигурации${NC}"
rsync -avz \
  "$LOCAL_PATH/deployment/nginx.conf" \
  "$LOCAL_PATH/deployment/ecosystem.config.js" \
  ${SERVER_USER}@${SERVER_IP}:${REMOTE_PATH}/deployment/
echo -e "${GREEN}✅ Конфигурация загружена${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Файлы загружены на сервер!${NC}"
echo ""
echo "Теперь подключитесь к серверу и завершите настройку:"
echo ""
echo "  ssh ${SERVER_USER}@${SERVER_IP}"
echo ""
echo "На сервере выполните:"
echo ""
echo "  cd ${REMOTE_PATH}/backend"
echo "  npm install --production"
echo ""
echo "  # Создайте .env файл:"
echo "  cat > .env << 'EOF'"
echo "PORT=5001"
echo "NODE_ENV=production"
echo "JWT_SECRET=\$(openssl rand -hex 32)"
echo "JWT_EXPIRE=7d"
echo "DB_PATH=./database/microraion.db"
echo "EOF"
echo ""
echo "  # Запустите приложение:"
echo "  pm2 start ${REMOTE_PATH}/deployment/ecosystem.config.js"
echo "  pm2 save"
echo ""
echo "  # Настройте Nginx (если еще не настроен):"
echo "  sudo cp ${REMOTE_PATH}/deployment/nginx.conf /etc/nginx/sites-available/samokat-game"
echo "  sudo ln -s /etc/nginx/sites-available/samokat-game /etc/nginx/sites-enabled/"
echo "  sudo nginx -t && sudo systemctl reload nginx"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"


