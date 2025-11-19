import * as BABYLON from '@babylonjs/core';
import { GRID_SIZE, CELL_SIZE, ROAD_GRID_STEP } from '../config/constants';

/**
 * Система управления игровой сеткой
 * Отвечает за:
 * - Генерацию дорог и клеток
 * - Хранение состояния зданий
 * - Пространственные запросы (соседи, поиск в радиусе)
 */
export class GridSystem {
    constructor(scene, onCellClickCallback) {
        this.scene = scene;
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
        
        // Создаем общий материал для дорог с текстурой
        this.roadMaterial = this.createRoadMaterial();
        
        // Инициализация сетки
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.GRID_SIZE; x++) {
                this.grid[y][x] = null;
            }
        }
    }
    
    /**
     * Создает общий материал для дорог с текстурой
     */
    createRoadMaterial() {
        const roadMat = new BABYLON.StandardMaterial('roadMaterialShared', this.scene);
        
        // Пытаемся загрузить текстуру дороги
        try {
            const roadTexture = new BABYLON.Texture('/textures/road.jpg', this.scene);
            roadTexture.uScale = 2; // Повторение текстуры
            roadTexture.vScale = 2;
            roadMat.diffuseTexture = roadTexture;
            console.log('✅ Road texture loaded for game grid');
        } catch (e) {
            console.warn('⚠️ Road texture not found, using solid color');
            roadMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Серая дорога (fallback)
        }
        
        roadMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        return roadMat;
    }
    
    /**
     * Создает городскую сетку со случайными дорогами
     */
    createGameGrid() {
        console.log('GridSystem: Creating game grid with regular road network...');
        
        // РЕГУЛЯРНАЯ СЕТКА ДОРОГ для гарантированного доступа к зданиям
        // Дорога каждые ROAD_GRID_STEP клеток
        
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
        
        const numHorizontal = this.roadLines.horizontal.length;
        const numVertical = this.roadLines.vertical.length;
        console.log(`GridSystem: Created regular road grid - ${numHorizontal} horizontal and ${numVertical} vertical roads (step: ${ROAD_GRID_STEP})`);
        
        // Определяем перекрестки
        for (let x of this.roadLines.vertical) {
            for (let y of this.roadLines.horizontal) {
                this.intersections.add(`${x},${y}`);
            }
        }
        
        // Добавляем виртуальные дороги ВОКРУГ поля для машин
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
        
        // Сортируем для корректной работы алгоритма движения
        this.roadLines.horizontal.sort((a, b) => a - b);
        this.roadLines.vertical.sort((a, b) => a - b);
        
        console.log(`GridSystem: Added ${this.GRID_SIZE * 4 + 4} virtual road cells around the grid`);
        
        // Создаём клетки с учетом дорог
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                const isRoad = this.roads.has(`${x},${y}`);
                const isHorizontal = this.horizontalRoads.has(`${x},${y}`) && !this.verticalRoads.has(`${x},${y}`);
                const isVertical = this.verticalRoads.has(`${x},${y}`) && !this.horizontalRoads.has(`${x},${y}`);
                const isIntersection = this.intersections.has(`${x},${y}`);
                
                this.createGridCell(x, y, isRoad, isHorizontal, isVertical, isIntersection);
            }
        }
        
        console.log('GridSystem: Game grid created successfully');
    }
    
    /**
     * Создает одну клетку сетки (дорога или участок)
     */
    createGridCell(x, y, isRoad = false, isHorizontal = false, isVertical = false, isIntersection = false) {
        const cellSize = this.CELL_SIZE;
        const posX = x * cellSize + cellSize / 2;
        const posZ = y * cellSize + cellSize / 2;
        
        if (isRoad) {
            // Создаём дорогу (тонкую или полную в зависимости от типа)
            const roadWidth = cellSize * 0.5;
            
            let roadDimensions;
            if (isIntersection) {
                // Перекресток - ПОЛНЫЙ размер чтобы не было пробелов
                roadDimensions = { width: cellSize, height: cellSize };
            } else if (isHorizontal) {
                roadDimensions = { width: cellSize, height: roadWidth };
            } else if (isVertical) {
                roadDimensions = { width: roadWidth, height: cellSize };
            }
            
            const road = BABYLON.MeshBuilder.CreateGround(
                `road_${x}_${y}`,
                roadDimensions,
                this.scene
            );
            road.position = new BABYLON.Vector3(posX, 0.01, posZ);
            
            // Используем общий материал для всех дорог
            road.material = this.roadMaterial;
            
            // Разметка (убрана яркость)
            if (isIntersection) {
                // Зебра - менее яркая
                for (let i = 0; i < 4; i++) {
                    const stripe = BABYLON.MeshBuilder.CreateBox(
                        `stripe_${x}_${y}_${i}`,
                        { width: 0.1, height: 0.02, depth: cellSize * 0.8 },
                        this.scene
                    );
                    stripe.position = new BABYLON.Vector3(
                        posX - cellSize * 0.3 + i * 0.2,
                        0.02,
                        posZ
                    );
                    
                    const stripeMat = new BABYLON.StandardMaterial(`stripeMat_${x}_${y}_${i}`, this.scene);
                    stripeMat.diffuseColor = new BABYLON.Color3(0.8, 0.8, 0.8); // Менее яркий белый
                    stripeMat.emissiveColor = new BABYLON.Color3(0, 0, 0); // Убрали свечение
                    stripe.material = stripeMat;
                }
            } else if (isHorizontal && !isVertical) {
                // Горизонтальная линия - менее яркая
                const line = BABYLON.MeshBuilder.CreateBox(
                    `line_${x}_${y}`,
                    { width: cellSize * 0.7, height: 0.02, depth: 0.08 },
                    this.scene
                );
                line.position = new BABYLON.Vector3(posX, 0.02, posZ);
                
                const lineMat = new BABYLON.StandardMaterial(`lineMat_${x}_${y}`, this.scene);
                lineMat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.5); // Менее яркий желтый
                lineMat.emissiveColor = new BABYLON.Color3(0, 0, 0); // Убрали свечение
                line.material = lineMat;
            } else if (isVertical && !isHorizontal) {
                // Вертикальная линия - менее яркая
                const line = BABYLON.MeshBuilder.CreateBox(
                    `line_${x}_${y}`,
                    { width: 0.08, height: 0.02, depth: cellSize * 0.7 },
                    this.scene
                );
                line.position = new BABYLON.Vector3(posX, 0.02, posZ);
                
                const lineMat = new BABYLON.StandardMaterial(`lineMat_${x}_${y}`, this.scene);
                lineMat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.5); // Менее яркий желтый
                lineMat.emissiveColor = new BABYLON.Color3(0, 0, 0); // Убрали свечение
                line.material = lineMat;
            }
            
            return; // Дорога не интерактивна
        }
        
        // Обычная клетка для строительства
        const cell = BABYLON.MeshBuilder.CreateGround(
            `cell_${x}_${y}`,
            { width: cellSize - 0.1, height: cellSize - 0.1 },
            this.scene
        );
        cell.position = new BABYLON.Vector3(posX, 0.02, posZ);
        
        // Проверяем доступ к дороге
        const hasAccess = this.hasRoadAccess(x, y);
        
        const cellMat = new BABYLON.StandardMaterial(`cellMat_${x}_${y}`, this.scene);
        if (hasAccess) {
            // Зеленая - можно строить
            cellMat.diffuseColor = new BABYLON.Color3(0.4, 0.8, 0.4);
        } else {
            // Серая - нельзя строить (нет доступа к дороге)
            cellMat.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        }
        cellMat.alpha = 0.3;
        cellMat.specularColor = new BABYLON.Color3(0, 0, 0);
        cell.material = cellMat;
        
        // Рамка
        const border = BABYLON.MeshBuilder.CreateGround(
            `border_${x}_${y}`,
            { width: cellSize, height: cellSize },
            this.scene
        );
        border.position = new BABYLON.Vector3(posX, 0.01, posZ);
        
        const borderMat = new BABYLON.StandardMaterial(`borderMat_${x}_${y}`, this.scene);
        borderMat.diffuseColor = new BABYLON.Color3(0.3, 0.6, 0.3); // Зеленая рамка
        borderMat.alpha = 0.5;
        borderMat.wireframe = true;
        border.material = borderMat;
        
        // Интерактивность
        cell.actionManager = new BABYLON.ActionManager(this.scene);
        
        cell.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    if (!this.grid[y][x]) {
                        cellMat.alpha = 0.6;
                        cellMat.emissiveColor = new BABYLON.Color3(0.2, 0.4, 0.2);
                    }
                }
            )
        );
        
        cell.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    if (!this.grid[y][x]) {
                        cellMat.alpha = 0.3;
                        cellMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
                    }
                }
            )
        );
        
        cell.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    this.onCellClickCallback(x, y);
                }
            )
        );
        
        cell.receiveShadows = true;
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
     * Проверяет, есть ли доступ к дороге (соседняя клетка должна быть дорогой)
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

export default GridSystem;
