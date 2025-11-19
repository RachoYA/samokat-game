import { MissionSystem } from './MissionSystem';
import { MissionTemplates } from '../config/missions';

// Mock GridSystem
class MockGridSystem {
    constructor() {
        this.grid = [];
        this.buildings = [];
        for (let y = 0; y < 8; y++) {
            this.grid[y] = [];
            for (let x = 0; x < 8; x++) {
                this.grid[y][x] = null;
            }
        }
    }

    placeBuilding(x, y, type) {
        const building = { x, y, type };
        this.grid[y][x] = building;
        this.buildings.push(building);
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
            if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && this.grid[ny][nx]) {
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
                if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && this.grid[ny][nx]) {
                    nearby.push(this.grid[ny][nx]);
                }
            }
        }
        return nearby;
    }
}

describe('MissionSystem', () => {
    let missionSystem;
    let gridSystem;
    let gameMock;

    beforeEach(() => {
        missionSystem = new MissionSystem();
        gridSystem = new MockGridSystem();
        gameMock = {
            missionSystem: missionSystem,
            gridSystem: gridSystem
        };
    });

    test('should count building types correctly', () => {
        gridSystem.placeBuilding(0, 0, 'house');
        gridSystem.placeBuilding(1, 0, 'house');
        gridSystem.placeBuilding(2, 0, 'park');

        expect(missionSystem.countBuildingType(gridSystem, 'house')).toBe(2);
        expect(missionSystem.countBuildingType(gridSystem, 'park')).toBe(1);
        expect(missionSystem.countBuildingType(gridSystem, 'shop')).toBe(0);
    });

    test('should check park cluster correctly', () => {
        // 3 parks in a row
        gridSystem.placeBuilding(0, 0, 'park');
        gridSystem.placeBuilding(1, 0, 'park');
        gridSystem.placeBuilding(2, 0, 'park');

        expect(missionSystem.checkParkCluster(gridSystem)).toBe(true);
    });

    test('should fail park cluster if not connected', () => {
        gridSystem.placeBuilding(0, 0, 'park');
        gridSystem.placeBuilding(2, 0, 'park');
        gridSystem.placeBuilding(4, 0, 'park');

        expect(missionSystem.checkParkCluster(gridSystem)).toBe(false);
    });

    test('should check delivery center correctly', () => {
        // Delivery + 3 houses + shop nearby
        gridSystem.placeBuilding(3, 3, 'delivery');
        gridSystem.placeBuilding(2, 3, 'house');
        gridSystem.placeBuilding(4, 3, 'house');
        gridSystem.placeBuilding(3, 2, 'house');
        gridSystem.placeBuilding(3, 4, 'shop');

        expect(missionSystem.checkDeliveryCenter(gridSystem)).toBe(true);
    });

    test('should check missions completion', () => {
        // Setup specific mission
        missionSystem.missions = [MissionTemplates.find(m => m.id === 'houses_5')];

        // Build 5 houses
        for (let i = 0; i < 5; i++) {
            gridSystem.placeBuilding(i, 0, 'house');
        }

        const completed = missionSystem.checkMissions(gameMock);
        expect(completed).toBe(true);
        expect(missionSystem.completedMissions.has('houses_5')).toBe(true);
    });
});
