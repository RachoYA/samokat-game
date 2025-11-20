import { MissionTemplates } from '../config/missions';

/**
 * Система управления миссиями
 * Отвечает за:
 * - Генерацию случайных миссий
 * - Проверку условий выполнения
 * - Отслеживание прогресса
 */
export class MissionSystem {
    constructor(onMissionCompleteCallback) {
        this.onMissionCompleteCallback = onMissionCompleteCallback;

        this.missions = [];
        this.completedMissions = new Set();

        // Bind methods to ensure 'this' context is preserved
        this.checkMissions = this.checkMissions.bind(this);
        this.checkMission = this.checkMission.bind(this);

        this.generateMissions();
    }

    /**
     * Генерирует 3 случайные миссии
     */
    generateMissions() {
        this.missions = [];
        const shuffled = [...MissionTemplates].sort(() => Math.random() - 0.5);
        this.missions = shuffled.slice(0, 3);
        console.log('MissionSystem: Generated missions:', this.missions);
    }

    /**
     * Проверяет все активные миссии
     */
    checkMissions(game) {
        let anyCompleted = false;

        // Ensure completedMissions is initialized
        if (!this.completedMissions) {
            this.completedMissions = new Set();
        }

        this.missions.forEach(mission => {
            if (!this.completedMissions.has(mission.id)) {
                const isCompleted = this.checkMission(mission, game);

                if (isCompleted) {
                    this.completedMissions.add(mission.id);
                    anyCompleted = true;

                    console.log(`Mission completed: ${mission.desc}`);

                    // Вызываем callback
                    if (this.onMissionCompleteCallback) {
                        this.onMissionCompleteCallback(mission);
                    }
                }
            }
        });

        return anyCompleted;
    }

    /**
     * Проверяет одну миссию
     */
    checkMission(mission, game) {
        const gridSystem = game.gridSystem;

        switch (mission.checkFunc) {
            case 'countBuildingType':
                return gridSystem.countBuildingType(mission.checkParams.type) >= mission.checkParams.count;

            case 'checkParkCluster':
                return this.checkParkCluster(gridSystem);

            case 'checkDeliveryCenter':
                return this.checkDeliveryCenter(gridSystem);

            case 'checkCafeCombo':
                return this.checkCafeCombo(gridSystem);

            case 'checkOfficeHub':
                return this.checkOfficeHub(gridSystem);

            case 'checkWarehouseLogistics':
                return this.checkWarehouseLogistics(gridSystem);

            default:
                console.warn(`Unknown mission check function: ${mission.checkFunc}`);
                return false;
        }
    }

    /**
     * Проверяет наличие парковой зоны (3 парка рядом)
     */
    checkParkCluster(gridSystem) {
        for (let y = 0; y < gridSystem.GRID_SIZE; y++) {
            for (let x = 0; x < gridSystem.GRID_SIZE; x++) {
                if (gridSystem.grid[y][x] && gridSystem.grid[y][x].type === 'park') {
                    const neighbors = gridSystem.getNeighbors(x, y);
                    const parkNeighbors = neighbors.filter(n => n.type === 'park').length;
                    if (parkNeighbors >= 2) return true;
                }
            }
        }
        return false;
    }

    /**
     * Проверяет наличие центра доставки
     */
    checkDeliveryCenter(gridSystem) {
        for (let y = 0; y < gridSystem.GRID_SIZE; y++) {
            for (let x = 0; x < gridSystem.GRID_SIZE; x++) {
                if (gridSystem.grid[y][x] && gridSystem.grid[y][x].type === 'delivery') {
                    const nearby = gridSystem.getNearby(x, y, 2);
                    const houses = nearby.filter(n => n.type === 'house').length;
                    const hasShop = nearby.some(n => n.type === 'shop');
                    if (houses >= 3 && hasShop) return true;
                }
            }
        }
        return false;
    }

    /**
     * Проверяет комбинацию кафе
     */
    checkCafeCombo(gridSystem) {
        for (let y = 0; y < gridSystem.GRID_SIZE; y++) {
            for (let x = 0; x < gridSystem.GRID_SIZE; x++) {
                if (gridSystem.grid[y][x] && gridSystem.grid[y][x].type === 'cafe') {
                    const neighbors = gridSystem.getNeighbors(x, y);
                    const houses = neighbors.filter(n => n.type === 'house').length;
                    const parks = neighbors.filter(n => n.type === 'park').length;
                    if (houses >= 2 && parks >= 1) return true;
                }
            }
        }
        return false;
    }

    /**
     * Проверяет бизнес-центр
     */
    checkOfficeHub(gridSystem) {
        for (let y = 0; y < gridSystem.GRID_SIZE; y++) {
            for (let x = 0; x < gridSystem.GRID_SIZE; x++) {
                if (gridSystem.grid[y][x] && gridSystem.grid[y][x].type === 'office') {
                    const neighbors = gridSystem.getNeighbors(x, y);
                    const hasCafe = neighbors.some(n => n.type === 'cafe');
                    const hasDelivery = neighbors.some(n => n.type === 'delivery');
                    if (hasCafe && hasDelivery) return true;
                }
            }
        }
        return false;
    }

    /**
     * Проверяет логистический центр
     */
    checkWarehouseLogistics(gridSystem) {
        for (let y = 0; y < gridSystem.GRID_SIZE; y++) {
            for (let x = 0; x < gridSystem.GRID_SIZE; x++) {
                if (gridSystem.grid[y][x] && gridSystem.grid[y][x].type === 'warehouse') {
                    const neighbors = gridSystem.getNeighbors(x, y);
                    const shops = neighbors.filter(n => n.type === 'shop').length;
                    if (shops >= 2) return true;
                }
            }
        }
        return false;
    }
}

export default MissionSystem;
