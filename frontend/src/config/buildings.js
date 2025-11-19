// Типы зданий с 3D параметрами
// Примечание: Color3 объекты создаются при импорте в game-engine.js

export const BuildingTypesConfig = {
    house: {
        id: 'house',
        name: 'Дом',
        icon: '🏠',
        desc: '+1 за парк, -1 за склад',
        colorRGB: [0.85, 0.6, 0.3], // Бежевый
        emissiveRGB: [0.15, 0.1, 0.05],
        height: 3
    },
    park: {
        id: 'park',
        name: 'Парк',
        icon: '🌳',
        desc: '+1 за дом, +1 за кафе',
        colorRGB: [0.15, 0.6, 0.25], // Зеленый
        emissiveRGB: [0.03, 0.12, 0.05],
        height: 0.5
    },
    cafe: {
        id: 'cafe',
        name: 'Кафе',
        icon: '☕',
        desc: '+1 за дом, +2 за парк',
        colorRGB: [0.7, 0.35, 0.15], // Коричневый
        emissiveRGB: [0.15, 0.08, 0.03],
        height: 2
    },
    shop: {
        id: 'shop',
        name: 'Магазин',
        icon: '🛒',
        desc: '+2 за 3+ домов рядом',
        colorRGB: [0.3, 0.5, 0.9], // Синий
        emissiveRGB: [0.1, 0.15, 0.3],
        height: 2.5
    },
    delivery: {
        id: 'delivery',
        name: 'Доставка',
        icon: '📦',
        desc: '+3 за 3 дома + магазин',
        colorRGB: [0, 0.84, 0.39], // Самокат зелёный
        emissiveRGB: [0, 0.3, 0.15],
        height: 2,
        glow: true
    },
    warehouse: {
        id: 'warehouse',
        name: 'Склад',
        icon: '🏭',
        desc: '+2 за магазины, -1 домам',
        colorRGB: [0.5, 0.5, 0.5], // Серый
        emissiveRGB: [0.1, 0.1, 0.1],
        height: 3.5
    },
    office: {
        id: 'office',
        name: 'Офис',
        icon: '🏢',
        desc: '+1 за кафе и доставку',
        colorRGB: [0.4, 0.3, 0.65], // Фиолетовый
        emissiveRGB: [0.08, 0.06, 0.15],
        height: 4
    }
};

// Функция для создания BuildingTypes с Babylon.js Color3
// Вызывается в game-engine.js после инициализации BABYLON
export function createBuildingTypes(BABYLON) {
    const BuildingTypes = {};
    
    for (const [key, config] of Object.entries(BuildingTypesConfig)) {
        BuildingTypes[key] = {
            ...config,
            color: new BABYLON.Color3(...config.colorRGB),
            emissive: new BABYLON.Color3(...config.emissiveRGB)
        };
    }
    
    return BuildingTypes;
}

// Экспорт для использования без Babylon.js (например, в React компонентах)
export const BuildingTypes = BuildingTypesConfig;
