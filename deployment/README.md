# 🚀 Деплой на сервер

Эта директория содержит все необходимые файлы и скрипты для развертывания игры на production сервере.

## 📋 Содержимое

- `deploy.sh` - Автоматический скрипт деплоя (запускается локально)
- `server-setup.sh` - Скрипт первоначальной настройки сервера
- `nginx.conf` - Конфигурация Nginx
- `ecosystem.config.js` - Конфигурация PM2 для управления процессами

## 🎯 Быстрый старт

### 1. Первоначальная настройка сервера (один раз)

```bash
# Подключитесь к серверу
ssh racho@89.232.184.218

# Скопируйте и выполните команды из server-setup.sh
# Или загрузите скрипт и выполните:
bash server-setup.sh
```

### 2. Деплой приложения

```bash
# Из корневой директории проекта на локальном компьютере
./deployment/deploy.sh
```

Скрипт автоматически:
- ✅ Соберет React frontend
- ✅ Подготовит backend
- ✅ Загрузит файлы на сервер
- ✅ Установит зависимости
- ✅ Настроит и запустит PM2
- ✅ Настроит Nginx

### 3. Проверка

После деплоя игра доступна по адресу:
**http://89.232.184.218**

## 🔄 Обновление приложения

Для обновления просто запустите деплой снова:

```bash
./deployment/deploy.sh
```

## 📊 Мониторинг

### На сервере

```bash
# Статус приложений
pm2 status

# Логи в реальном времени
pm2 logs

# Мониторинг ресурсов
pm2 monit

# Статус Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/samokat-game-access.log
sudo tail -f /var/log/nginx/samokat-game-error.log
```

## 🛠️ Управление PM2

```bash
# Перезапуск
pm2 restart samokat-game-backend

# Остановка
pm2 stop samokat-game-backend

# Удаление
pm2 delete samokat-game-backend

# Просмотр логов
pm2 logs samokat-game-backend

# Просмотр информации
pm2 show samokat-game-backend
```

## 🐛 Troubleshooting

### Проблема: Backend не запускается

```bash
# Проверьте логи
pm2 logs samokat-game-backend

# Проверьте .env файл
cat /var/www/samokat-game/backend/.env

# Попробуйте запустить вручную
cd /var/www/samokat-game/backend
node server.js
```

### Проблема: Nginx показывает 502 Bad Gateway

```bash
# Проверьте, работает ли backend
pm2 status

# Проверьте порт
netstat -tulpn | grep 5001

# Перезапустите backend
pm2 restart samokat-game-backend
```

### Проблема: Frontend не обновляется

```bash
# Очистите кеш браузера (Ctrl+Shift+R)
# Или проверьте файлы на сервере
ls -la /var/www/samokat-game/frontend/
```

## 🔒 Безопасность

### Рекомендации:

1. **Настройте домен и HTTPS**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

2. **Регулярно обновляйте систему**:
```bash
sudo apt update && sudo apt upgrade -y
```

3. **Настройте автоматические бэкапы БД**:
```bash
# Создайте cron задачу
crontab -e

# Добавьте (бэкап каждый день в 3 AM):
0 3 * * * cp /var/www/samokat-game/backend/database/microraion.db /var/www/samokat-game/backups/microraion-$(date +\%Y\%m\%d).db
```

4. **Ограничьте SSH доступ**:
```bash
# Разрешите только ключи, запретите пароли
sudo nano /etc/ssh/sshd_config
# Установите: PasswordAuthentication no
sudo systemctl restart sshd
```

## 📈 Производительность

### Оптимизация PM2

```bash
# Запуск в cluster режиме (2 инстанса)
pm2 start ecosystem.config.js

# Автоматический рестарт при большом потреблении памяти
# (уже настроено в ecosystem.config.js: max_memory_restart: '500M')
```

### Оптимизация Nginx

```bash
# Gzip сжатие уже включено в nginx.conf
# Кеширование статики настроено (1 год для .js, .css, изображений)
```

## 📞 Полезные команды

```bash
# Очистить все PM2 процессы
pm2 kill

# Сохранить текущий список PM2 процессов
pm2 save

# Тест конфигурации Nginx
sudo nginx -t

# Перезагрузка Nginx
sudo systemctl reload nginx

# Просмотр открытых портов
sudo netstat -tulpn

# Проверка использования диска
df -h

# Проверка использования памяти
free -h
```

## 🎉 Готово!

После настройки ваша игра будет доступна 24/7 на сервере.

Для вопросов и поддержки обращайтесь к основной документации в `DEPLOYMENT.md`.

