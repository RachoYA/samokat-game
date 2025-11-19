// ===========================
// 3D МИКРОРАЙОН - BABYLON.JS
// ===========================

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders'; // Enable GLTF/GLB loading
import { GridSystem } from './systems/GridSystem';
import { MissionSystem } from './systems/MissionSystem';
import { createBuildingTypes } from './config/buildings';
import { MissionTemplates } from './config/missions';
import { 
    GRID_SIZE, 
    CELL_SIZE,
    CAR_COUNT,
    PEOPLE_COUNT,
    CAR_BASE_ROTATION_X,
    CAR_BASE_ROTATION_Y,
    CAR_ROTATION_RIGHT,
    CAR_ROTATION_LEFT,
    CAR_ROTATION_UP,
    CAR_ROTATION_DOWN
} from './config/constants';

// Создаем BuildingTypes с Babylon.js Color3
const BuildingTypes = createBuildingTypes(BABYLON);

/* eslint-disable no-restricted-globals */
/* global confirm */

// Основной класс игры
class Game3D {
    constructor(canvas = null) {
        // В React версии canvas передается как параметр
        this.canvas = canvas || document.getElementById('renderCanvas');

        if (!this.canvas) {
            console.error('Canvas element not found!');
            throw new Error('Canvas element is required');
        }

        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });
        
        this.GRID_SIZE = GRID_SIZE;
        this.CELL_SIZE = CELL_SIZE;
        this.modelCache = {};
        
        this.score = 0;
        this.moves = 0;
        this.maxMoves = this.GRID_SIZE * this.GRID_SIZE * 2; // Удвоенное количество ходов для большей карты
        this.highScore = parseInt(localStorage.getItem('highScore3D')) || 0;
        
        this.currentCards = [];
        this.selectedCard = null;
        
        this.recentBuildings = []; // История последних выданных зданий для баланса
        
        this.scene = null;
        this.camera = null;
        
        console.log('Game3D constructor completed, starting init...');
        this.init();
    }
    
    init() {
        console.log('Init started - initializing grid...');

        console.log('Creating scene...');
        // Создание сцены
        this.createScene();
        
        // Инициализация систем
        this.gridSystem = new GridSystem(this.scene, (x, y) => this.onCellClick(x, y));
        this.missionSystem = new MissionSystem((mission) => {
            console.log(`Mission completed: ${mission.desc}`);
            this.score += mission.reward;
            this.updateUI();
        });

        // Создание сетки игрового поля
        this.gridSystem.createGameGrid();

        // Создание анимированных объектов
        this.createAnimatedObjects();

        console.log('Generating missions and cards...');
        // Генерация карт
        this.generateCards();
        
        console.log('Starting render loop...');
        // Запуск рендера
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
        
        // Resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        console.log('Init completed!');
    }
    
    createScene() {
        console.log('createScene: Creating Babylon scene...');
        this.scene = new BABYLON.Scene(this.engine);
        console.log('createScene: Scene created');

        // 1. Cartoon Sky (Solid Color)
        this.scene.clearColor = new BABYLON.Color4(0.53, 0.81, 0.98, 1); // Sky Blue #87CEFA

        // 2. Lighting (Bright & Flat)
        // Ambient light (равномерное освещение)
        const ambient = new BABYLON.HemisphericLight(
            'ambient',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.5; // Было 0.6
        ambient.diffuse = new BABYLON.Color3(1, 1, 1);
        ambient.groundColor = new BABYLON.Color3(0.5, 0.5, 0.5);

        // Sun light (для теней)
        const sunLight = new BABYLON.DirectionalLight(
            'sunLight',
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        sunLight.position = new BABYLON.Vector3(20, 40, 20);
        sunLight.intensity = 0.5; // Было 0.7

        // 3. Shadows (Sharp/Hard)
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, sunLight);
        shadowGenerator.useBlurExponentialShadowMap = false; // Hard shadows
        shadowGenerator.usePoissonSampling = false;
        this.shadowGenerator = shadowGenerator;
        
        // Камера
        const gridCenter = (this.GRID_SIZE * this.CELL_SIZE) / 2;
        const cameraRadius = this.GRID_SIZE * 3.5; // Автоматический радиус в зависимости от размера поля
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            -Math.PI / 4,
            Math.PI / 3,
            cameraRadius,
            new BABYLON.Vector3(gridCenter, 0, gridCenter),
            this.scene
        );
        this.camera.attachControl(this.canvas, true);
        
        // ============================================================================
        // 📱 МОБИЛЬНАЯ АДАПТАЦИЯ - Touch Controls
        // ============================================================================
        
        // Улучшенные настройки для touch-устройств
        this.camera.panningSensibility = 50; // Чувствительность панорамирования
        this.camera.angularSensibilityX = 2000; // Чувствительность вращения по X (уменьшаем для плавности)
        this.camera.angularSensibilityY = 2000; // Чувствительность вращения по Y
        this.camera.pinchPrecision = 100; // Точность pinch-zoom на мобильных
        this.camera.pinchDeltaPercentage = 0.01; // Процент изменения при pinch
        
        // Инерция для более плавного управления на touch
        this.camera.inertia = 0.9;
        this.camera.panningInertia = 0.9;
        
        // Ограничения для камеры (адаптивные)
        this.camera.lowerRadiusLimit = cameraRadius * 0.3;
        this.camera.upperRadiusLimit = cameraRadius * 2.5;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2.2;
        this.camera.wheelPrecision = 50;
        
        console.log(`📷 Camera setup: radius=${cameraRadius.toFixed(1)}, center=(${gridCenter}, 0, ${gridCenter})`);

        // Создание окружения (земля, дороги, декор)
        this.createEnvironment();
        
        console.log('Scene created successfully with roads and environment');
    }
    
    createEnvironment() {
        const gridCenter = (this.GRID_SIZE * this.CELL_SIZE) / 2;
        
        // Земля (Cartoon) - адаптивный размер
        const groundSize = (this.GRID_SIZE * this.CELL_SIZE) * 1.5; // 150% от размера поля
        const ground = BABYLON.MeshBuilder.CreateGround(
            'ground',
            { width: groundSize, height: groundSize },
            this.scene
        );
        // ЦЕНТРИРУЕМ землю на центре сетки
        ground.position = new BABYLON.Vector3(gridCenter, -0.1, gridCenter);
        console.log(`🌍 Ground created and centered: ${groundSize.toFixed(1)}x${groundSize.toFixed(1)} at (${gridCenter}, ${gridCenter})`);
        
        const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
        // Try custom ground texture
        try {
            groundMat.diffuseTexture = new BABYLON.Texture('/textures/ground.jpg', this.scene);
        } catch (e) {
            groundMat.diffuseColor = new BABYLON.Color3(0.4, 0.8, 0.4); // fallback bright grass
        }
        groundMat.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMat;
        ground.receiveShadows = true;
        this.enableCartoonOutline(ground);
        
        // Городской фон - дальние здания
        // this.createCityBackground();
        
        // Дороги вокруг игрового поля
        this.createRoads();
        
        // Декоративные элементы
        this.createDecorations();
        
        // Компас для ориентации
        this.createCompass();
    }
    
    createCityBackground() {
        const gridCenter = (this.GRID_SIZE * this.CELL_SIZE) / 2;
        const gridSize = this.GRID_SIZE * this.CELL_SIZE;
        
        // Создаём дальние здания по периметру
        const distantBuildingsData = [
            // Север
            { x: gridCenter - 10, z: -15, width: 8, height: 25, depth: 6 },
            { x: gridCenter, z: -18, width: 6, height: 30, depth: 5 },
            { x: gridCenter + 12, z: -14, width: 7, height: 22, depth: 6 },
            
            // Юг
            { x: gridCenter - 8, z: gridSize + 15, width: 9, height: 28, depth: 7 },
            { x: gridCenter + 10, z: gridSize + 17, width: 6, height: 24, depth: 5 },
            
            // Запад
            { x: -12, z: gridCenter - 5, width: 5, height: 26, depth: 10 },
            { x: -16, z: gridCenter + 8, width: 6, height: 20, depth: 8 },
            
            // Восток
            { x: gridSize + 14, z: gridCenter, width: 7, height: 32, depth: 9 },
            { x: gridSize + 18, z: gridCenter - 10, width: 5, height: 18, depth: 6 }
        ];
        
        distantBuildingsData.forEach((data, i) => {
            const building = BABYLON.MeshBuilder.CreateBox(
                `distantBuilding${i}`,
                { width: data.width, height: data.height, depth: data.depth },
                this.scene
            );
            building.position = new BABYLON.Vector3(data.x, data.height / 2, data.z);
            
            const mat = new BABYLON.StandardMaterial(`distantMat${i}`, this.scene);
            // Светлые пастельные здания
            mat.diffuseColor = new BABYLON.Color3(0.85, 0.87, 0.92);
            mat.specularColor = new BABYLON.Color3(0.7, 0.7, 0.75);
            mat.emissiveColor = new BABYLON.Color3(0.95, 0.96, 0.98);
            building.material = mat;
            
            // Окна (светящиеся точки)
            this.addWindowsToBuilding(building, data);
        });
    }
    
    addWindowsToBuilding(building, data) {
        const windowsX = Math.floor(data.width / 1.5);
        const windowsY = Math.floor(data.height / 2);
        const windowsZ = Math.floor(data.depth / 1.5);
        
        for (let y = 0; y < windowsY; y++) {
            for (let x = 0; x < windowsX; x++) {
                // Случайно включённые окна
                if (Math.random() > 0.3) {
                    const window = BABYLON.MeshBuilder.CreateBox(
                        `window_${building.name}_${x}_${y}`,
                        { width: 0.3, height: 0.4, depth: 0.05 },
                        this.scene
                    );
                    
                    const offsetX = (x - windowsX / 2) * 1.5;
                    const offsetY = (y - windowsY / 2) * 2 + 2;
                    
                    window.position = new BABYLON.Vector3(
                        building.position.x + offsetX,
                        building.position.y + offsetY,
                        building.position.z + data.depth / 2
                    );
                    
                    const windowMat = new BABYLON.StandardMaterial(`windowMat_${x}_${y}`, this.scene);
                    windowMat.emissiveColor = new BABYLON.Color3(1, 0.9, 0.6);
                    windowMat.disableLighting = true;
                    window.material = windowMat;
                    
                    window.parent = building;
                }
            }
        }
    }
    
    createRoads() {
        const gridSize = this.GRID_SIZE * this.CELL_SIZE;
        const roadWidth = this.CELL_SIZE * 0.5; // Такая же ширина как у внутренних дорог
        
        console.log(`🛣️ Creating roads around grid (gridSize: ${gridSize}, roadWidth: ${roadWidth})`);

        // Дорога (Cartoon)
        const roadMat = new BABYLON.StandardMaterial('roadMat', this.scene);
        
        // Пытаемся загрузить текстуру дороги
        try {
            const roadTexture = new BABYLON.Texture('/textures/road.jpg', this.scene);
            roadTexture.uScale = 5; // Повторение текстуры
            roadTexture.vScale = 5;
            roadMat.diffuseTexture = roadTexture;
            console.log('✅ Road texture loaded successfully');
        } catch (e) {
            console.warn('⚠️ Road texture not found, using solid color');
            roadMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Серая дорога (fallback)
        }
        
        roadMat.specularColor = new BABYLON.Color3(0, 0, 0); // No specular
        
        // Север (сверху)
        const roadN = BABYLON.MeshBuilder.CreateGround(
            'roadN',
            { width: gridSize + roadWidth * 2, height: roadWidth },
            this.scene
        );
        roadN.position = new BABYLON.Vector3(gridSize / 2, 0.01, -roadWidth / 2);
        roadN.material = roadMat;
        roadN.receiveShadows = true;
        console.log(`🛣️ Road North created at (${roadN.position.x}, ${roadN.position.z})`);
        
        // Юг (снизу)
        const roadS = BABYLON.MeshBuilder.CreateGround(
            'roadS',
            { width: gridSize + roadWidth * 2, height: roadWidth },
            this.scene
        );
        roadS.position = new BABYLON.Vector3(gridSize / 2, 0.01, gridSize + roadWidth / 2);
        roadS.material = roadMat;
        roadS.receiveShadows = true;
        console.log(`🛣️ Road South created at (${roadS.position.x}, ${roadS.position.z})`);
        
        // Запад (слева)
        const roadW = BABYLON.MeshBuilder.CreateGround(
            'roadW',
            { width: roadWidth, height: gridSize },
            this.scene
        );
        roadW.position = new BABYLON.Vector3(-roadWidth / 2, 0.01, gridSize / 2);
        roadW.material = roadMat;
        roadW.receiveShadows = true;
        console.log(`🛣️ Road West created at (${roadW.position.x}, ${roadW.position.z})`);
        
        // Восток (справа)
        const roadE = BABYLON.MeshBuilder.CreateGround(
            'roadE',
            { width: roadWidth, height: gridSize },
            this.scene
        );
        roadE.position = new BABYLON.Vector3(gridSize + roadWidth / 2, 0.01, gridSize / 2);
        roadE.material = roadMat;
        roadE.receiveShadows = true;
        console.log(`🛣️ Road East created at (${roadE.position.x}, ${roadE.position.z})`);
        
        console.log(`✅ All 4 roads around grid created successfully`);
    }
    
    createDecorations() {
        const gridCenter = (this.GRID_SIZE * this.CELL_SIZE) / 2;
        const gridSize = this.GRID_SIZE * this.CELL_SIZE;
        const offset = 4;
        
        // Деревья по углам (центрированные)
        const corners = [
            { x: 0 - offset, z: 0 - offset },
            { x: 0 - offset, z: gridSize + offset },
            { x: gridSize + offset, z: 0 - offset },
            { x: gridSize + offset, z: gridSize + offset }
        ];
        
        corners.forEach((corner, i) => {
            this.createDecorativeTree(corner.x, corner.z, `tree_corner_${i}`);
        });
    }
    
    createDecorativeTree(x, z, name) {
        // Ствол
        const trunk = BABYLON.MeshBuilder.CreateCylinder(
            `${name}_trunk`,
            { diameter: 0.3, height: 2 },
            this.scene
        );
        trunk.position = new BABYLON.Vector3(x, 1, z);
        
        const trunkMat = new BABYLON.StandardMaterial(`${name}_trunkMat`, this.scene);
        trunkMat.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
        trunk.material = trunkMat;
        
        // Крона
        const foliage = BABYLON.MeshBuilder.CreateSphere(
            `${name}_foliage`,
            { diameter: 2.5 },
            this.scene
        );
        foliage.position = new BABYLON.Vector3(x, 2.5, z);
        
        const foliageMat = new BABYLON.StandardMaterial(`${name}_foliageMat`, this.scene);
        foliageMat.diffuseColor = new BABYLON.Color3(0.1, 0.5, 0.2);
        foliageMat.specularColor = new BABYLON.Color3(0.1, 0.3, 0.1);
        foliage.material = foliageMat;
        
        this.shadowGenerator.addShadowCaster(trunk);
        this.shadowGenerator.addShadowCaster(foliage);
    }
    
    // Создание компаса для ориентации
    createCompass() {
        const gridSize = this.GRID_SIZE * this.CELL_SIZE;
        // Размещаем компас в правом нижнем углу игрового поля (от начала координат)
        const compassX = gridSize - 3; // Вправо от начала, но внутри поля
        const compassZ = gridSize - 3; // Вниз от начала, но внутри поля
        const compassY = 0.1; // Чуть над землей
        
        // Центральный диск компаса
        const compassBase = BABYLON.MeshBuilder.CreateCylinder(
            'compassBase',
            { diameter: 2, height: 0.1 },
            this.scene
        );
        compassBase.position = new BABYLON.Vector3(compassX, compassY, compassZ);
        
        const baseMat = new BABYLON.StandardMaterial('compassBaseMat', this.scene);
        baseMat.diffuseColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        baseMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        compassBase.material = baseMat;
        
        // Создаем стрелки для направлений
        const arrowLength = 1.2;
        const arrowWidth = 0.15;
        
        // Север (N) - вверх по оси Z- (синий)
        this.createCompassArrow(compassX, compassY + 0.1, compassZ - arrowLength/2, 
                                0, 0, 0, // rotation
                                new BABYLON.Color3(0.2, 0.4, 1), 'N');
        
        // Юг (S) - вниз по оси Z+ (зеленый)
        this.createCompassArrow(compassX, compassY + 0.1, compassZ + arrowLength/2, 
                                0, Math.PI, 0, // rotation
                                new BABYLON.Color3(0.3, 0.8, 0.3), 'S');
        
        // Восток (E) - вправо по оси X+ (красный)
        this.createCompassArrow(compassX + arrowLength/2, compassY + 0.1, compassZ, 
                                0, Math.PI/2, 0, // rotation
                                new BABYLON.Color3(1, 0.3, 0.3), 'E');
        
        // Запад (W) - влево по оси X- (желтый)
        this.createCompassArrow(compassX - arrowLength/2, compassY + 0.1, compassZ, 
                                0, -Math.PI/2, 0, // rotation
                                new BABYLON.Color3(1, 0.9, 0.2), 'W');
        
        console.log('🧭 Компас создан! N=Север(Z-/синий), S=Юг(Z+/зеленый), E=Восток(X+/красный), W=Запад(X-/желтый)');
    }
    
    createCompassArrow(x, y, z, rotX, rotY, rotZ, color, label) {
        // Создаем стрелку из конуса
        const arrow = BABYLON.MeshBuilder.CreateCylinder(
            `compassArrow_${label}`,
            { diameterTop: 0, diameterBottom: 0.3, height: 0.6 },
            this.scene
        );
        arrow.position = new BABYLON.Vector3(x, y, z);
        arrow.rotation = new BABYLON.Vector3(rotX, rotY, rotZ);
        
        const arrowMat = new BABYLON.StandardMaterial(`compassArrowMat_${label}`, this.scene);
        arrowMat.diffuseColor = color;
        arrowMat.emissiveColor = color.scale(0.3);
        arrow.material = arrowMat;
        
        // Добавляем текстовую метку
        const labelHeight = 0.8;
        const dynamicTexture = new BABYLON.DynamicTexture(
            `compassLabel_${label}`,
            { width: 256, height: 256 },
            this.scene
        );
        const ctx = dynamicTexture.getContext();
        ctx.font = 'bold 180px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 128, 128);
        dynamicTexture.update();
        
        const labelPlane = BABYLON.MeshBuilder.CreatePlane(
            `compassLabelPlane_${label}`,
            { width: 0.5, height: 0.5 },
            this.scene
        );
        labelPlane.position = new BABYLON.Vector3(x, y + labelHeight, z);
        labelPlane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        const labelMat = new BABYLON.StandardMaterial(`compassLabelMat_${label}`, this.scene);
        labelMat.diffuseTexture = dynamicTexture;
        labelMat.emissiveTexture = dynamicTexture;
        labelMat.opacityTexture = dynamicTexture;
        labelMat.backFaceCulling = false;
        labelPlane.material = labelMat;
    }
    
    // Helper to enable cartoon outline on a mesh
    enableCartoonOutline(mesh) {
        mesh.renderOutline = true;
        mesh.outlineWidth = 0.05;
        mesh.outlineColor = BABYLON.Color3.Black();
    }

    // Helper to load and cache models
    async createModelInstance(modelName) {
        const modelPath = `/models/`;
        const fileName = `${modelName}.glb`;
        
        console.log(`🎨 Attempting to load model: ${modelName} from ${modelPath}${fileName}`);
        
        // Возвращаем из кэша если уже загружен
        // ВРЕМЕННО ОТКЛЮЧАЕМ КЭШ ДЛЯ МАШИН для отладки ориентации
        if (this.modelCache[modelName] && modelName !== 'car') {
            console.log(`✅ Using cached model: ${modelName}`);
            const instance = this.modelCache[modelName].clone(`${modelName}_instance_${Date.now()}`);
            if (instance) {
                instance.setEnabled(true);
                instance.getChildMeshes().forEach(mesh => {
                    this.enableCartoonOutline(mesh);
                    this.shadowGenerator.addShadowCaster(mesh);
                });
                return instance;
            }
        }

        try {
            console.log(`📦 Loading model from: ${modelPath}${fileName}`);
            const result = await BABYLON.SceneLoader.ImportMeshAsync('', modelPath, fileName, this.scene);
            
            console.log(`✅ Model loaded successfully: ${modelName}`, result);
            
            // Используем корневой mesh (обычно __root__)
            const rootMesh = result.meshes[0];
            rootMesh.name = `${modelName}_original`;
            
            // Корректируем ориентацию модели в зависимости от типа
            if (modelName === 'car') {
                // Для машины - базовая ориентация из config
                rootMesh.rotation.x = CAR_BASE_ROTATION_X;
                rootMesh.rotation.y = CAR_BASE_ROTATION_Y;
                console.log(`🚗 Car model base rotation: X=${(CAR_BASE_ROTATION_X * 180 / Math.PI).toFixed(0)}°, Y=${(CAR_BASE_ROTATION_Y * 180 / Math.PI).toFixed(0)}°`);
                console.log(`🔧 Movement rotation constants:`);
                console.log(`   RIGHT (E): ${(CAR_ROTATION_RIGHT * 180 / Math.PI).toFixed(0)}°`);
                console.log(`   LEFT (W): ${(CAR_ROTATION_LEFT * 180 / Math.PI).toFixed(0)}°`);
                console.log(`   UP (N): ${(CAR_ROTATION_UP * 180 / Math.PI).toFixed(0)}°`);
                console.log(`   DOWN (S): ${(CAR_ROTATION_DOWN * 180 / Math.PI).toFixed(0)}°`);
            }
            
            rootMesh.setEnabled(false); // Hide the original
            this.modelCache[modelName] = rootMesh;

            const instance = rootMesh.clone(`${modelName}_instance_${Date.now()}`, null, false);
            if (instance) {
                instance.setEnabled(true);
                
                // Включаем все дочерние меши
                instance.getChildMeshes(false).forEach(mesh => {
                    mesh.setEnabled(true);
                    this.enableCartoonOutline(mesh);
                    // Тени только для зданий и людей, не для машин
                    if (modelName !== 'car') {
                        this.shadowGenerator.addShadowCaster(mesh);
                    }
                });
                
                console.log(`✅ Created instance of ${modelName} (shadows: ${modelName !== 'car'})`);
                return instance;
            }
        } catch (error) {
            console.warn(`⚠️ Failed to load custom model for ${modelName}:`, error.message);
            console.log(`ℹ️ Falling back to procedural generation for ${modelName}`);
            return null;
        }
        return null;
    }

    /**
     * Вычисляет угол поворота здания к ближайшей дороге
     */
    calculateRotationToRoad(gridX, gridY) {
        // Проверяем соседние клетки на наличие дорог
        const directions = [
            { dx: 0, dy: -1, rotation: 0 },           // Север (вверх)
            { dx: 1, dy: 0, rotation: Math.PI / 2 },  // Восток (вправо)
            { dx: 0, dy: 1, rotation: Math.PI },      // Юг (вниз)
            { dx: -1, dy: 0, rotation: -Math.PI / 2 } // Запад (влево)
        ];
        
        // Ищем ближайшую дорогу
        for (const dir of directions) {
            const checkX = gridX + dir.dx;
            const checkY = gridY + dir.dy;
            
            if (checkX >= 0 && checkX < this.GRID_SIZE && 
                checkY >= 0 && checkY < this.GRID_SIZE) {
                if (this.gridSystem.roads.has(`${checkX},${checkY}`)) {
                    console.log(`🧭 Building faces road at (${checkX}, ${checkY}), rotation: ${(dir.rotation * 180 / Math.PI).toFixed(0)}°`);
                    return dir.rotation;
                }
            }
        }
        
        // Если дороги рядом нет, ищем ближайшую дорогу в радиусе 2 клеток
        let closestRoad = null;
        let minDistance = Infinity;
        
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const checkX = gridX + dx;
                const checkY = gridY + dy;
                
                if (checkX >= 0 && checkX < this.GRID_SIZE && 
                    checkY >= 0 && checkY < this.GRID_SIZE) {
                    if (this.gridSystem.roads.has(`${checkX},${checkY}`)) {
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestRoad = { dx, dy };
                        }
                    }
                }
            }
        }
        
        if (closestRoad) {
            // Вычисляем угол к ближайшей дороге
            const angle = Math.atan2(closestRoad.dx, -closestRoad.dy);
            console.log(`🧭 Building faces nearest road, rotation: ${(angle * 180 / Math.PI).toFixed(0)}°`);
            return angle;
        }
        
        // По умолчанию смотрит на юг (к камере)
        console.log(`🧭 No road nearby, default rotation: 180°`);
        return Math.PI;
    }
    
    async onCellClick(x, y) {
        if (!this.selectedCard || this.gridSystem.isCellOccupied(x, y)) return;
        
        // ВАЖНО: проверяем доступ к дороге
        if (!this.gridSystem.hasRoadAccess(x, y)) {
            console.warn(`⚠️ Нельзя строить в (${x}, ${y}): рядом нет дороги!`);
            return;
        }
        
        const type = BuildingTypes[this.selectedCard];
        
        // Создаём 3D здание
        const building = await this.create3DBuilding(type, x, y);
        
        // Сохраняем в сетке
        const buildingData = {
            type: this.selectedCard,
            x,
            y,
            mesh: building,
            scoreText: null
        };

        this.gridSystem.placeBuilding(x, y, buildingData);
        
        // Particle эффект
        this.createPlacementParticles(x, y, type);
        
        // Обновляем игру
        this.moves++;
        this.recalculateScores();
        this.updateUI();
        
        // Проверка миссий
        this.missionSystem.checkMissions(this);
        
        // Новые карты
        this.selectedCard = null;
        this.generateCards();
        
        // Проверка конца игры
        if (this.moves >= this.maxMoves) {
            this.endGame();
        }
    }
    
    async create3DBuilding(type, gridX, gridY) {
        const cellSize = this.CELL_SIZE;
        const posX = gridX * cellSize + cellSize / 2;
        const posZ = gridY * cellSize + cellSize / 2;
        const height = type.height;
        
        console.log(`🏗️ Creating building: ${type.name} (${type.id}) at (${gridX}, ${gridY})`);

        // Try to load a custom model for this building type
        const custom = await this.createModelInstance(type.id);
        if (custom) {
            console.log(`🎉 Using custom 3D model for ${type.name}`);
            
            // Вычисляем размер модели для правильного масштабирования
            const boundingInfo = custom.getHierarchyBoundingVectors(true);
            const modelSize = boundingInfo.max.subtract(boundingInfo.min);
            const maxDimension = Math.max(modelSize.x, modelSize.z); // Берем максимальный размер по XZ
            
            // Целевой размер - чуть меньше клетки (оставляем небольшой отступ)
            const targetSize = cellSize * 0.85; // 85% от размера клетки
            const scaleFactor = targetSize / maxDimension;
            
            // Вычисляем центр модели для правильного позиционирования
            const modelCenter = boundingInfo.max.add(boundingInfo.min).scale(0.5);
            
            // Позиционируем с учетом центра модели (ставим на землю с небольшим зазором)
            const groundOffset = 0.02; // Небольшой зазор чтобы не проваливались в землю
            custom.position = new BABYLON.Vector3(
                posX - modelCenter.x * scaleFactor,
                -boundingInfo.min.y * scaleFactor + groundOffset,
                posZ - modelCenter.z * scaleFactor
            );
            
            console.log(`📦 Building positioned: Y=${custom.position.y.toFixed(2)}, minY=${boundingInfo.min.y.toFixed(2)}`);
            
            // Увеличиваем яркость материалов модели ЗНАЧИТЕЛЬНО
            custom.getChildMeshes().forEach(mesh => {
                if (mesh.material) {
                    // Увеличиваем освещенность материала
                    if (mesh.material.diffuseColor) {
                        mesh.material.diffuseColor = mesh.material.diffuseColor.scale(2.0); // +100% яркости
                    }
                    if (mesh.material.emissiveColor) {
                        mesh.material.emissiveColor = mesh.material.emissiveColor.scale(2.5); // +150% свечения
                    } else {
                        // Если нет emissive - добавляем сильное свечение
                        mesh.material.emissiveColor = new BABYLON.Color3(0.5, 0.5, 0.5);
                    }
                }
            });
            
            // Добавляем точечный источник света к зданию
            const buildingLight = new BABYLON.PointLight(
                `buildingLight_${gridX}_${gridY}`,
                new BABYLON.Vector3(posX, custom.position.y + 2, posZ),
                this.scene
            );
            buildingLight.intensity = 0.6;
            buildingLight.range = 10;
            buildingLight.diffuse = new BABYLON.Color3(1, 1, 0.95);
            buildingLight.parent = custom;
            
            // Определяем ближайшую дорогу и поворачиваем здание к ней
            const rotation = this.calculateRotationToRoad(gridX, gridY);
            custom.rotation.y = rotation;
            
            console.log(`📏 Model size: ${maxDimension.toFixed(2)}, scale: ${scaleFactor.toFixed(2)}, rotation: ${(rotation * 180 / Math.PI).toFixed(0)}°`);
            
            // Убедимся что все child meshes получают тени
            custom.getChildMeshes().forEach(mesh => {
                this.shadowGenerator.addShadowCaster(mesh);
                mesh.receiveShadows = true;
            });
            
            // Animation for custom models с правильным масштабом
            custom.scaling = new BABYLON.Vector3(0.01, 0.01, 0.01);
            BABYLON.Animation.CreateAndStartAnimation(
                'appear',
                custom,
                'scaling',
                60,
                30,
                custom.scaling,
                new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor),
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
            return custom;
        }

        console.log(`🔨 Using procedural generation for ${type.name}`);
        
        // Fallback to procedural generation
        let building;
        
        // Разные формы для разных типов зданий
        switch (type.id) {
            case 'house':
                building = this.createHouseModel(posX, posZ, height);
                break;
            case 'park':
                building = this.createParkModel(posX, posZ);
                break;
            case 'cafe':
                building = this.createCafeModel(posX, posZ, height);
                break;
            case 'shop':
                building = this.createShopModel(posX, posZ, height);
                break;
            case 'delivery':
                building = this.createDeliveryModel(posX, posZ, height);
                break;
            case 'warehouse':
                building = this.createWarehouseModel(posX, posZ, height);
                break;
            case 'office':
                building = this.createOfficeModel(posX, posZ, height);
                break;
            default:
                building = this.createDefaultBuilding(posX, posZ, height, type);
        }
        
        // Тень
        this.shadowGenerator.addShadowCaster(building);
        
        // Анимация появления
        building.scaling = new BABYLON.Vector3(0.1, 0.1, 0.1);
        BABYLON.Animation.CreateAndStartAnimation(
            'appear',
            building,
            'scaling',
            60,
            30,
            building.scaling,
            new BABYLON.Vector3(1, 1, 1),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        // Glow отключен (создавал столбы света)
        // if (type.glow) {
        //     this.glowLayer.addIncludedOnlyMesh(building);
        // }
        
        return building;
    }

    createAnimatedObjects() {
        // Массивы для хранения анимированных объектов
        this.cars = [];
        this.people = [];

        // Создаём машинки
        for (let i = 0; i < CAR_COUNT; i++) {
            this.createCar();
        }

        // Создаём людей
        for (let i = 0; i < PEOPLE_COUNT; i++) {
            this.createPerson();
        }

        console.log(`🚗🚶 Created ${CAR_COUNT} cars and ${PEOPLE_COUNT} people`);

        // Запускаем анимацию
        this.animateObjects();
    }

    async createCar() {
        // Try to load a custom car model first
        const customModel = await this.createModelInstance('car');
        if (customModel) {
            // Position randomly on a road cell
            const roadArray = Array.from(this.gridSystem.roads);
            const randomRoad = roadArray[Math.floor(Math.random() * roadArray.length)];
            const [rx, ry] = randomRoad.split(',').map(Number);
            
            // Создаем контейнер для движения/поворота
            const carContainer = new BABYLON.TransformNode('carContainer', this.scene);
            
            // Привязываем модель к контейнеру
            customModel.parent = carContainer;
            
            // Масштабируем машинку (примерно 0.6 метра)
            const boundingInfo = customModel.getHierarchyBoundingVectors(true);
            const modelSize = boundingInfo.max.subtract(boundingInfo.min);
            const maxDimension = Math.max(modelSize.x, modelSize.z);
            const scaleFactor = 0.6 / maxDimension;
            customModel.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            // Центрируем модель ОТНОСИТЕЛЬНО контейнера
            const modelCenter = boundingInfo.max.add(boundingInfo.min).scale(0.5);
            const groundOffset = 0.05; // Машины чуть выше чтобы не проваливались
            customModel.position = new BABYLON.Vector3(
                -modelCenter.x * scaleFactor,
                -boundingInfo.min.y * scaleFactor + groundOffset,
                -modelCenter.z * scaleFactor
            );
            
            // Позиционируем КОНТЕЙНЕР на дороге
            carContainer.position = new BABYLON.Vector3(
                rx * this.CELL_SIZE + this.CELL_SIZE / 2,
                0,
                ry * this.CELL_SIZE + this.CELL_SIZE / 2
            );
            
            // Увеличиваем яркость машины ЗНАЧИТЕЛЬНО
            customModel.getChildMeshes().forEach(mesh => {
                if (mesh.material) {
                    if (mesh.material.diffuseColor) {
                        mesh.material.diffuseColor = mesh.material.diffuseColor.scale(2.0); // +100%
                    }
                    if (mesh.material.emissiveColor && !mesh.material.emissiveColor.equals(BABYLON.Color3.Black())) {
                        mesh.material.emissiveColor = mesh.material.emissiveColor.scale(2.0);
                    } else {
                        mesh.material.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4);
                    }
                }
            });
            
            // Устанавливаем случайный начальный угол поворота КОНТЕЙНЕРА (по оси Y для движения)
            // Базовая ориентация модели (rotation.x, rotation.y) уже применена к customModel внутри
            const initialRotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
            carContainer.rotation.y = initialRotations[Math.floor(Math.random() * initialRotations.length)];
            
            console.log(`🚗 Created car with initial rotation: ${(carContainer.rotation.y * 180 / Math.PI).toFixed(0)}°`);
            
            carContainer.metadata = {
                isCustomModel: true, // Флаг что это кастомная модель
                currentRoadX: rx,
                currentRoadY: ry,
                targetRoadX: null,
                targetRoadY: null,
                targetX: null,
                targetZ: null,
                movingAxis: null, // 'horizontal' или 'vertical'
                targetRotation: carContainer.rotation.y, // Текущий угол как начальный целевой
                speed: 0.02 + Math.random() * 0.02
            };
            this.cars.push(carContainer);
            return;
        }

        // Fallback to procedural car creation (existing logic)
        const car = new BABYLON.Mesh('car', this.scene);

        // Корпус
        const body = BABYLON.MeshBuilder.CreateBox('carBody', {
            width: 0.4,
            height: 0.2,
            depth: 0.6
        }, this.scene);
        body.parent = car;
        body.position.y = 0.1;

        const bodyMat = new BABYLON.StandardMaterial('carBodyMat', this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(
            Math.random(),
            Math.random(),
            Math.random()
        );
        body.material = bodyMat;

        // Кабина
        const cabin = BABYLON.MeshBuilder.CreateBox('carCabin', {
            width: 0.35,
            height: 0.15,
            depth: 0.3
        }, this.scene);
        cabin.parent = car;
        cabin.position.y = 0.275;
        cabin.position.z = -0.05;
        cabin.material = bodyMat;

        // Колеса
        const wheelMat = new BABYLON.StandardMaterial('wheelMat', this.scene);
        wheelMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        const wheelPositions = [
            { x: -0.15, z: 0.2 },
            { x: 0.15, z: 0.2 },
            { x: -0.15, z: -0.2 },
            { x: 0.15, z: -0.2 }
        ];

        wheelPositions.forEach((pos, i) => {
            const wheel = BABYLON.MeshBuilder.CreateCylinder(`wheel${i}`, {
                diameter: 0.12,
                height: 0.05
            }, this.scene);
            wheel.rotation.z = Math.PI / 2;
            wheel.parent = car;
            wheel.position.x = pos.x;
            wheel.position.z = pos.z;
            wheel.position.y = 0.05;
            wheel.material = wheelMat;
        });

        // Случайная позиция на дороге
        const roadArray = Array.from(this.gridSystem.roads);
        const randomRoad = roadArray[Math.floor(Math.random() * roadArray.length)];
        const [rx, ry] = randomRoad.split(',').map(Number);

        car.position.x = rx * this.CELL_SIZE + this.CELL_SIZE / 2;
        car.position.z = ry * this.CELL_SIZE + this.CELL_SIZE / 2;
        car.position.y = 0.05;

        // Направление и скорость
        car.metadata = {
            currentRoadX: rx,
            currentRoadY: ry,
            targetRoadX: null,
            targetRoadY: null,
            targetX: null,
            targetZ: null,
            movingAxis: null, // 'horizontal' или 'vertical'
            speed: 0.02 + Math.random() * 0.02
        };

        this.shadowGenerator.addShadowCaster(body);
        this.shadowGenerator.addShadowCaster(cabin);

        this.cars.push(car);
    }

    async createPerson() {
        // Try to load a custom person model first
        const custom = await this.createModelInstance('person');
        if (custom) {
            // Фильтруем только РЕАЛЬНЫЕ дороги внутри поля (не виртуальные за пределами)
            const roadArray = Array.from(this.gridSystem.roads).filter(road => {
                const [x, y] = road.split(',').map(Number);
                return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
            });
            const randomRoad = roadArray[Math.floor(Math.random() * roadArray.length)];
            const [rx, ry] = randomRoad.split(',').map(Number);
            // Люди теперь ходят по центру дороги, а не по тротуарам
            const offset = 0; // (Math.random() > 0.5 ? 0.35 : -0.35);
            
            // Масштабируем человечка (примерно 0.4 метра)
            const boundingInfo = custom.getHierarchyBoundingVectors(true);
            const modelSize = boundingInfo.max.subtract(boundingInfo.min);
            const maxDimension = Math.max(modelSize.x, modelSize.z);
            const scaleFactor = 0.4 / maxDimension;
            custom.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            
            // Центрируем модель
            const modelCenter = boundingInfo.max.add(boundingInfo.min).scale(0.5);
            const groundOffset = 0.05; // Чуть выше земли
            custom.position = new BABYLON.Vector3(
                rx * this.CELL_SIZE + this.CELL_SIZE / 2 + offset - modelCenter.x * scaleFactor,
                -boundingInfo.min.y * scaleFactor + groundOffset,
                ry * this.CELL_SIZE + this.CELL_SIZE / 2 + offset - modelCenter.z * scaleFactor
            );
            
            // Увеличиваем яркость людей ЗНАЧИТЕЛЬНО
            custom.getChildMeshes().forEach(mesh => {
                if (mesh.material) {
                    if (mesh.material.diffuseColor) {
                        mesh.material.diffuseColor = mesh.material.diffuseColor.scale(2.0); // +100%
                    }
                    if (mesh.material.emissiveColor && !mesh.material.emissiveColor.equals(BABYLON.Color3.Black())) {
                        mesh.material.emissiveColor = mesh.material.emissiveColor.scale(2.0);
                    } else {
                        mesh.material.emissiveColor = new BABYLON.Color3(0.4, 0.4, 0.4);
                    }
                }
            });
            
            custom.metadata = {
                isCustomModel: true, // Флаг что это кастомная модель
                currentRoadX: rx,
                currentRoadY: ry,
                targetRoadX: null,
                targetRoadY: null,
                targetX: null,
                targetZ: null,
                speed: 0.01 + Math.random() * 0.01
            };
            this.people.push(custom);
            return;
        }

        // Fallback to procedural person creation (existing logic)
        const person = new BABYLON.Mesh('person', this.scene);

        // Тело
        const body = BABYLON.MeshBuilder.CreateCylinder('personBody', {
            diameter: 0.15,
            height: 0.3
        }, this.scene);
        body.parent = person;
        body.position.y = 0.25;

        const bodyMat = new BABYLON.StandardMaterial('personBodyMat', this.scene);
        bodyMat.diffuseColor = new BABYLON.Color3(
            0.3 + Math.random() * 0.4,
            0.3 + Math.random() * 0.4,
            0.3 + Math.random() * 0.4
        );
        body.material = bodyMat;

        // Голова
        const head = BABYLON.MeshBuilder.CreateSphere('personHead', {
            diameter: 0.12
        }, this.scene);
        head.parent = person;
        head.position.y = 0.46;

        const headMat = new BABYLON.StandardMaterial('personHeadMat', this.scene);
        headMat.diffuseColor = new BABYLON.Color3(0.9, 0.7, 0.6);
        head.material = headMat;

        // Начальная позиция на дороге (по центру)
        // Фильтруем только РЕАЛЬНЫЕ дороги внутри поля
        const roadArray = Array.from(this.gridSystem.roads).filter(road => {
            const [x, y] = road.split(',').map(Number);
            return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
        });
        const randomRoad = roadArray[Math.floor(Math.random() * roadArray.length)];
        const [rx, ry] = randomRoad.split(',').map(Number);

        // Люди теперь ходят по центру дороги
        person.position.x = rx * this.CELL_SIZE + this.CELL_SIZE / 2;
        person.position.z = ry * this.CELL_SIZE + this.CELL_SIZE / 2;
        person.position.y = 0.05;

        // Направление и скорость
        person.metadata = {
            currentRoadX: rx,
            currentRoadY: ry,
            targetRoadX: null,
            targetRoadY: null,
            targetX: null,
            targetZ: null,
            speed: 0.01 + Math.random() * 0.01
        };

        this.shadowGenerator.addShadowCaster(body);
        this.shadowGenerator.addShadowCaster(head);

        this.people.push(person);
    }

    animateObjects() {
        this.scene.onBeforeRenderObservable.add(() => {
            // Анимация машинок (ездят строго по линиям дорог)
            this.cars.forEach(car => {
                const isCustomModel = car.metadata.isCustomModel;
                
                if (!car.metadata.targetX || !car.metadata.targetZ) {
                    const currentX = car.metadata.currentRoadX;
                    const currentY = car.metadata.currentRoadY;

                    // Проверяем, на какой дороге мы находимся
                    const isOnHorizontalRoad = this.gridSystem.roadLines.horizontal.includes(currentY);
                    const isOnVerticalRoad = this.gridSystem.roadLines.vertical.includes(currentX);
                    const isOnIntersection = isOnHorizontalRoad && isOnVerticalRoad;

                    // Выбираем следующую точку
                    if (isOnIntersection) {
                        // На перекрестке - можем поехать в любом направлении
                        const directions = [];

                        // Вправо (следующая вертикальная дорога)
                        const nextRight = this.gridSystem.roadLines.vertical.find(x => x > currentX);
                        if (nextRight !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_RIGHT : Math.PI / 2;
                            directions.push({ x: nextRight, y: currentY, axis: 'horizontal', rotation: targetRotation });
                        }

                        // Влево (предыдущая вертикальная дорога)
                        const nextLeft = [...this.gridSystem.roadLines.vertical].reverse().find(x => x < currentX);
                        if (nextLeft !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_LEFT : -Math.PI / 2;
                            directions.push({ x: nextLeft, y: currentY, axis: 'horizontal', rotation: targetRotation });
                        }

                        // Вверх (следующая горизонтальная дорога)
                        const nextUp = [...this.gridSystem.roadLines.horizontal].reverse().find(y => y < currentY);
                        if (nextUp !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_UP : Math.PI;
                            directions.push({ x: currentX, y: nextUp, axis: 'vertical', rotation: targetRotation });
                        }

                        // Вниз (следующая горизонтальная дорога)
                        const nextDown = this.gridSystem.roadLines.horizontal.find(y => y > currentY);
                        if (nextDown !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_DOWN : 0;
                            directions.push({ x: currentX, y: nextDown, axis: 'vertical', rotation: targetRotation });
                        }

                        if (directions.length > 0) {
                            const next = directions[Math.floor(Math.random() * directions.length)];
                            car.metadata.targetRoadX = next.x;
                            car.metadata.targetRoadY = next.y;
                            car.metadata.movingAxis = next.axis;
                            car.metadata.targetRotation = next.rotation;
                            
                            // Логируем направление движения
                            const directionName = 
                                next.rotation === CAR_ROTATION_RIGHT ? 'EAST(E)' :
                                next.rotation === CAR_ROTATION_LEFT ? 'WEST(W)' :
                                next.rotation === CAR_ROTATION_UP ? 'NORTH(N)' :
                                next.rotation === CAR_ROTATION_DOWN ? 'SOUTH(S)' : 'UNKNOWN';
                            console.log(`🚗 Car choosing direction: ${directionName}, rotation: ${(next.rotation * 180 / Math.PI).toFixed(0)}°`);
                        }
                    } else if (isOnHorizontalRoad) {
                        // На горизонтальной дороге - двигаемся до следующего перекрестка
                        const nextRight = this.gridSystem.roadLines.vertical.find(x => x > currentX);
                        const nextLeft = [...this.gridSystem.roadLines.vertical].reverse().find(x => x < currentX);

                        const options = [];
                        if (nextRight !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_RIGHT : Math.PI / 2;
                            options.push({ x: nextRight, y: currentY, rotation: targetRotation });
                        }
                        if (nextLeft !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_LEFT : -Math.PI / 2;
                            options.push({ x: nextLeft, y: currentY, rotation: targetRotation });
                        }

                        if (options.length > 0) {
                            const next = options[Math.floor(Math.random() * options.length)];
                            car.metadata.targetRoadX = next.x;
                            car.metadata.targetRoadY = next.y;
                            car.metadata.movingAxis = 'horizontal';
                            car.metadata.targetRotation = next.rotation;
                        }
                    } else if (isOnVerticalRoad) {
                        // На вертикальной дороге - двигаемся до следующего перекрестка
                        const nextUp = [...this.gridSystem.roadLines.horizontal].reverse().find(y => y < currentY);
                        const nextDown = this.gridSystem.roadLines.horizontal.find(y => y > currentY);

                        const options = [];
                        if (nextUp !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_UP : Math.PI;
                            options.push({ x: currentX, y: nextUp, rotation: targetRotation });
                        }
                        if (nextDown !== undefined) {
                            const targetRotation = isCustomModel ? CAR_ROTATION_DOWN : 0;
                            options.push({ x: currentX, y: nextDown, rotation: targetRotation });
                        }

                        if (options.length > 0) {
                            const next = options[Math.floor(Math.random() * options.length)];
                            car.metadata.targetRoadX = next.x;
                            car.metadata.targetRoadY = next.y;
                            car.metadata.movingAxis = 'vertical';
                            car.metadata.targetRotation = next.rotation;
                        }
                    }

                    // Устанавливаем целевые координаты
                    if (car.metadata.targetRoadX !== null) {
                        car.metadata.targetX = car.metadata.targetRoadX * this.CELL_SIZE + this.CELL_SIZE / 2;
                        car.metadata.targetZ = car.metadata.targetRoadY * this.CELL_SIZE + this.CELL_SIZE / 2;
                    }
                }

                // Плавный поворот к целевому углу (всегда работает)
                if (car.metadata.targetRotation !== undefined) {
                    const currentRotation = car.rotation.y;
                    const targetRotation = car.metadata.targetRotation;
                    
                    // Вычисляем кратчайший путь поворота
                    let rotationDiff = targetRotation - currentRotation;
                    
                    // Нормализуем разницу в диапазон [-π, π]
                    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
                    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
                    
                    // Плавный поворот (20% от разницы каждый кадр для более быстрого поворота)
                    if (Math.abs(rotationDiff) > 0.01) {
                        car.rotation.y += rotationDiff * 0.2;
                        
                        // Для отладки - показываем поворот раз в 60 кадров
                        if (!car.metadata.rotationLogCounter) car.metadata.rotationLogCounter = 0;
                        car.metadata.rotationLogCounter++;
                        if (car.metadata.rotationLogCounter > 60) {
                            const directionName = 
                                Math.abs(targetRotation - CAR_ROTATION_RIGHT) < 0.1 ? 'EAST(E)' :
                                Math.abs(targetRotation - CAR_ROTATION_LEFT) < 0.1 ? 'WEST(W)' :
                                Math.abs(targetRotation - CAR_ROTATION_UP) < 0.1 ? 'NORTH(N)' :
                                Math.abs(targetRotation - CAR_ROTATION_DOWN) < 0.1 ? 'SOUTH(S)' : 'OTHER';
                            console.log(`🔄 Car rotating to ${directionName}: current=${(currentRotation * 180 / Math.PI).toFixed(0)}°, target=${(targetRotation * 180 / Math.PI).toFixed(0)}°, diff=${(rotationDiff * 180 / Math.PI).toFixed(0)}°`);
                            car.metadata.rotationLogCounter = 0;
                        }
                    } else {
                        car.rotation.y = targetRotation;
                        if (!car.metadata.rotationCompleted) {
                            console.log(`✅ Car rotation completed to ${(targetRotation * 180 / Math.PI).toFixed(0)}°`);
                            car.metadata.rotationCompleted = true;
                        }
                    }
                } else {
                    car.metadata.rotationCompleted = false;
                }
                
                // Движение к цели СТРОГО по оси
                if (car.metadata.targetX !== null && car.metadata.targetZ !== null) {
                    
                    if (car.metadata.movingAxis === 'horizontal') {
                        // Двигаемся только по X, Z фиксирован
                        const targetZ = car.metadata.currentRoadY * this.CELL_SIZE + this.CELL_SIZE / 2;
                        car.position.z = targetZ;

                        const dx = car.metadata.targetX - car.position.x;
                        if (Math.abs(dx) < 0.1) {
                            car.metadata.currentRoadX = car.metadata.targetRoadX;
                            car.metadata.currentRoadY = car.metadata.targetRoadY;
                            car.metadata.targetX = null;
                            car.metadata.targetZ = null;
                        } else {
                            car.position.x += Math.sign(dx) * car.metadata.speed;
                        }
                    } else if (car.metadata.movingAxis === 'vertical') {
                        // Двигаемся только по Z, X фиксирован
                        const targetX = car.metadata.currentRoadX * this.CELL_SIZE + this.CELL_SIZE / 2;
                        car.position.x = targetX;

                        const dz = car.metadata.targetZ - car.position.z;
                        if (Math.abs(dz) < 0.1) {
                            car.metadata.currentRoadX = car.metadata.targetRoadX;
                            car.metadata.currentRoadY = car.metadata.targetRoadY;
                            car.metadata.targetX = null;
                            car.metadata.targetZ = null;
                        } else {
                            car.position.z += Math.sign(dz) * car.metadata.speed;
                        }
                    }
                }
            });

            // Анимация людей (ходят только по дорогам)
            this.people.forEach(person => {
                if (!person.metadata.targetX || !person.metadata.targetZ) {
                    // Выбираем соседнюю дорогу (проверяем все 4 направления)
                    const currentX = person.metadata.currentRoadX;
                    const currentY = person.metadata.currentRoadY;

                    // Находим ВСЕ соседние дороги (шаг 1 клетка в каждом направлении)
                    const neighbors = [];
                    const directions = [
                        { dx: 1, dy: 0 },   // вправо
                        { dx: -1, dy: 0 },  // влево
                        { dx: 0, dy: 1 },   // вниз
                        { dx: 0, dy: -1 }   // вверх
                    ];

                    directions.forEach(dir => {
                        const nx = currentX + dir.dx;
                        const ny = currentY + dir.dy;
                        // Проверяем границы (включая виртуальные дороги -1 и GRID_SIZE)
                        if (nx >= -1 && nx <= this.GRID_SIZE && ny >= -1 && ny <= this.GRID_SIZE) {
                            // ВАЖНО: проверяем что соседняя клетка - дорога
                            if (this.gridSystem.roads.has(`${nx},${ny}`)) {
                                neighbors.push({ x: nx, y: ny });
                            }
                        }
                    });

                    if (neighbors.length > 0) {
                        // Выбираем случайную соседнюю дорогу
                        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                        person.metadata.targetRoadX = next.x;
                        person.metadata.targetRoadY = next.y;

                        // Люди ходят по центру дороги
                        person.metadata.targetX = next.x * this.CELL_SIZE + this.CELL_SIZE / 2;
                        person.metadata.targetZ = next.y * this.CELL_SIZE + this.CELL_SIZE / 2;
                    }
                }

                // Движение к цели
                const dx = person.metadata.targetX - person.position.x;
                const dz = person.metadata.targetZ - person.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);

                if (distance < 0.1) {
                    // Достигли цели, переключаемся на новую дорогу
                    person.metadata.currentRoadX = person.metadata.targetRoadX;
                    person.metadata.currentRoadY = person.metadata.targetRoadY;
                    person.metadata.targetX = null;
                    person.metadata.targetZ = null;
                } else {
                    // Движемся
                    person.position.x += (dx / distance) * person.metadata.speed;
                    person.position.z += (dz / distance) * person.metadata.speed;

                    // Поворачиваем человечка
                    person.rotation.y = Math.atan2(dx, dz);

                    // Покачивание при ходьбе
                    person.position.y = 0.05 + Math.abs(Math.sin(Date.now() * 0.01)) * 0.02;
                }
            });
        });
    }
    
    createHouseModel(x, z, height) {
        const house = new BABYLON.Mesh('house', this.scene);
        
        // Основа дома
        const base = BABYLON.MeshBuilder.CreateBox(
            'houseBase',
            { width: 1.8, height: height, depth: 1.8 },
            this.scene
        );
        base.position.y = height / 2;
        base.parent = house;
        
        const baseMat = new BABYLON.StandardMaterial('houseMat', this.scene);
        baseMat.diffuseColor = BuildingTypes.house.color;
        baseMat.specularColor = new BABYLON.Color3(0, 0, 0); // Без бликов
        baseMat.emissiveColor = BuildingTypes.house.emissive;
        base.material = baseMat;
        this.enableCartoonOutline(base);
        
        // Крыша
        const roof = BABYLON.MeshBuilder.CreateCylinder(
            'roof',
            { diameter: 2.4, height: 0.6, tessellation: 3 },
            this.scene
        );
        roof.rotation.z = Math.PI / 2;
        roof.position.y = height + 0.3;
        roof.parent = house;
        
        const roofMat = new BABYLON.StandardMaterial('roofMat', this.scene);
        roofMat.diffuseColor = new BABYLON.Color3(0.8, 0.2, 0.2); // Яркая красная крыша
        roofMat.specularColor = new BABYLON.Color3(0, 0, 0);
        roof.material = roofMat;
        this.enableCartoonOutline(roof);
        
        // Окна
        this.addWindowsToBuilding(house, { width: 1.8, height: height, depth: 1.8 });
        
        house.position = new BABYLON.Vector3(x, 0, z);
        return house;
    }
    
    createParkModel(x, z) {
        const park = new BABYLON.Mesh('park', this.scene);
        
        // Трава (низкая платформа)
        const grass = BABYLON.MeshBuilder.CreateGround(
            'grass',
            { width: 2, height: 2 },
            this.scene
        );
        grass.position.y = 0.05;
        grass.parent = park;
        
        const grassMat = new BABYLON.StandardMaterial('grassMat', this.scene);
        grassMat.diffuseColor = BuildingTypes.park.color;
        grassMat.emissiveColor = BuildingTypes.park.emissive;
        grass.material = grassMat;
        
        // Деревья
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 1.2;
            const offsetZ = (Math.random() - 0.5) * 1.2;
            
            // Ствол
            const trunk = BABYLON.MeshBuilder.CreateCylinder(
                `trunk${i}`,
                { diameter: 0.15, height: 1 },
                this.scene
            );
            trunk.position = new BABYLON.Vector3(offsetX, 0.5, offsetZ);
            trunk.parent = park;
            
            const trunkMat = new BABYLON.StandardMaterial(`trunkMat${i}`, this.scene);
            trunkMat.diffuseColor = new BABYLON.Color3(0.3, 0.2, 0.1);
            trunk.material = trunkMat;
            
            // Листва
            const foliage = BABYLON.MeshBuilder.CreateSphere(
                `foliage${i}`,
                { diameter: 0.8 },
                this.scene
            );
            foliage.position = new BABYLON.Vector3(offsetX, 1.2, offsetZ);
            foliage.parent = park;
            
            const foliageMat = new BABYLON.StandardMaterial(`foliageMat${i}`, this.scene);
            foliageMat.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.2);
            foliage.material = foliageMat;
        }
        
        park.position = new BABYLON.Vector3(x, 0, z);
        return park;
    }
    
    createCafeModel(x, z, height) {
        const cafe = new BABYLON.Mesh('cafe', this.scene);
        
        // Основа
        const base = BABYLON.MeshBuilder.CreateBox(
            'cafeBase',
            { width: 1.6, height: height, depth: 1.6 },
            this.scene
        );
        base.position.y = height / 2;
        base.parent = cafe;
        
        const baseMat = new BABYLON.StandardMaterial('cafeMat', this.scene);
        baseMat.diffuseColor = BuildingTypes.cafe.color;
        baseMat.emissiveColor = BuildingTypes.cafe.emissive;
        base.material = baseMat;
        
        // Навес
        const awning = BABYLON.MeshBuilder.CreateBox(
            'awning',
            { width: 2, height: 0.1, depth: 1 },
            this.scene
        );
        awning.position = new BABYLON.Vector3(0, height, 0.6);
        awning.parent = cafe;
        
        const awningMat = new BABYLON.StandardMaterial('awningMat', this.scene);
        awningMat.diffuseColor = new BABYLON.Color3(0.9, 0.3, 0.2);
        awning.material = awningMat;
        
        // Вывеска
        const sign = BABYLON.MeshBuilder.CreateBox(
            'sign',
            { width: 1.2, height: 0.4, depth: 0.1 },
            this.scene
        );
        sign.position = new BABYLON.Vector3(0, height * 0.7, 0.85);
        sign.parent = cafe;
        
        const signMat = new BABYLON.StandardMaterial('signMat', this.scene);
        signMat.emissiveColor = new BABYLON.Color3(1, 0.8, 0.4);
        sign.material = signMat;
        
        cafe.position = new BABYLON.Vector3(x, 0, z);
        return cafe;
    }
    
    createShopModel(x, z, height) {
        const shop = new BABYLON.Mesh('shop', this.scene);
        
        // Основа
        const base = BABYLON.MeshBuilder.CreateBox(
            'shopBase',
            { width: 1.8, height: height, depth: 1.8 },
            this.scene
        );
        base.position.y = height / 2;
        base.parent = shop;
        
        const baseMat = new BABYLON.StandardMaterial('shopMat', this.scene);
        baseMat.diffuseColor = BuildingTypes.shop.color;
        baseMat.emissiveColor = BuildingTypes.shop.emissive;
        base.material = baseMat;
        
        // Витрина
        const window = BABYLON.MeshBuilder.CreateBox(
            'shopWindow',
            { width: 1.4, height: 1, depth: 0.1 },
            this.scene
        );
        window.position = new BABYLON.Vector3(0, height * 0.4, 0.95);
        window.parent = shop;
        
        const windowMat = new BABYLON.StandardMaterial('shopWindowMat', this.scene);
        windowMat.diffuseColor = new BABYLON.Color3(0.8, 0.9, 1);
        windowMat.specularColor = new BABYLON.Color3(0.9, 0.9, 0.9);
        windowMat.alpha = 0.7;
        window.material = windowMat;
        
        shop.position = new BABYLON.Vector3(x, 0, z);
        return shop;
    }
    
    createDeliveryModel(x, z, height) {
        const delivery = new BABYLON.Mesh('delivery', this.scene);
        
        // Основа
        const base = BABYLON.MeshBuilder.CreateBox(
            'deliveryBase',
            { width: 1.8, height: height, depth: 1.8 },
            this.scene
        );
        base.position.y = height / 2;
        base.parent = delivery;
        
        const baseMat = new BABYLON.StandardMaterial('deliveryMat', this.scene);
        baseMat.diffuseColor = BuildingTypes.delivery.color;
        baseMat.emissiveColor = BuildingTypes.delivery.emissive;
        base.material = baseMat;
        
        // Логотип Самокат (зелёная полоса)
        const logo = BABYLON.MeshBuilder.CreateBox(
            'logo',
            { width: 1.6, height: 0.6, depth: 0.05 },
            this.scene
        );
        logo.position = new BABYLON.Vector3(0, height * 0.7, 0.92);
        logo.parent = delivery;
        
        const logoMat = new BABYLON.StandardMaterial('logoMat', this.scene);
        logoMat.emissiveColor = new BABYLON.Color3(0, 1, 0.5);
        logoMat.disableLighting = true;
        logo.material = logoMat;
        
        // Двери
        const door = BABYLON.MeshBuilder.CreateBox(
            'door',
            { width: 0.8, height: 1.2, depth: 0.05 },
            this.scene
        );
        door.position = new BABYLON.Vector3(0, height * 0.3, 0.92);
        door.parent = delivery;
        
        const doorMat = new BABYLON.StandardMaterial('doorMat', this.scene);
        doorMat.diffuseColor = new BABYLON.Color3(0, 0.5, 0.25);
        door.material = doorMat;
        
        delivery.position = new BABYLON.Vector3(x, 0, z);
        return delivery;
    }
    
    createWarehouseModel(x, z, height) {
        const warehouse = new BABYLON.Mesh('warehouse', this.scene);
        
        // Основа
        const base = BABYLON.MeshBuilder.CreateBox(
            'warehouseBase',
            { width: 2, height: height, depth: 2 },
            this.scene
        );
        base.position.y = height / 2;
        base.parent = warehouse;
        
        const baseMat = new BABYLON.StandardMaterial('warehouseMat', this.scene);
        baseMat.diffuseColor = BuildingTypes.warehouse.color;
        baseMat.emissiveColor = BuildingTypes.warehouse.emissive;
        base.material = baseMat;
        
        // Крыша
        const roof = BABYLON.MeshBuilder.CreateBox(
            'warehouseRoof',
            { width: 2.2, height: 0.3, depth: 2.2 },
            this.scene
        );
        roof.position.y = height;
        roof.parent = warehouse;
        
        const roofMat = new BABYLON.StandardMaterial('warehouseRoofMat', this.scene);
        roofMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        roof.material = roofMat;
        
        // Ворота
        const gate = BABYLON.MeshBuilder.CreateBox(
            'gate',
            { width: 1.5, height: 2, depth: 0.1 },
            this.scene
        );
        gate.position = new BABYLON.Vector3(0, 1, 1.05);
        gate.parent = warehouse;
        
        const gateMat = new BABYLON.StandardMaterial('gateMat', this.scene);
        gateMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        gate.material = gateMat;
        
        warehouse.position = new BABYLON.Vector3(x, 0, z);
        return warehouse;
    }
    
    createOfficeModel(x, z, height) {
        const office = new BABYLON.Mesh('office', this.scene);
        
        // Основа
        const base = BABYLON.MeshBuilder.CreateBox(
            'officeBase',
            { width: 1.6, height: height, depth: 1.6 },
            this.scene
        );
        base.position.y = height / 2;
        base.parent = office;
        
        const baseMat = new BABYLON.StandardMaterial('officeMat', this.scene);
        baseMat.diffuseColor = BuildingTypes.office.color;
        baseMat.emissiveColor = BuildingTypes.office.emissive;
        base.material = baseMat;
        
        // Окна (сетка)
        const windowsPerFloor = 3;
        const floors = Math.floor(height);
        
        for (let floor = 0; floor < floors; floor++) {
            for (let i = 0; i < windowsPerFloor; i++) {
                const window = BABYLON.MeshBuilder.CreateBox(
                    `officeWindow_${floor}_${i}`,
                    { width: 0.3, height: 0.3, depth: 0.05 },
                    this.scene
                );
                const offsetX = (i - 1) * 0.5;
                const offsetY = floor * (height / floors) + 0.5;
                window.position = new BABYLON.Vector3(offsetX, offsetY, 0.85);
                window.parent = office;
                
                const windowMat = new BABYLON.StandardMaterial(`officeWindowMat_${floor}_${i}`, this.scene);
                windowMat.emissiveColor = new BABYLON.Color3(0.7, 0.8, 1);
                window.material = windowMat;
            }
        }
        
        office.position = new BABYLON.Vector3(x, 0, z);
        return office;
    }
    
    createDefaultBuilding(x, z, height, type) {
        const building = BABYLON.MeshBuilder.CreateBox(
            'building',
            { width: 1.8, height: height, depth: 1.8 },
            this.scene
        );
        building.position = new BABYLON.Vector3(x, height / 2, z);
        
        const mat = new BABYLON.StandardMaterial('buildingMat', this.scene);
        mat.diffuseColor = type.color;
        mat.emissiveColor = type.emissive;
        building.material = mat;
        
        return building;
    }
    
    createPlacementParticles(gridX, gridY, type) {
        const cellSize = this.CELL_SIZE;
        const posX = gridX * cellSize + cellSize / 2;
        const posZ = gridY * cellSize + cellSize / 2;
        
        // Particle System
        const particleSystem = new BABYLON.ParticleSystem('particles', 200, this.scene);
        particleSystem.particleTexture = new BABYLON.Texture(
            'https://cdn.babylonjs.com/textures/flare.png',
            this.scene
        );
        
        particleSystem.emitter = new BABYLON.Vector3(posX, 0.5, posZ);
        particleSystem.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
        particleSystem.maxEmitBox = new BABYLON.Vector3(0.5, 0, 0.5);
        
        particleSystem.color1 = new BABYLON.Color4(
            type.color.r,
            type.color.g,
            type.color.b,
            1
        );
        particleSystem.color2 = new BABYLON.Color4(
            type.color.r * 0.8,
            type.color.g * 0.8,
            type.color.b * 0.8,
            0.5
        );
        particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
        
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 0.8;
        
        particleSystem.emitRate = 100;
        
        particleSystem.direction1 = new BABYLON.Vector3(-1, 2, -1);
        particleSystem.direction2 = new BABYLON.Vector3(1, 4, 1);
        
        particleSystem.minEmitPower = 2;
        particleSystem.maxEmitPower = 4;
        
        particleSystem.gravity = new BABYLON.Vector3(0, -5, 0);
        
        particleSystem.start();
        
        // Остановить через 0.5 секунды
        setTimeout(() => {
            particleSystem.stop();
            setTimeout(() => particleSystem.dispose(), 1000);
        }, 500);
    }
    
    recalculateScores() {
        let totalScore = 0;
        
        this.gridSystem.buildings.forEach(b => {
            const type = BuildingTypes[b.type];
            let score = 1; // Базовое очко
            
            const neighbors = this.gridSystem.getNeighbors(b.x, b.y);
            const nearby = this.gridSystem.getNearby(b.x, b.y, 2);
            
            // Логика подсчёта очков (из оригинальной игры)
            switch (b.type) {
                case 'house':
                    neighbors.forEach(n => {
                        if (n.type === 'park') score++;
                        if (n.type === 'warehouse') score--;
                    });
                    break;
                    
                case 'park':
                    neighbors.forEach(n => {
                        if (n.type === 'house') score++;
                        if (n.type === 'cafe') score++;
                    });
                    break;
                    
                case 'cafe':
                    neighbors.forEach(n => {
                        if (n.type === 'house') score++;
                        if (n.type === 'park') score += 2;
                    });
                    break;
                    
                case 'shop':
                    let housesNearby = nearby.filter(n => n.type === 'house').length;
                    score += housesNearby * 2;
                    let shopsNearby = nearby.filter(n => n.type === 'shop').length;
                    if (shopsNearby >= 3) score = Math.max(1, score - 2);
                    break;
                    
                case 'delivery':
                    let hasHouses = nearby.filter(n => n.type === 'house').length >= 3;
                    let hasShopOrCafe = nearby.some(n => n.type === 'shop' || n.type === 'cafe');
                    if (hasHouses && hasShopOrCafe) score += 3;
                    break;
                    
                case 'warehouse':
                    neighbors.forEach(n => {
                        if (n.type === 'shop' || n.type === 'delivery') score += 2;
                    });
                    break;
                    
                case 'office':
                    neighbors.forEach(n => {
                        if (n.type === 'cafe' || n.type === 'delivery') score++;
                    });
                    break;
            }
            
            b.score = score;
            totalScore += score;
            
            // Обновляем текст очков
            this.updateBuildingScoreText(b);
        });
        
        this.score = totalScore;
    }
    
    updateBuildingScoreText(building) {
        const score = building.score;
        const mesh = building.mesh;
        
        // Удаляем старый текст если есть
        if (building.scoreText) {
            building.scoreText.dispose();
        }
        
        // Создаём новый 3D текст (используем плоскость с текстурой)
        const plane = BABYLON.MeshBuilder.CreatePlane(
            `scoreText_${building.x}_${building.y}`,
            { width: 0.8, height: 0.8 },
            this.scene
        );
        
        const type = BuildingTypes[building.type];
        plane.position = new BABYLON.Vector3(
            mesh.position.x,
            type.height + 0.5,
            mesh.position.z
        );
        
        // Всегда смотрит на камеру
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        // Создаём динамическую текстуру для текста
        const textureResolution = 256;
        const dynamicTexture = new BABYLON.DynamicTexture(
            `scoreTexture_${building.x}_${building.y}`,
            textureResolution,
            this.scene,
            false
        );
        
        const ctx = dynamicTexture.getContext();
        const fontSize = 120;
        
        // Цвет фона в зависимости от очков
        let bgColor;
        if (score >= 5) bgColor = 'rgba(0, 200, 100, 0.9)'; // Зелёный
        else if (score >= 3) bgColor = 'rgba(255, 200, 0, 0.9)'; // Жёлтый
        else if (score >= 1) bgColor = 'rgba(100, 150, 255, 0.9)'; // Синий
        else bgColor = 'rgba(255, 100, 100, 0.9)'; // Красный
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, textureResolution, textureResolution);
        
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Добавляем черную обводку для читаемости
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.lineWidth = 4;
        ctx.strokeText(`+${score}`, textureResolution / 2, textureResolution / 2);
        ctx.fillText(`+${score}`, textureResolution / 2, textureResolution / 2);
        
        dynamicTexture.update();
        
        const mat = new BABYLON.StandardMaterial(
            `scoreMat_${building.x}_${building.y}`,
            this.scene
        );
        mat.diffuseTexture = dynamicTexture;
        mat.emissiveTexture = dynamicTexture; // Возвращаем для видимости
        mat.opacityTexture = dynamicTexture;
        mat.backFaceCulling = false;
        
        plane.material = mat;
        building.scoreText = plane;
        
        // Анимация масштаба
        BABYLON.Animation.CreateAndStartAnimation(
            'scoreScale',
            plane,
            'scaling',
            60,
            15,
            plane.scaling,
            new BABYLON.Vector3(1.2, 1.2, 1.2),
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
        );
        
        setTimeout(() => {
            BABYLON.Animation.CreateAndStartAnimation(
                'scoreScaleBack',
                plane,
                'scaling',
                60,
                15,
                new BABYLON.Vector3(1.2, 1.2, 1.2),
                new BABYLON.Vector3(1, 1, 1),
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        }, 250);
    }
    

    
    generateCards() {
        this.currentCards = [];
        const types = Object.keys(BuildingTypes);
        
        // Генерируем 3 УНИКАЛЬНЫЕ карточки с балансом
        const usedInCurrentBatch = new Set();
        let attempts = 0;
        const maxAttempts = 30;
        
        while (this.currentCards.length < 3 && attempts < maxAttempts) {
            attempts++;
            const selectedType = this.getBalancedBuildingType(types, usedInCurrentBatch);
            
            // Проверяем что карточка уникальна в текущем наборе
            if (!usedInCurrentBatch.has(selectedType)) {
                this.currentCards.push(selectedType);
                usedInCurrentBatch.add(selectedType);
                this.recentBuildings.push(selectedType);
            }
        }
        
        // Если не удалось сгенерировать 3 уникальные карточки (маловероятно)
        while (this.currentCards.length < 3) {
            const randomType = types[Math.floor(Math.random() * types.length)];
            if (!this.currentCards.includes(randomType)) {
            this.currentCards.push(randomType);
                this.recentBuildings.push(randomType);
            }
        }

        // Ограничиваем историю последними 20 зданиями (увеличено для лучшего баланса)
        if (this.recentBuildings.length > 20) {
            this.recentBuildings = this.recentBuildings.slice(-20);
        }

        console.log(`🎴 Generated cards: ${this.currentCards.join(', ')}`);
        this.renderCards();
    }

    getBalancedBuildingType(types, usedInCurrentBatch = new Set()) {
        // Подсчитываем частоту каждого типа в последних 20 зданиях
        const recentCount = {};
        types.forEach(type => recentCount[type] = 0);

        this.recentBuildings.forEach(type => {
            if (recentCount[type] !== undefined) {
                recentCount[type]++;
            }
        });

        // Подсчитываем построенные здания на поле
        const builtCount = {};
        types.forEach(type => builtCount[type] = 0);
        this.gridSystem.buildings.forEach(building => {
            if (builtCount[building.type] !== undefined) {
                builtCount[building.type]++;
            }
        });

        // Рассчитываем веса с учетом частоты, построенных зданий и разнообразия
        const weights = {};
        const totalRecent = this.recentBuildings.length || 1;
        const totalBuilt = this.gridSystem.buildings.length || 1;

        types.forEach(type => {
            const recentFrequency = recentCount[type] / totalRecent;
            const builtFrequency = builtCount[type] / totalBuilt;

            // Базовый вес (больше для недопредставленных типов)
            let weight = 1.0;
            
            // Штраф за частоту в недавних картах
            weight *= (1 - recentFrequency * 0.6);
            
            // Штраф за частоту построенных зданий
            weight *= (1 - builtFrequency * 0.4);

            // СИЛЬНЫЙ штраф если тип уже в текущем наборе карточек
            if (usedInCurrentBatch.has(type)) {
                weight *= 0.05;
            }

            // СИЛЬНЫЙ штраф за последовательные повторы
            if (this.recentBuildings.length > 0 &&
                type === this.recentBuildings[this.recentBuildings.length - 1]) {
                weight *= 0.1;
            }

            // Штраф за появление в последних 5 картах
            const inLastFive = this.recentBuildings.slice(-5).filter(t => t === type).length;
            weight *= Math.pow(0.6, inLastFive);

            // БОНУС для редких типов
            if (recentFrequency < 0.15 && builtFrequency < 0.15) {
                weight *= 2.0;
            }

            weights[type] = Math.max(0.01, weight);
        });

        // Нормализуем веса
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        // Выбираем тип
        for (let type of types) {
            random -= weights[type];
            if (random <= 0) {
                return type;
            }
        }

        return types[0];
    }

    renderCards() {
        // В React версии карточки рендерятся через React компонент, не через DOM
        // Этот метод оставлен для совместимости, но ничего не делает
        console.log('renderCards called (no-op in React version)');
    }


    
    updateUI() {
        // В React версии UI обновляется через state, не через DOM
        // Обновляем только highScore в localStorage
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highscore-3d', this.highScore);
        }
        console.log('updateUI called - score:', this.score, 'moves:', this.moves);
    }
    
    async endGame() {
        // Сохраняем результат в базу данных
        const missionsCompleted = this.missionSystem.completedMissions.size;

        // Сохранение в БД обрабатывается в React компоненте через callback
        
        setTimeout(() => {
            const userName = 'Игрок'; // Имя пользователя передается через props в React
            
            const message = `
🎉 Игра завершена! 🎉

${userName}
Ваш счёт: ${this.score}
Рекорд: ${this.highScore}
Ходов: ${this.moves}
Миссий выполнено: ${missionsCompleted}/3

${this.score >= this.highScore ? '🏆 НОВЫЙ РЕКОРД!' : ''}
            `.trim();
            
            alert(message);
            
            if (confirm('Начать новую игру?')) {
                window.location.reload();
            }
        }, 500);
    }
    enableCartoonOutline(mesh, color = new BABYLON.Color3(0, 0, 0), width = 2.0) {
        mesh.enableEdgesRendering();
        mesh.edgesWidth = width;
        mesh.edgesColor = new BABYLON.Color4(color.r, color.g, color.b, 1);
    }
}

// Экспорт для использования в React
export { Game3D, BuildingTypes, MissionTemplates };

