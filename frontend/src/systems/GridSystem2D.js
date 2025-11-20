import { GRID_SIZE, CELL_SIZE, ROAD_GRID_STEP } from '../config/constants';

/**
 * Система управления игровой сеткой (2D версия)
 * Отвечает за:
 * - Логику дорог и клеток
 * - Хранение состояния зданий
 * - Пространственные запросы
 * - БЕЗ Babylon.js зависимостей
 */
export class GridSystem2D {
    constructor(onCellClickCallback) {
        this.onCellClickCallback = onCellClickCallback;

        this.GRID_SIZE = GRID_SIZE;
        this.CELL_SIZE = CELL_SIZE;

        // Хранение состояния
        this.grid = []; // 2D массив зданий
        this.buildings = []; // Плоский список всех зданий

        // Данные о дорогах
        this.roads = new Set(); // Все дорожные клетки
        this.horizontalRoads = new Set(); // Горизонтальные дороги
        this.verticalRoads = new Set(); // Вертикальные дороги
        this.intersections = new Set(); // Перекрестки

        this.roadLines = {
            horizontal: [], // Y координаты горизонтальных дорог
            vertical: []    // X координаты вертикальных дорог
        };

        // Инициализация сетки
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.GRID_SIZE; x++) {
                this.grid[y][x] = null;
            }
        }

        this.createGameGrid();
    }

    /**
     * Создает логическую структуру сетки
     */
    createGameGrid() {
        console.log('GridSystem2D: Creating logical grid...');

        // РЕГУЛЯРНАЯ СЕТКА ДОРОГ

        // Генерируем горизонтальные дороги
        for (let y = 0; y < this.GRID_SIZE; y += ROAD_GRID_STEP) {
            this.roadLines.horizontal.push(y);

            for (let x = 0; x < this.GRID_SIZE; x++) {
                this.roads.add(`${x},${y}`);
                this.horizontalRoads.add(`${x},${y}`);
            }
        }

        // Генерируем вертикальные дороги
        for (let x = 0; x < this.GRID_SIZE; x += ROAD_GRID_STEP) {
            this.roadLines.vertical.push(x);

            for (let y = 0; y < this.GRID_SIZE; y++) {
                this.roads.add(`${x},${y}`);
                this.verticalRoads.add(`${x},${y}`);
            }
        }

        // Определяем перекрестки
        for (let x of this.roadLines.vertical) {
            for (let y of this.roadLines.horizontal) {
                this.intersections.add(`${x},${y}`);
            }
        }

        // Добавляем виртуальные дороги ВОКРУГ поля для машин (для логики движения)
        // Северная дорога (y = -1)
        for (let x = 0; x < this.GRID_SIZE; x++) {
            this.roads.add(`${x},-1`);
            this.horizontalRoads.add(`${x},-1`);
        }
        // Южная дорога (y = GRID_SIZE)
        for (let x = 0; x < this.GRID_SIZE; x++) {
            this.roads.add(`${x},${this.GRID_SIZE}`);
            this.horizontalRoads.add(`${x},${this.GRID_SIZE}`);
        }
        // Западная дорога (x = -1)
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this.roads.add(`-1,${y}`);
            this.verticalRoads.add(`-1,${y}`);
        }
        // Восточная дорога (x = GRID_SIZE)
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this.roads.add(`${this.GRID_SIZE},${y}`);
            this.verticalRoads.add(`${this.GRID_SIZE},${y}`);
        }

        // Добавляем углы
        this.roads.add(`-1,-1`);
        this.roads.add(`${this.GRID_SIZE},-1`);
        this.roads.add(`-1,${this.GRID_SIZE}`);
        this.roads.add(`${this.GRID_SIZE},${this.GRID_SIZE}`);

        // Добавляем координаты внешних дорог в roadLines
        this.roadLines.horizontal.push(-1);
        this.roadLines.horizontal.push(this.GRID_SIZE);
        this.roadLines.vertical.push(-1);
        this.roadLines.vertical.push(this.GRID_SIZE);

        // Сортируем
        this.roadLines.horizontal.sort((a, b) => a - b);
        this.roadLines.vertical.sort((a, b) => a - b);

        console.log('GridSystem2D: Logical grid created');
    }

    /**
     * Размещает здание на клетке
     */
    placeBuilding(x, y, buildingData) {
        this.grid[y][x] = buildingData;
        this.buildings.push(buildingData);
    }

    /**
     * Проверяет, занята ли клетка
     */
    isCellOccupied(x, y) {
        return this.grid[y] && this.grid[y][x] !== null;
    }

    /**
     * Проверяет, есть ли доступ к дороге
     */
    hasRoadAccess(x, y) {
        // Проверяем, что клетка не дорога
        if (this.roads.has(`${x},${y}`)) {
            return false; // Нельзя строить на дороге
        }

        // Проверяем соседние клетки (4 направления)
        const directions = [
            { dx: -1, dy: 0 }, // Запад
            { dx: 1, dy: 0 },  // Восток
            { dx: 0, dy: -1 }, // Север
            { dx: 0, dy: 1 }   // Юг
        ];

        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;

            // Проверяем, есть ли рядом дорога
            if (this.roads.has(`${nx},${ny}`)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Получает соседей клетки (4 направления)
     */
    getNeighbors(x, y) {
        const neighbors = [];
        const directions = [
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }
        ];

        directions.forEach(dir => {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (nx >= 0 && nx < this.GRID_SIZE && ny >= 0 && ny < this.GRID_SIZE && this.grid[ny][nx]) {
                neighbors.push(this.grid[ny][nx]);
            }
        });

        return neighbors;
    }

    /**
     * Получает все здания в радиусе
     */
    getNearby(x, y, radius) {
        const nearby = [];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.GRID_SIZE && ny >= 0 && ny < this.GRID_SIZE && this.grid[ny][nx]) {
                    nearby.push(this.grid[ny][nx]);
                }
            }
        }
        return nearby;
    }

    /**
     * Подсчитывает здания определенного типа
     */
    countBuildingType(type) {
        return this.buildings.filter(b => b.type === type).length;
    }
}

export default GridSystem2D;
