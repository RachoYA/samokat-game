# 🚀 Деплой через Git

## ✅ Что уже сделано:

- ✅ Git репозиторий инициализирован
- ✅ Все файлы закоммичены (79 файлов, 35456 строк)
- ✅ Frontend собран и готов

---

## 📋 Шаг 1: Создайте репозиторий на GitHub

### 1.1. Зайдите на GitHub

Откройте: https://github.com/new

### 1.2. Создайте новый репозиторий

- **Repository name**: `samokat-game` (или любое другое имя)
- **Description**: `3D градостроительный симулятор на Babylon.js`
- **Visibility**: `Public` или `Private` (на ваш выбор)
- **НЕ добавляйте**: README, .gitignore, license (они уже есть)

Нажмите **Create repository**

### 1.3. Скопируйте URL репозитория

После создания вы увидите URL вида:
```
https://github.com/ВАШ_USERNAME/samokat-game.git
```

---

## 📤 Шаг 2: Запушьте код на GitHub

Выполните команды в Terminal:

```bash
cd "/Users/grachyaalexanyan/Самокат игра"

# Добавьте remote (замените URL на ваш)
git remote add origin https://github.com/ВАШ_USERNAME/samokat-game.git

# Запушьте код
git branch -M main
git push -u origin main
```

При запросе введите ваши GitHub credentials (username и token).

---

## 🖥️ Шаг 3: Деплой на сервер через Git

### 3.1. Подключитесь к серверу

```bash
ssh racho@89.232.184.218
```

**Пароль:** `cv7AE5HpRC`

---

### 3.2. Клонируйте репозиторий

```bash
cd /var/www
sudo mkdir -p samokat-game
sudo chown -R racho:racho samokat-game
cd samokat-game

# Замените URL на ваш репозиторий
git clone https://github.com/ВАШ_USERNAME/samokat-game.git .
```

Если репозиторий приватный, вам нужно будет ввести GitHub credentials.

---

### 3.3. Установите зависимости Backend

```bash
cd backend
npm install --production
```

---

### 3.4. Соберите Frontend

```bash
cd ../frontend
npm install
npm run build
```

---

### 3.5. Создайте .env файл

```bash
cd ../backend
cat > .env << 'EOF'
PORT=5001
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE=7d
DB_PATH=./database/microraion.db
EOF
```

---

### 3.6. Создайте директорию для базы данных

```bash
mkdir -p database
```

---

### 3.7. Запустите Backend через PM2

```bash
cd /var/www/samokat-game
pm2 start deployment/ecosystem.config.js
pm2 save
```

---

### 3.8. Настройте Nginx

```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/samokat-game
sudo ln -s /etc/nginx/sites-available/samokat-game /etc/nginx/sites-enabled/samokat-game
sudo nginx -t
sudo systemctl reload nginx
```

---

### 3.9. Проверьте статус

```bash
pm2 status
pm2 logs --lines 20
```

---

### 3.10. Выйдите с сервера

```bash
exit
```

---

## 🎉 Готово!

Откройте в браузере: **http://89.232.184.218**

---

## 🔄 Обновление приложения (после изменений)

### На локальном компьютере:

```bash
cd "/Users/grachyaalexanyan/Самокат игра"

# Соберите frontend
cd frontend && npm run build && cd ..

# Закоммитьте изменения
git add .
git commit -m "Обновление игры"
git push
```

### На сервере:

```bash
ssh racho@89.232.184.218

cd /var/www/samokat-game

# Получите обновления
git pull

# Обновите зависимости (если нужно)
cd backend && npm install --production && cd ..
cd frontend && npm install && npm run build && cd ..

# Перезапустите backend
pm2 restart samokat-game-backend

exit
```

---

## 📊 Преимущества деплоя через Git:

✅ **Версионирование** - вся история изменений сохранена  
✅ **Быстрое обновление** - просто `git pull` на сервере  
✅ **Откат изменений** - можно вернуться к любой версии  
✅ **Командная работа** - легко работать с другими разработчиками  
✅ **CI/CD** - можно настроить автоматический деплой  

---

## 🔒 Для приватного репозитория

Если репозиторий приватный, на сервере нужно настроить SSH ключ:

```bash
# На сервере
ssh-keygen -t ed25519 -C "racho@89.232.184.218"
cat ~/.ssh/id_ed25519.pub
```

Скопируйте вывод и добавьте в GitHub:
Settings → SSH and GPG keys → New SSH key

---

## 📞 Полезные Git команды

```bash
# Проверить статус
git status

# Посмотреть историю
git log --oneline

# Создать новую ветку
git checkout -b feature-name

# Откатить изменения
git reset --hard HEAD~1

# Посмотреть изменения
git diff
```

---

**Теперь создайте репозиторий на GitHub и запуште код!** 🚀

