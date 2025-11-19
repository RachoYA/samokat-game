// ===========================
// 3D МИКРОРАЙОН - BABYLON.JS
// ===========================

// Типы зданий с 3D параметрами
const BuildingTypes = {
    house: {
        id: 'house',
        name: 'Дом',
        icon: '🏠',
        desc: '+1 за парк, -1 за склад',
        color: new BABYLON.Color3(0.9, 0.7, 0.4), // Бежевый
        emissive: new BABYLON.Color3(0.2, 0.15, 0.1),
        height: 3
    },
    park: {
        id: 'park',
        name: 'Парк',
        icon: '🌳',
        desc: '+1 за дом, +1 за кафе',
        color: new BABYLON.Color3(0.2, 0.8, 0.3), // Зелёный
        emissive: new BABYLON.Color3(0.05, 0.2, 0.08),
        height: 0.5
    },
    cafe: {
        id: 'cafe',
        name: 'Кафе',
        icon: '☕',
        desc: '+1 за дом, +2 за парк',
        color: new BABYLON.Color3(0.8, 0.4, 0.2), // Коричневый
        emissive: new BABYLON.Color3(0.3, 0.15, 0.05),
        height: 2
    },
    shop: {
        id: 'shop',
        name: 'Магазин',
        icon: '🛒',
        desc: '+2 за 3+ домов рядом',
        color: new BABYLON.Color3(0.3, 0.5, 0.9), // Синий
        emissive: new BABYLON.Color3(0.1, 0.15, 0.3),
        height: 2.5
    },
    delivery: {
        id: 'delivery',
        name: 'Доставка',
        icon: '📦',
        desc: '+3 за 3 дома + магазин',
        color: new BABYLON.Color3(0, 0.84, 0.39), // Самокат зелёный
        emissive: new BABYLON.Color3(0, 0.3, 0.15),
        height: 2,
        glow: true
    },
    warehouse: {
        id: 'warehouse',
        name: 'Склад',
        icon: '🏭',
        desc: '+2 за магазины, -1 домам',
        color: new BABYLON.Color3(0.5, 0.5, 0.5), // Серый
        emissive: new BABYLON.Color3(0.1, 0.1, 0.1),
        height: 3.5
    },
    office: {
        id: 'office',
        name: 'Офис',
        icon: '🏢',
        desc: '+1 за кафе и доставку',
        color: new BABYLON.Color3(0.4, 0.25, 0.6), // Фиолетовый
        emissive: new BABYLON.Color3(0.15, 0.1, 0.2),
        height: 4
    }
};

// Миссии
const MissionTemplates = [
    {
        id: 'houses_5',
        desc: 'Постройте 5 домов',
        check: (game) => game.countBuildingType('house') >= 5,
        reward: 50
    },
    {
        id: 'park_cluster',
        desc: 'Создайте парковую зону (3 парка рядом)',
        check: (game) => game.checkParkCluster(),
        reward: 75
    },
    {
        id: 'delivery_center',
        desc: 'Постройте центр доставки (Доставка + 3 дома + магазин рядом)',
        check: (game) => game.checkDeliveryCenter(),
        reward: 100
    },
    {
        id: 'cafe_combo',
        desc: 'Кафе окружённое 2 домами и парком',
        check: (game) => game.checkCafeCombo(),
        reward: 80
    },
    {
        id: 'office_hub',
        desc: 'Бизнес-центр: Офис + Кафе + Доставка рядом',
        check: (game) => game.checkOfficeHub(),
        reward: 90
    },
    {
        id: 'warehouse_logistics',
        desc: 'Логистический центр: Склад + 2 магазина рядом',
        check: (game) => game.checkWarehouseLogistics(),
        reward: 70
    },
    {
        id: 'shops_4',
        desc: 'Постройте 4 магазина',
        check: (game) => game.countBuildingType('shop') >= 4,
        reward: 60
    }
];

