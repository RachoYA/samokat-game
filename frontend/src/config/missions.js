// Шаблоны миссий

export const MissionTemplates = [
    {
        id: 'houses_5',
        desc: 'Постройте 5 домов',
        checkFunc: 'countBuildingType',
        checkParams: { type: 'house', count: 5 },
        reward: 50
    },
    {
        id: 'park_cluster',
        desc: 'Создайте парковую зону (3 парка рядом)',
        checkFunc: 'checkParkCluster',
        checkParams: {},
        reward: 75
    },
    {
        id: 'delivery_center',
        desc: 'Постройте центр доставки (Доставка + 3 дома + магазин рядом)',
        checkFunc: 'checkDeliveryCenter',
        checkParams: {},
        reward: 100
    },
    {
        id: 'cafe_combo',
        desc: 'Кафе окружённое 2 домами и парком',
        checkFunc: 'checkCafeCombo',
        checkParams: {},
        reward: 80
    },
    {
        id: 'office_hub',
        desc: 'Бизнес-центр: Офис + Кафе + Доставка рядом',
        checkFunc: 'checkOfficeHub',
        checkParams: {},
        reward: 90
    },
    {
        id: 'warehouse_logistics',
        desc: 'Логистический центр: Склад + 2 магазина рядом',
        checkFunc: 'checkWarehouseLogistics',
        checkParams: {},
        reward: 70
    },
    {
        id: 'shops_4',
        desc: 'Постройте 4 магазина',
        checkFunc: 'countBuildingType',
        checkParams: { type: 'shop', count: 4 },
        reward: 60
    }
];

export default MissionTemplates;
