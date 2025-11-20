#!/bin/bash

# 🧪 Автоматический тест 2D версии игры

echo "🧪 Тестирование 2D версии игры..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Счётчик тестов
PASSED=0
FAILED=0

# Функция для проверки теста
check_test() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

# 1. Проверка удаления 3D файлов
echo "📁 Проверка удаления 3D файлов..."
! test -f "frontend/src/components/Game3D.js"
check_test $? "Game3D.js удалён"

! test -f "frontend/src/game-engine.js"
check_test $? "game-engine.js удалён"

! test -d "frontend/public/models"
check_test $? "Папка models/ удалена"

! test -d "frontend/public/textures"
check_test $? "Папка textures/ удалена"

! test -d "legacy"
check_test $? "Папка legacy/ удалена"

echo ""

# 2. Проверка наличия 2D файлов
echo "📁 Проверка наличия 2D файлов..."
test -f "frontend/src/components/Game2D.js"
check_test $? "Game2D.js существует"

test -f "frontend/src/game-engine-2d.js"
check_test $? "game-engine-2d.js существует"

test -f "frontend/src/systems/GridSystem2D.js"
check_test $? "GridSystem2D.js существует"

test -d "frontend/public/sprites"
check_test $? "Папка sprites/ существует"

echo ""

# 3. Проверка спрайтов
echo "🖼️  Проверка спрайтов..."
SPRITES=("house.png" "shop.png" "cafe.png" "park.png" "car.png" "person.png" "road.png" "grass.png")
for sprite in "${SPRITES[@]}"; do
    test -f "frontend/public/sprites/$sprite"
    check_test $? "Спрайт $sprite существует"
done

echo ""

# 4. Проверка package.json
echo "📦 Проверка package.json..."
! grep -q "@babylonjs" frontend/package.json
check_test $? "Babylon.js удалён из зависимостей"

grep -q "\"react\"" frontend/package.json
check_test $? "React присутствует в зависимостей"

echo ""

# 5. Проверка node_modules
echo "📚 Проверка node_modules..."
! test -d "frontend/node_modules/@babylonjs"
check_test $? "@babylonjs удалён из node_modules"

test -d "frontend/node_modules/react"
check_test $? "React установлен в node_modules"

echo ""

# 6. Проверка сборки
echo "🔨 Проверка сборки..."
cd frontend
if npm run build > /tmp/build.log 2>&1; then
    check_test 0 "Проект собирается без ошибок"
    
    # Проверка размера bundle
    BUILD_SIZE=$(du -sh build/static/js/main.*.js 2>/dev/null | awk '{print $1}')
    if [ -n "$BUILD_SIZE" ]; then
        echo -e "${YELLOW}📊 Размер bundle: $BUILD_SIZE${NC}"
    fi
else
    check_test 1 "Проект НЕ собирается"
    echo "Смотри лог: /tmp/build.log"
fi
cd ..

echo ""

# 7. Проверка серверов
echo "🌐 Проверка серверов..."

# Backend
if curl -s http://localhost:5001 > /dev/null 2>&1; then
    check_test 0 "Backend работает на :5001"
else
    check_test 1 "Backend НЕ работает на :5001"
fi

# Frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    check_test 0 "Frontend работает на :3000"
else
    check_test 1 "Frontend НЕ работает на :3000"
fi

echo ""

# 8. Проверка импортов
echo "🔍 Проверка импортов..."
if grep -r "babylon" frontend/src --exclude-dir=node_modules 2>/dev/null; then
    check_test 1 "Найдены импорты Babylon.js в коде"
else
    check_test 0 "Импорты Babylon.js не найдены"
fi

echo ""

# 9. Проверка CSS файлов
echo "🎨 Проверка CSS..."
test -f "frontend/src/components/Game2D.css"
check_test $? "Game2D.css существует"

! test -f "frontend/src/components/Game3D.css"
check_test $? "Game3D.css удалён"

echo ""

# Итоги
echo "=================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "=================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 Все тесты пройдены!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Некоторые тесты не прошли!${NC}"
    exit 1
fi