// Основной класс игры
class Game3D {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.engine = new BABYLON.Engine(this.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true
        });
        
        this.GRID_SIZE = 8;
        this.CELL_SIZE = 2.5;
        
        this.grid = [];
        this.buildings = [];
        this.score = 0;
        this.moves = 0;
        this.highScore = localStorage.getItem('highscore-3d') || 0;
        
        this.currentCards = [];
        this.selectedCard = null;
        
        this.missions = [];
        this.completedMissions = new Set();
        
        this.scene = null;
        this.camera = null;
        
        this.init();
    }
    
    init() {
        // Инициализация сетки
        for (let y = 0; y < this.GRID_SIZE; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.GRID_SIZE; x++) {
                this.grid[y][x] = null;
            }
        }
        
        // Создание сцены
        this.createScene();
        
        // Генерация миссий и карт
        this.generateMissions();
        this.generateCards();
        
        // Запуск рендера
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
        
        // Resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });
    }
    
    createScene() {
        this.scene = new BABYLON.Scene(this.engine);
        // Светлый небесный фон
        this.scene.clearColor = new BABYLON.Color4(0.89, 0.96, 1, 1); // #E3F5FF
        
        // Легкий туман для атмосферы
        this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
        this.scene.fogDensity = 0.005;
        this.scene.fogColor = new BABYLON.Color3(0.95, 0.98, 1);
        
        // Камера
        const gridCenter = (this.GRID_SIZE * this.CELL_SIZE) / 2;
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            -Math.PI / 4,
            Math.PI / 3,
            30,
            new BABYLON.Vector3(gridCenter, 0, gridCenter),
            this.scene
        );
        this.camera.attachControl(this.canvas, true);
        this.camera.lowerRadiusLimit = 15;
        this.camera.upperRadiusLimit = 50;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI / 2.2;
        
        // Освещение
        // 1. Направленный свет (солнце)
        const sunLight = new BABYLON.DirectionalLight(
            'sunLight',
            new BABYLON.Vector3(-1, -2, -1),
            this.scene
        );
        sunLight.position = new BABYLON.Vector3(20, 40, 20);
        sunLight.intensity = 1.2;
        
        // Тени
        const shadowGenerator = new BABYLON.ShadowGenerator(2048, sunLight);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.blurKernel = 32;
        shadowGenerator.darkness = 0.3;
        this.shadowGenerator = shadowGenerator;
        
        // 2. Ambient light (яркий дневной свет)
        const ambient = new BABYLON.HemisphericLight(
            'ambient',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.9;
        ambient.diffuse = new BABYLON.Color3(1, 1, 0.98);
        ambient.groundColor = new BABYLON.Color3(0.85, 0.92, 0.95);
        
        // 3. Подсветка Самокат (зелёная)
        const samokatLight = new BABYLON.PointLight(
            'samokatLight',
            new BABYLON.Vector3(gridCenter, 5, gridCenter),
            this.scene
        );
        samokatLight.intensity = 0.3;
        samokatLight.diffuse = new BABYLON.Color3(0, 0.84, 0.39);
        
        // Создание окружения
        this.createEnvironment();
        
        // Создание сетки игрового поля
        this.createGameGrid();
        
        // Glow Layer для эффектов свечения
        this.glowLayer = new BABYLON.GlowLayer('glow', this.scene);
        this.glowLayer.intensity = 0.5;
        
        // Post-processing
        const pipeline = new BABYLON.DefaultRenderingPipeline(
            'default',
            true,
            this.scene,
            [this.camera]
        );
        pipeline.fxaaEnabled = true;
        pipeline.imageProcessingEnabled = true;
        pipeline.imageProcessing.contrast = 1.2;
        pipeline.imageProcessing.exposure = 1.1;
        
        // Bloom эффект
        pipeline.bloomEnabled = true;
        pipeline.bloomThreshold = 0.8;
        pipeline.bloomWeight = 0.3;
        pipeline.bloomKernel = 64;
    }
    
    createEnvironment() {
        const gridCenter = (this.GRID_SIZE * this.CELL_SIZE) / 2;
        
        // Земля
        const ground = BABYLON.MeshBuilder.CreateGround(
            'ground',
            { width: 100, height: 100 },
            this.scene
        );
        ground.position.y = -0.1;
        
        const groundMat = new BABYLON.StandardMaterial('groundMat', this.scene);
        // Светлая зеленая трава
        groundMat.diffuseColor = new BABYLON.Color3(0.7, 0.85, 0.7);
        groundMat.specularColor = new BABYLON.Color3(0.3, 0.4, 0.3);
        ground.material = groundMat;
        ground.receiveShadows = true;
        
        // Городской фон - дальние здания
        this.createCityBackground();
        
        // Дороги вокруг игрового поля
        this.createRoads();
        
        // Декоративные элементы
        this.createDecorations();
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
        const roadWidth = 3;
        
        // Дорога вокруг игрового поля (светлая)
        const roadMat = new BABYLON.StandardMaterial('roadMat', this.scene);
        roadMat.diffuseColor = new BABYLON.Color3(0.75, 0.75, 0.75);
        roadMat.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        
        // Север
        const roadN = BABYLON.MeshBuilder.CreateGround(
            'roadN',
            { width: gridSize + roadWidth * 2, height: roadWidth },
            this.scene
        );
        roadN.position = new BABYLON.Vector3(gridSize / 2, 0.01, -roadWidth / 2);
        roadN.material = roadMat;
        
        // Юг
        const roadS = BABYLON.MeshBuilder.CreateGround(
            'roadS',
            { width: gridSize + roadWidth * 2, height: roadWidth },
            this.scene
        );
        roadS.position = new BABYLON.Vector3(gridSize / 2, 0.01, gridSize + roadWidth / 2);
        roadS.material = roadMat;
        
        // Запад
        const roadW = BABYLON.MeshBuilder.CreateGround(
            'roadW',
            { width: roadWidth, height: gridSize },
            this.scene
        );
        roadW.position = new BABYLON.Vector3(-roadWidth / 2, 0.01, gridSize / 2);
        roadW.material = roadMat;
        
        // Восток
        const roadE = BABYLON.MeshBuilder.CreateGround(
            'roadE',
            { width: roadWidth, height: gridSize },
            this.scene
        );
        roadE.position = new BABYLON.Vector3(gridSize + roadWidth / 2, 0.01, gridSize / 2);
        roadE.material = roadMat;
    }
    
    createDecorations() {
        // Деревья по углам
        const corners = [
            { x: -4, z: -4 },
            { x: -4, z: this.GRID_SIZE * this.CELL_SIZE + 4 },
            { x: this.GRID_SIZE * this.CELL_SIZE + 4, z: -4 },
            { x: this.GRID_SIZE * this.CELL_SIZE + 4, z: this.GRID_SIZE * this.CELL_SIZE + 4 }
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
    
    createGameGrid() {
        // Создаём визуальную сетку игрового поля
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                this.createGridCell(x, y);
            }
        }
    }
    
    createGridCell(x, y) {
        const cellSize = this.CELL_SIZE;
        const posX = x * cellSize + cellSize / 2;
        const posZ = y * cellSize + cellSize / 2;
        
        // Основа клетки (прозрачная)
        const cell = BABYLON.MeshBuilder.CreateGround(
            `cell_${x}_${y}`,
            { width: cellSize - 0.1, height: cellSize - 0.1 },
            this.scene
        );
        cell.position = new BABYLON.Vector3(posX, 0.02, posZ);
        
        const cellMat = new BABYLON.StandardMaterial(`cellMat_${x}_${y}`, this.scene);
        cellMat.diffuseColor = new BABYLON.Color3(0, 0.84, 0.39);
        cellMat.alpha = 0.2;
        cellMat.specularColor = new BABYLON.Color3(0.2, 0.5, 0.3);
        cell.material = cellMat;
        
        // Рамка клетки
        const border = BABYLON.MeshBuilder.CreateGround(
            `border_${x}_${y}`,
            { width: cellSize, height: cellSize },
            this.scene
        );
        border.position = new BABYLON.Vector3(posX, 0.01, posZ);
        
        const borderMat = new BABYLON.StandardMaterial(`borderMat_${x}_${y}`, this.scene);
        borderMat.diffuseColor = new BABYLON.Color3(0, 0.5, 0.25);
        borderMat.alpha = 0.4;
        borderMat.wireframe = true;
        border.material = borderMat;
        
        // Интерактивность
        cell.actionManager = new BABYLON.ActionManager(this.scene);
        
        // Hover эффект
        cell.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOverTrigger,
                () => {
                    if (!this.grid[y][x] && this.selectedCard) {
                        cellMat.alpha = 0.5;
                        cellMat.emissiveColor = new BABYLON.Color3(0, 0.3, 0.15);
                    }
                }
            )
        );
        
        cell.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPointerOutTrigger,
                () => {
                    if (!this.grid[y][x]) {
                        cellMat.alpha = 0.2;
                        cellMat.emissiveColor = new BABYLON.Color3(0, 0, 0);
                    }
                }
            )
        );
        
        // Клик
        cell.actionManager.registerAction(
            new BABYLON.ExecuteCodeAction(
                BABYLON.ActionManager.OnPickTrigger,
                () => {
                    this.onCellClick(x, y);
                }
            )
        );
        
        cell.receiveShadows = true;
    }
    
    onCellClick(x, y) {
        if (!this.selectedCard || this.grid[y][x]) return;
        
        const type = BuildingTypes[this.selectedCard];
        
        // Создаём 3D здание
        const building = this.create3DBuilding(type, x, y);
        
        // Сохраняем в сетке
        const buildingData = {
            type: this.selectedCard,
            x,
            y,
            mesh: building,
            scoreText: null
        };
        this.grid[y][x] = buildingData;
        this.buildings.push(buildingData);
        
        // Particle эффект
        this.createPlacementParticles(x, y, type);
        
        // Обновляем игру
        this.moves++;
        this.recalculateScores();
        this.updateUI();
        
        // Проверка миссий
        this.checkMissions();
        
        // Новые карты
        this.selectedCard = null;
        this.generateCards();
        
        // Проверка конца игры
        if (this.moves >= this.GRID_SIZE * this.GRID_SIZE) {
            this.endGame();
        }
    }
    
    create3DBuilding(type, gridX, gridY) {
        const cellSize = this.CELL_SIZE;
        const posX = gridX * cellSize + cellSize / 2;
        const posZ = gridY * cellSize + cellSize / 2;
        const height = type.height;
        
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
        
        // Если здание светится
        if (type.glow) {
            this.glowLayer.addIncludedOnlyMesh(building);
        }
        
        return building;
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
        baseMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        baseMat.emissiveColor = BuildingTypes.house.emissive;
        base.material = baseMat;
        
        // Крыша
        const roof = BABYLON.MeshBuilder.CreateCylinder(
            'roof',
            { diameterTop: 0, diameterBottom: 2.5, height: 1.2, tessellation: 4 },
            this.scene
        );
        roof.position.y = height + 0.6;
        roof.rotation.y = Math.PI / 4;
        roof.parent = house;
        
        const roofMat = new BABYLON.StandardMaterial('roofMat', this.scene);
        roofMat.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0.2);
        roof.material = roofMat;
        
        // Окна
        for (let i = 0; i < 4; i++) {
            const window = BABYLON.MeshBuilder.CreateBox(
                `window${i}`,
                { width: 0.3, height: 0.4, depth: 0.05 },
                this.scene
            );
            const angle = (i * Math.PI / 2);
            const radius = 0.95;
            window.position.x = Math.sin(angle) * radius;
            window.position.z = Math.cos(angle) * radius;
            window.position.y = height * 0.6;
            window.parent = house;
            
            const windowMat = new BABYLON.StandardMaterial(`windowMat${i}`, this.scene);
            windowMat.emissiveColor = new BABYLON.Color3(1, 0.9, 0.6);
            window.material = windowMat;
        }
        
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
        
        this.buildings.forEach(b => {
            const type = BuildingTypes[b.type];
            let score = 1; // Базовое очко
            
            const neighbors = this.getNeighbors(b.x, b.y);
            const nearby = this.getNearby(b.x, b.y, 2);
            
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
        ctx.fillText(`+${score}`, textureResolution / 2, textureResolution / 2);
        
        dynamicTexture.update();
        
        const mat = new BABYLON.StandardMaterial(
            `scoreMat_${building.x}_${building.y}`,
            this.scene
        );
        mat.diffuseTexture = dynamicTexture;
        mat.emissiveTexture = dynamicTexture;
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
    
    generateCards() {
        this.currentCards = [];
        const types = Object.keys(BuildingTypes);
        
        for (let i = 0; i < 3; i++) {
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.currentCards.push(randomType);
        }
        
        this.renderCards();
    }
    
    renderCards() {
        const container = document.getElementById('cards-container');
        container.innerHTML = '';
        
        this.currentCards.forEach((typeId, index) => {
            const type = BuildingTypes[typeId];
            
            const card = document.createElement('div');
            card.className = 'building-card';
            if (this.selectedCard === typeId) {
                card.classList.add('selected');
            }
            
            card.innerHTML = `
                <div class="card-icon">${type.icon}</div>
                <div class="card-name">${type.name}</div>
                <div class="card-desc">${type.desc}</div>
            `;
            
            card.addEventListener('click', () => {
                this.selectedCard = typeId;
                this.renderCards();
            });
            
            container.appendChild(card);
        });
    }
    
    generateMissions() {
        this.missions = [];
        const shuffled = [...MissionTemplates].sort(() => Math.random() - 0.5);
        this.missions = shuffled.slice(0, 3);
        this.renderMissions();
    }
    
    renderMissions() {
        const container = document.getElementById('missions-list');
        container.innerHTML = '';
        
        this.missions.forEach(mission => {
            const isCompleted = this.completedMissions.has(mission.id);
            
            const item = document.createElement('div');
            item.className = 'mission-item';
            if (isCompleted) {
                item.classList.add('completed');
            }
            
            item.innerHTML = `
                <div class="mission-desc">${isCompleted ? '✅' : '⬜'} ${mission.desc}</div>
                <div class="mission-progress">
                    <span class="mission-reward">+${mission.reward} 💎</span>
                    <span>${isCompleted ? 'Выполнено!' : 'В процессе...'}</span>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    checkMissions() {
        let anyCompleted = false;
        
        this.missions.forEach(mission => {
            if (!this.completedMissions.has(mission.id) && mission.check(this)) {
                this.completedMissions.add(mission.id);
                this.score += mission.reward;
                anyCompleted = true;
                
                console.log(`Mission completed: ${mission.desc}`);
            }
        });
        
        if (anyCompleted) {
            this.renderMissions();
            this.updateUI();
        }
    }
    
    // Mission check helpers
    countBuildingType(type) {
        return this.buildings.filter(b => b.type === type).length;
    }
    
    checkParkCluster() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] && this.grid[y][x].type === 'park') {
                    const neighbors = this.getNeighbors(x, y);
                    const parkNeighbors = neighbors.filter(n => n.type === 'park').length;
                    if (parkNeighbors >= 2) return true;
                }
            }
        }
        return false;
    }
    
    checkDeliveryCenter() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] && this.grid[y][x].type === 'delivery') {
                    const nearby = this.getNearby(x, y, 2);
                    const houses = nearby.filter(n => n.type === 'house').length;
                    const hasShop = nearby.some(n => n.type === 'shop');
                    if (houses >= 3 && hasShop) return true;
                }
            }
        }
        return false;
    }
    
    checkCafeCombo() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] && this.grid[y][x].type === 'cafe') {
                    const neighbors = this.getNeighbors(x, y);
                    const houses = neighbors.filter(n => n.type === 'house').length;
                    const parks = neighbors.filter(n => n.type === 'park').length;
                    if (houses >= 2 && parks >= 1) return true;
                }
            }
        }
        return false;
    }
    
    checkOfficeHub() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] && this.grid[y][x].type === 'office') {
                    const neighbors = this.getNeighbors(x, y);
                    const hasCafe = neighbors.some(n => n.type === 'cafe');
                    const hasDelivery = neighbors.some(n => n.type === 'delivery');
                    if (hasCafe && hasDelivery) return true;
                }
            }
        }
        return false;
    }
    
    checkWarehouseLogistics() {
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (this.grid[y][x] && this.grid[y][x].type === 'warehouse') {
                    const neighbors = this.getNeighbors(x, y);
                    const shops = neighbors.filter(n => n.type === 'shop').length;
                    if (shops >= 2) return true;
                }
            }
        }
        return false;
    }
    
    updateUI() {
        document.getElementById('score-display').textContent = this.score;
        document.getElementById('moves-display').textContent = `${this.moves}/${this.GRID_SIZE * this.GRID_SIZE}`;
        document.getElementById('highscore-display').textContent = this.highScore;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highscore-3d', this.highScore);
            document.getElementById('highscore-display').textContent = this.highScore;
        }
    }
    
    async endGame() {
        // Сохраняем результат в базу данных
        const missionsCompleted = this.completedMissions.size;
        
        if (typeof userDB !== 'undefined' && userDB.currentUser && typeof isGuestMode !== 'undefined' && !isGuestMode) {
            try {
                await userDB.saveGameSession(this.score, this.moves, missionsCompleted);
                console.log('Game session saved to database');
            } catch (error) {
                console.error('Error saving game session:', error);
            }
        }
        
        setTimeout(() => {
            const userName = (userDB && userDB.currentUser && !isGuestMode) ? userDB.currentUser.username : 'Гость';
            
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
                location.reload();
            }
        }, 500);
    }
}

// Функция инициализации игры (вызывается из HTML)
function initGame() {
    if (!gameInstance) {
        gameInstance = new Game3D();
        console.log('3D Game instance created');
    }
    return gameInstance;
}

// Запуск игры
let gameInstance = null;

