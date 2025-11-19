#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 Мастер деплоя игры 'Самокат Микрорайон'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Сервер: racho@89.232.184.218"
echo "Пароль: cv7AE5HpRC"
echo ""
echo "Выберите действие:"
echo "  1. Настроить сервер (первый раз)"
echo "  2. Задеплоить игру"
echo "  3. Настроить И задеплоить (полный цикл)"
echo ""
read -p "Ваш выбор (1-3): " choice

case $choice in
  1)
    echo ""
    echo "🔧 Запуск настройки сервера..."
    ./deployment/setup-server-interactive.sh
    ;;
  2)
    echo ""
    echo "📦 Запуск деплоя..."
    ./deployment/deploy.sh
    ;;
  3)
    echo ""
    echo "🚀 Запуск полного цикла..."
    echo ""
    echo "Шаг 1/2: Настройка сервера"
    ./deployment/setup-server-interactive.sh
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "Шаг 2/2: Деплой приложения"
      echo "Нажмите Enter для продолжения..."
      read
      ./deployment/deploy.sh
    else
      echo "❌ Ошибка настройки сервера. Деплой отменен."
      exit 1
    fi
    ;;
  *)
    echo "❌ Неверный выбор"
    exit 1
    ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Готово!"
echo ""
read -p "Нажмите Enter для выхода..."

