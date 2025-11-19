# 🚗 Гайд по настройке поворота машины

## Проблема
Машина едет не в ту сторону или поворачивает неправильно.

## Решение
Откройте файл `frontend/src/config/constants.js` и измените константы:

### 1. Базовая ориентация модели

```javascript
export const CAR_BASE_ROTATION_Y = Math.PI; // 180°
```

**Попробуйте эти значения:**
- `0` - если передняя часть смотрит вправо (→)
- `Math.PI / 2` (90°) - если вниз (↓)
- `Math.PI` (180°) - если влево (←)
- `-Math.PI / 2` (-90°) - если вверх (↑)

### 2. Углы для направлений движения

```javascript
export const CAR_ROTATION_RIGHT = 0;           // Вправо →
export const CAR_ROTATION_LEFT = Math.PI;      // Влево ←
export const CAR_ROTATION_UP = -Math.PI / 2;   // Вверх ↑
export const CAR_ROTATION_DOWN = Math.PI / 2;  // Вниз ↓
```

## Как настроить:

1. Запустите игру и посмотрите куда едет машина
2. Если едет **задом**:
   - Добавьте `Math.PI` (180°) к `CAR_BASE_ROTATION_Y`
3. Если едет **боком**:
   - Добавьте или отнимите `Math.PI / 2` (90°)
4. Если **поворачивает не туда** на перекрёстке:
   - Измените соответствующую константу направления

## Примеры:

### Машина всегда едет задом
```javascript
export const CAR_BASE_ROTATION_Y = 0; // Было Math.PI
```

### Машина поворачивает вправо вместо влево
```javascript
export const CAR_ROTATION_LEFT = 0;        // Поменять
export const CAR_ROTATION_RIGHT = Math.PI; // местами
```

После изменений игра автоматически перезагрузится!

