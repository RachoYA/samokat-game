import { GridSystem2D } from './systems/GridSystem2D';
import { MissionSystem } from './systems/MissionSystem';
import { BuildingTypes } from './config/buildings';
import {
    GRID_SIZE,
    CELL_SIZE,
    CAR_COUNT,
    PEOPLE_COUNT
} from './config/constants';

/* eslint-disable no-restricted-globals */

/**
 * 2D Game Engine using HTML5 Canvas
 */
class Game2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        if (!this.canvas || !this.ctx) {
            throw new Error('Canvas 2D context is required');
        }

        // Viewport state (panning/zooming)
        this.view = {
            x: 0,
            y: 0,
            scale: 1,
            isDragging: false,
            lastX: 0,
            lastY: 0
        };

        // Adjust canvas resolution for high DPI displays
        this.dpr = window.devicePixelRatio || 1;
        this.setupCanvas();

        this.GRID_SIZE = GRID_SIZE;
        this.CELL_SIZE = CELL_SIZE; // Logical size

        this.score = 0;
        this.moves = 0;
        this.maxMoves = this.GRID_SIZE * this.GRID_SIZE * 2;
        this.highScore = parseInt(localStorage.getItem('highScore2D')) || 0;

        this.currentCards = [];
        this.selectedCard = null;
        this.recentBuildings = [];

        // Animated objects
        this.cars = [];
        this.people = [];

        this.isRunning = false;
        this.lastTime = 0;
        this.isLoading = true;

        // Assets
        this.assets = {};
        this.assetList = {
            house: '/sprites/house.png',
            shop: '/sprites/shop.png',
            cafe: '/sprites/cafe.png',
            park: '/sprites/park.png',
            office: '/sprites/office.png',
            warehouse: '/sprites/warehouse.png',
            delivery: '/sprites/delivery.png',
            car: '/sprites/car.png',
            person: '/sprites/person.png',
            road: '/sprites/road.png',
            road_intersection: '/sprites/road_intersection.png',
            grass: '/sprites/grass.png'
        };

        this.init();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);

        // Initial center view
        const gridPixelSize = GRID_SIZE * CELL_SIZE;
        this.view.x = (rect.width - gridPixelSize) / 2;
        this.view.y = (rect.height - gridPixelSize) / 2;
    }

    async init() {
        console.log('Game2D: Init started...');

        await this.loadAssets();
        this.isLoading = false;

        // Initialize systems
        this.gridSystem = new GridSystem2D((x, y) => this.onCellClick(x, y));

        this.missionSystem = new MissionSystem((mission) => {
            console.log(`Mission completed: ${mission.desc}`);
            this.score += mission.reward;
            this.updateUI();
        });

        // Initialize entities
        this.createAnimatedObjects();
        this.generateCards();

        // Input listeners
        this.setupInput();

        // Start loop
        this.isRunning = true;
        requestAnimationFrame((t) => this.loop(t));

        console.log('Game2D: Init completed');
    }

    async loadAssets() {
        const promises = Object.entries(this.assetList).map(([key, src]) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    this.assets[key] = img;
                    resolve();
                };
                img.onerror = (e) => {
                    console.error(`Failed to load asset: ${src}`, e);
                    // Resolve anyway to not block game, but log error
                    resolve();
                };
            });
        });

        await Promise.all(promises);
        console.log('All assets loaded');
    }

    setupInput() {
        // Mouse/Touch events for panning and clicking
        this.canvas.addEventListener('mousedown', this.handleStart.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleEnd.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));

        // Touch support
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleStart({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.handleMove({ clientX: touch.clientX, clientY: touch.clientY });
        }, { passive: false });

        this.canvas.addEventListener('touchend', this.handleEnd.bind(this));

        // Resize
        window.addEventListener('resize', () => this.setupCanvas());
    }

    handleStart(e) {
        this.view.isDragging = true;
        this.view.lastX = e.clientX;
        this.view.lastY = e.clientY;
        this.dragStartTime = Date.now();
        this.dragStartPos = { x: e.clientX, y: e.clientY };
    }

    handleMove(e) {
        if (this.view.isDragging) {
            const dx = e.clientX - this.view.lastX;
            const dy = e.clientY - this.view.lastY;
            this.view.x += dx;
            this.view.y += dy;
            this.view.lastX = e.clientX;
            this.view.lastY = e.clientY;
        }

        // Hover effect logic could go here
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left - this.view.x) / this.view.scale;
        const mouseY = (e.clientY - rect.top - this.view.y) / this.view.scale;
        this.hoverX = Math.floor(mouseX / this.CELL_SIZE);
        this.hoverY = Math.floor(mouseY / this.CELL_SIZE);
    }

    handleEnd(e) {
        this.view.isDragging = false;

        // Check for click (short duration, small movement)
        const duration = Date.now() - this.dragStartTime;
        const dist = Math.hypot(e.clientX - this.dragStartPos.x, e.clientY - this.dragStartPos.y);

        if (duration < 200 && dist < 5) {
            // It's a click!
            const rect = this.canvas.getBoundingClientRect();
            // Transform screen coords to grid coords
            // x_screen = x_grid * scale + view_x
            // x_grid = (x_screen - view_x) / scale
            const clickX = (e.clientX - rect.left - this.view.x) / this.view.scale;
            const clickY = (e.clientY - rect.top - this.view.y) / this.view.scale;

            const gridX = Math.floor(clickX / this.CELL_SIZE);
            const gridY = Math.floor(clickY / this.CELL_SIZE);

            console.log(`Click at screen (${e.clientX}, ${e.clientY}), canvas (${clickX}, ${clickY}), grid (${gridX}, ${gridY})`);

            if (gridX >= 0 && gridX < this.GRID_SIZE && gridY >= 0 && gridY < this.GRID_SIZE) {
                this.onCellClick(gridX, gridY);
            } else {
                console.log('Click outside grid');
            }
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);

        // Zoom towards mouse pointer
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // New scale
        const newScale = Math.max(0.5, Math.min(3, this.view.scale * zoom));

        // Adjust view position to keep mouse point stable
        // mouse_world = (mouse_screen - view_x) / scale
        // view_x_new = mouse_screen - mouse_world * new_scale
        const mouseWorldX = (mouseX - this.view.x) / this.view.scale;
        const mouseWorldY = (mouseY - this.view.y) / this.view.scale;

        this.view.x = mouseX - mouseWorldX * newScale;
        this.view.y = mouseY - mouseWorldY * newScale;
        this.view.scale = newScale;
    }

    createAnimatedObjects() {
        // Cars
        for (let i = 0; i < CAR_COUNT; i++) {
            const roadArray = Array.from(this.gridSystem.roads);
            const randomRoad = roadArray[Math.floor(Math.random() * roadArray.length)];
            const [rx, ry] = randomRoad.split(',').map(Number);

            this.cars.push({
                x: rx * this.CELL_SIZE + this.CELL_SIZE / 2,
                y: ry * this.CELL_SIZE + this.CELL_SIZE / 2,
                currentRoadX: rx,
                currentRoadY: ry,
                targetRoadX: null,
                targetRoadY: null,
                targetX: null,
                targetY: null, // In 2D, Z becomes Y
                movingAxis: null,
                speed: (0.02 + Math.random() * 0.02) * this.CELL_SIZE * 60, // Speed in pixels/sec
                color: `hsl(${Math.random() * 360}, 70%, 50%)`
            });
        }

        // People
        for (let i = 0; i < PEOPLE_COUNT; i++) {
            const roadArray = Array.from(this.gridSystem.roads).filter(r => {
                const [x, y] = r.split(',').map(Number);
                return x >= 0 && x < this.GRID_SIZE && y >= 0 && y < this.GRID_SIZE;
            });
            const randomRoad = roadArray[Math.floor(Math.random() * roadArray.length)];
            const [rx, ry] = randomRoad.split(',').map(Number);

            // Offset to sidewalk (approx 20px from center if cell is 60px)
            const offset = (Math.random() > 0.5 ? 1 : -1) * (this.CELL_SIZE * 0.35);

            // Determine if road is horizontal or vertical to apply offset correctly
            // For simplicity, we'll adjust dynamically in update, but here init
            const isVertical = this.gridSystem.roadLines.vertical.includes(rx);

            let startX = rx * this.CELL_SIZE + this.CELL_SIZE / 2;
            let startY = ry * this.CELL_SIZE + this.CELL_SIZE / 2;

            if (isVertical) {
                startX += offset;
            } else {
                startY += offset;
            }

            this.people.push({
                x: startX,
                y: startY,
                currentRoadX: rx,
                currentRoadY: ry,
                targetRoadX: null,
                targetRoadY: null,
                targetX: null,
                targetY: null,
                speed: (0.01 + Math.random() * 0.01) * this.CELL_SIZE * 60,
                color: `hsl(${Math.random() * 360}, 60%, 70%)`,
                sideOffset: offset // Keep them on their side
            });
        }
    }

    update(dt) {
        // Update Cars
        this.cars.forEach(car => {
            if (!car.targetX || !car.targetY) {
                // Logic similar to 3D but simplified for 2D
                const currentX = car.currentRoadX;
                const currentY = car.currentRoadY;

                const isOnHorizontal = this.gridSystem.roadLines.horizontal.includes(currentY);
                const isOnVertical = this.gridSystem.roadLines.vertical.includes(currentX);
                const isIntersection = isOnHorizontal && isOnVertical;

                let next = null;

                if (isIntersection) {
                    const directions = [];
                    // Right
                    const nextRight = this.gridSystem.roadLines.vertical.find(x => x > currentX);
                    if (nextRight !== undefined) directions.push({ x: nextRight, y: currentY, axis: 'horizontal' });
                    // Left
                    const nextLeft = [...this.gridSystem.roadLines.vertical].reverse().find(x => x < currentX);
                    if (nextLeft !== undefined) directions.push({ x: nextLeft, y: currentY, axis: 'horizontal' });
                    // Down (Y+)
                    const nextDown = this.gridSystem.roadLines.horizontal.find(y => y > currentY);
                    if (nextDown !== undefined) directions.push({ x: currentX, y: nextDown, axis: 'vertical' });
                    // Up (Y-)
                    const nextUp = [...this.gridSystem.roadLines.horizontal].reverse().find(y => y < currentY);
                    if (nextUp !== undefined) directions.push({ x: currentX, y: nextUp, axis: 'vertical' });

                    if (directions.length > 0) next = directions[Math.floor(Math.random() * directions.length)];
                } else if (isOnHorizontal) {
                    const nextRight = this.gridSystem.roadLines.vertical.find(x => x > currentX);
                    const nextLeft = [...this.gridSystem.roadLines.vertical].reverse().find(x => x < currentX);
                    const opts = [];
                    if (nextRight !== undefined) opts.push({ x: nextRight, y: currentY, axis: 'horizontal' });
                    if (nextLeft !== undefined) opts.push({ x: nextLeft, y: currentY, axis: 'horizontal' });
                    if (opts.length > 0) next = opts[Math.floor(Math.random() * opts.length)];
                } else if (isOnVertical) {
                    const nextDown = this.gridSystem.roadLines.horizontal.find(y => y > currentY);
                    const nextUp = [...this.gridSystem.roadLines.horizontal].reverse().find(y => y < currentY);
                    const opts = [];
                    if (nextDown !== undefined) opts.push({ x: currentX, y: nextDown, axis: 'vertical' });
                    if (nextUp !== undefined) opts.push({ x: currentX, y: nextUp, axis: 'vertical' });
                    if (opts.length > 0) next = opts[Math.floor(Math.random() * opts.length)];
                }

                if (next) {
                    car.targetRoadX = next.x;
                    car.targetRoadY = next.y;
                    car.movingAxis = next.axis;
                    car.targetX = next.x * this.CELL_SIZE + this.CELL_SIZE / 2;
                    car.targetY = next.y * this.CELL_SIZE + this.CELL_SIZE / 2;
                }
            }

            // Move
            if (car.targetX !== null) {
                const speed = car.speed * dt;
                if (car.movingAxis === 'horizontal') {
                    const dx = car.targetX - car.x;
                    if (Math.abs(dx) < speed) {
                        car.x = car.targetX;
                        car.currentRoadX = car.targetRoadX;
                        car.targetX = null;
                    } else {
                        car.x += Math.sign(dx) * speed;
                    }
                } else {
                    const dy = car.targetY - car.y;
                    if (Math.abs(dy) < speed) {
                        car.y = car.targetY;
                        car.currentRoadY = car.targetRoadY;
                        car.targetY = null;
                    } else {
                        car.y += Math.sign(dy) * speed;
                    }
                }
            }
        });

        // Update People (simplified random walk)
        this.people.forEach(person => {
            if (!person.targetX) {
                const neighbors = [];
                const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
                dirs.forEach(([dx, dy]) => {
                    const nx = person.currentRoadX + dx;
                    const ny = person.currentRoadY + dy;
                    if (this.gridSystem.roads.has(`${nx},${ny}`)) {
                        neighbors.push({ x: nx, y: ny });
                    }
                });

                if (neighbors.length > 0) {
                    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
                    person.targetRoadX = next.x;
                    person.targetRoadY = next.y;

                    // Determine axis to apply offset correctly
                    // If moving horizontally (dx != 0), offset is Y
                    // If moving vertically (dy != 0), offset is X
                    const isMovingHorizontal = next.x !== person.currentRoadX;

                    const centerX = next.x * this.CELL_SIZE + this.CELL_SIZE / 2;
                    const centerY = next.y * this.CELL_SIZE + this.CELL_SIZE / 2;

                    if (isMovingHorizontal) {
                        person.targetX = centerX;
                        person.targetY = centerY + person.sideOffset;
                    } else {
                        person.targetX = centerX + person.sideOffset;
                        person.targetY = centerY;
                    }
                }
            }

            if (person.targetX) {
                const speed = person.speed * dt;
                const dx = person.targetX - person.x;
                const dy = person.targetY - person.y;
                const dist = Math.hypot(dx, dy);

                if (dist < speed) {
                    person.x = person.targetX;
                    person.y = person.targetY;
                    person.currentRoadX = person.targetRoadX;
                    person.currentRoadY = person.targetRoadY;
                    person.targetX = null;
                } else {
                    person.x += (dx / dist) * speed;
                    person.y += (dy / dist) * speed;
                }
            }
        });

        // Update Building Animations
        this.gridSystem.buildings.forEach(b => {
            if (b.scale < 1) {
                b.scale = Math.min(1, b.scale + dt * 3); // Pop in speed
            }
            if (b.scoreTextTimer > 0) {
                b.scoreTextTimer--;
            }
        });
    }

    render() {
        // Clear background
        this.ctx.fillStyle = '#87CEFA'; // Sky blue background
        this.ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

        this.ctx.save();
        // Apply view transform
        this.ctx.translate(this.view.x, this.view.y);
        this.ctx.scale(this.view.scale, this.view.scale);

        // Draw Ground
        const gridSizePx = this.GRID_SIZE * this.CELL_SIZE;
        if (this.assets.grass) {
            const pattern = this.ctx.createPattern(this.assets.grass, 'repeat');
            this.ctx.fillStyle = pattern;
            this.ctx.save();
            // Scale pattern down a bit if needed, or just fill
            this.ctx.fillRect(-50, -50, gridSizePx + 100, gridSizePx + 100);
            this.ctx.restore();
        } else {
            this.ctx.fillStyle = '#90EE90'; // Fallback
            this.ctx.fillRect(-50, -50, gridSizePx + 100, gridSizePx + 100);
        }

        // Draw Roads
        this.gridSystem.roads.forEach(key => {
            const [x, y] = key.split(',').map(Number);

            const isHorizontal = this.gridSystem.roadLines.horizontal.includes(y);
            const isVertical = this.gridSystem.roadLines.vertical.includes(x);
            const isIntersection = isHorizontal && isVertical;

            this.ctx.save();
            // Translate to center
            this.ctx.translate(x * this.CELL_SIZE + this.CELL_SIZE / 2, y * this.CELL_SIZE + this.CELL_SIZE / 2);

            // Rotate horizontal roads 90 degrees (but not intersections)
            if (isHorizontal && !isVertical) {
                this.ctx.rotate(Math.PI / 2);
            }

            // Draw slightly larger to avoid gaps (seamless look)
            const drawSize = this.CELL_SIZE + 2;

            // Use intersection texture for crossroads, regular road for straight sections
            const roadAsset = isIntersection ? this.assets.road_intersection : this.assets.road;

            if (roadAsset) {
                this.ctx.drawImage(roadAsset, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            } else {
                this.ctx.fillStyle = '#555';
                this.ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize);
            }
            this.ctx.restore();
        });

        // Draw Grid Cells (Empty)
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 1;
        for (let y = 0; y < this.GRID_SIZE; y++) {
            for (let x = 0; x < this.GRID_SIZE; x++) {
                if (!this.gridSystem.roads.has(`${x},${y}`)) {
                    this.ctx.strokeRect(x * this.CELL_SIZE, y * this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE);

                    // Hover highlight
                    if (x === this.hoverX && y === this.hoverY) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        this.ctx.fillRect(x * this.CELL_SIZE, y * this.CELL_SIZE, this.CELL_SIZE, this.CELL_SIZE);
                    }
                }
            }
        }

        // Draw Buildings
        this.gridSystem.buildings.forEach(b => {
            const type = BuildingTypes[b.type];
            const x = b.x * this.CELL_SIZE;
            const y = b.y * this.CELL_SIZE;
            const scale = b.scale || 1;

            this.ctx.save();
            // Scale from center
            this.ctx.translate(x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2);
            this.ctx.scale(scale, scale);
            this.ctx.translate(-(x + this.CELL_SIZE / 2), -(y + this.CELL_SIZE / 2));

            if (this.assets[b.type]) {
                // Draw larger to fill cell completely (1.15x)
                const drawSize = this.CELL_SIZE * 1.15;
                const offset = (drawSize - this.CELL_SIZE) / 2;
                this.ctx.drawImage(this.assets[b.type], x - offset, y - offset, drawSize, drawSize);
            } else {
                // Fallback
                const color = type.colorRGB ? `rgb(${type.colorRGB.map(c => c * 255).join(',')})` : '#ccc';
                this.ctx.fillStyle = color;
                this.ctx.fillRect(x, y, this.CELL_SIZE, this.CELL_SIZE);
                this.ctx.fillStyle = 'white';
                this.ctx.font = `${this.CELL_SIZE / 2}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(type.icon, x + this.CELL_SIZE / 2, y + this.CELL_SIZE / 2);
            }

            this.ctx.restore();

            // Score popup
            if (b.scoreTextTimer > 0) {
                this.ctx.save();
                this.ctx.fillStyle = 'yellow';
                this.ctx.strokeStyle = 'black';
                this.ctx.lineWidth = 3;
                this.ctx.font = 'bold 24px Arial';
                this.ctx.textAlign = 'center';

                // Float up effect
                const floatOffset = (120 - b.scoreTextTimer) * 0.5;
                const alpha = Math.min(1, b.scoreTextTimer / 30); // Fade out last 30 frames

                this.ctx.globalAlpha = alpha;
                this.ctx.strokeText(`+${b.score}`, x + this.CELL_SIZE / 2, y - 10 - floatOffset);
                this.ctx.fillText(`+${b.score}`, x + this.CELL_SIZE / 2, y - 10 - floatOffset);
                this.ctx.restore();
            }
        });

        // Draw Cars
        this.cars.forEach(car => {
            this.ctx.save();
            this.ctx.translate(car.x, car.y);

            // Orientation logic
            let rotation = 0;
            let flipX = 1;

            if (car.movingAxis === 'vertical') {
                // Check direction
                if (car.targetY > car.y) rotation = Math.PI / 2; // Down
                else rotation = -Math.PI / 2; // Up
            } else {
                if (car.targetX < car.x) {
                    // Moving Left: Flip horizontally instead of rotating 180
                    // This prevents "upside down" look if sprite is side-view
                    flipX = -1;
                    rotation = 0;
                } else {
                    // Moving Right
                    rotation = 0;
                }
            }

            this.ctx.rotate(rotation);
            this.ctx.scale(flipX, 1);

            if (this.assets.car) {
                const size = this.CELL_SIZE * 0.8;
                this.ctx.drawImage(this.assets.car, -size / 2, -size / 2, size, size);
            } else {
                this.ctx.fillStyle = car.color;
                const carLength = this.CELL_SIZE * 0.6;
                const carWidth = this.CELL_SIZE * 0.3;
                this.ctx.fillRect(-carLength / 2, -carWidth / 2, carLength, carWidth);
            }
            this.ctx.restore();
        });

        // Draw People
        this.people.forEach(person => {
            this.ctx.save();
            this.ctx.translate(person.x, person.y);

            if (this.assets.person) {
                const size = this.CELL_SIZE * 0.4;
                this.ctx.drawImage(this.assets.person, -size / 2, -size / 2, size, size);
            } else {
                this.ctx.fillStyle = person.color;
                this.ctx.beginPath();
                const radius = this.CELL_SIZE * 0.15;
                this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        });

        this.ctx.restore();
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // Cap dt to prevent huge jumps
        const safeDt = Math.min(dt, 0.1);

        this.update(safeDt);
        this.render();

        requestAnimationFrame((t) => this.loop(t));
    }

    onCellClick(x, y) {
        if (!this.selectedCard || this.gridSystem.isCellOccupied(x, y)) return;
        if (!this.gridSystem.hasRoadAccess(x, y)) {
            console.warn('No road access!');
            return;
        }

        const buildingData = {
            type: this.selectedCard,
            x,
            y,
            score: 0,
            scoreTextTimer: 120, // frames (approx 2 seconds)
            scale: 0 // Start scale for animation
        };

        this.gridSystem.placeBuilding(x, y, buildingData);

        this.moves++;
        this.recalculateScores();
        this.updateUI();

        this.missionSystem.checkMissions(this);

        this.selectedCard = null;
        this.generateCards();

        if (this.moves >= this.maxMoves) {
            this.endGame();
        }
    }

    recalculateScores() {
        let totalScore = 0;
        
        this.gridSystem.buildings.forEach(b => {
            let score = 1; // Базовое очко
            const neighbors = this.gridSystem.getNeighbors(b.x, b.y);
            const nearby = this.gridSystem.getNearby(b.x, b.y, 2);
            const farNearby = this.gridSystem.getNearby(b.x, b.y, 3);

            // 🏠 ДОМ
            if (b.type === 'house') {
                neighbors.forEach(n => {
                    if (n.type === 'park') score++; // +1 за парк
                    if (n.type === 'warehouse') score--; // -1 за склад (шумно)
                });
            }
            
            // 🌳 ПАРК
            else if (b.type === 'park') {
                neighbors.forEach(n => {
                    if (n.type === 'house') score++; // +1 за дом
                    if (n.type === 'cafe') score++; // +1 за кафе
                });
            }
            
            // ☕ КАФЕ
            else if (b.type === 'cafe') {
                neighbors.forEach(n => {
                    if (n.type === 'house') score++; // +1 за дом
                    if (n.type === 'park') score += 2; // +2 за парк (сильный кластер)
                });
            }
            
            // 🛒 МАГАЗИН
            else if (b.type === 'shop') {
                const housesNearby = nearby.filter(n => n.type === 'house').length;
                score += housesNearby * 2; // +2 за каждый дом в радиусе 2
                
                // Перенасыщение: если ≥3 магазинов рядом
                const shopsNearby = nearby.filter(n => n.type === 'shop').length;
                if (shopsNearby >= 3) {
                    score = Math.max(1, Math.floor(score / 2)); // Штраф за перенасыщение
                }
            }
            
            // 📦 ПУНКТ СЕРВИСА/ДОСТАВКИ
            else if (b.type === 'delivery') {
                const housesInRadius = farNearby.filter(n => n.type === 'house').length;
                const shopsOrCafes = farNearby.filter(n => n.type === 'shop' || n.type === 'cafe').length;
                
                // +3 если минимум 3 дома И минимум 1 магазин/кафе в радиусе 3
                if (housesInRadius >= 3 && shopsOrCafes >= 1) {
                    score += 3;
                }
            }
            
            // 🏭 СКЛАД
            else if (b.type === 'warehouse') {
                const shopsNearby = nearby.filter(n => n.type === 'shop').length;
                const deliveryNearby = nearby.filter(n => n.type === 'delivery').length;
                
                score += shopsNearby * 2; // +2 за магазин
                score += deliveryNearby * 2; // +2 за пункт доставки
                
                // Штраф домам вокруг (уже учтено в логике дома)
            }
            
            // 🏢 ОФИС
            else if (b.type === 'office') {
                neighbors.forEach(n => {
                    if (n.type === 'cafe') score++; // +1 за кафе
                    if (n.type === 'delivery') score++; // +1 за пункт доставки
                });
            }

            b.score = Math.max(0, score); // Минимум 0 очков
            totalScore += b.score;
        });
        
        this.score = totalScore;
    }

    generateCards() {
        // Simplified card generation
        this.currentCards = [];
        const types = Object.keys(BuildingTypes);
        for (let i = 0; i < 3; i++) {
            this.currentCards.push(types[Math.floor(Math.random() * types.length)]);
        }
        this.renderCards();
    }

    renderCards() {
        // React handles this
    }

    updateUI() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore2D', this.highScore);
        }
    }

    async endGame() {
        alert(`Game Over! Score: ${this.score}`);
        if (confirm('Play again?')) {
            window.location.reload();
        }
    }
}

export { Game2D };
