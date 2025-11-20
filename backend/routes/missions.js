const express = require('express');
const router = express.Router();

// Шаблоны миссий
const MISSION_TEMPLATES = [
    {
        id: 'houses_5',
        name: 'Постройте 5 домов',
        description: 'Постройте 5 домов в вашем районе',
        reward: 50,
        type: 'building_count'
    },
    {
        id: 'park_cluster',
        name: 'Парковая зона',
        description: 'Создайте парковую зону (3 парка рядом)',
        reward: 75,
        type: 'cluster'
    },
    {
        id: 'delivery_center',
        name: 'Центр доставки',
        description: 'Постройте центр доставки (Доставка + 3 дома + магазин рядом)',
        reward: 100,
        type: 'combo'
    },
    {
        id: 'cafe_combo',
        name: 'Уютный квартал',
        description: 'Кафе окружённое 2 домами и парком',
        reward: 80,
        type: 'combo'
    },
    {
        id: 'office_hub',
        name: 'Бизнес-центр',
        description: 'Офис + Кафе + Доставка рядом',
        reward: 90,
        type: 'combo'
    },
    {
        id: 'warehouse_logistics',
        name: 'Логистический центр',
        description: 'Склад + 2 магазина рядом',
        reward: 70,
        type: 'combo'
    },
    {
        id: 'shops_4',
        name: 'Торговая зона',
        description: 'Постройте 4 магазина',
        reward: 60,
        type: 'building_count'
    }
];

// @route   GET /api/missions
// @desc    Получить список всех миссий
// @access  Public
router.get('/', (req, res) => {
    res.json(MISSION_TEMPLATES);
});

// @route   GET /api/missions/random
// @desc    Получить 3 случайные миссии
// @access  Public
router.get('/random', (req, res) => {
    const count = parseInt(req.query.count) || 3;
    
    // Перемешиваем и берем нужное количество
    const shuffled = [...MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, MISSION_TEMPLATES.length));
    
    res.json(selected);
});

// @route   GET /api/missions/:id
// @desc    Получить миссию по ID
// @access  Public
router.get('/:id', (req, res) => {
    const mission = MISSION_TEMPLATES.find(m => m.id === req.params.id);
    
    if (!mission) {
        return res.status(404).json({ error: 'Миссия не найдена' });
    }
    
    res.json(mission);
});

module.exports = router;



