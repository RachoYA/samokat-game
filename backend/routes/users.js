const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const auth = require('../middleware/auth');

// @route   GET /api/users/me
// @desc    Получить информацию о текущем пользователе
// @access  Private
router.get('/me', auth, async (req, res) => {
    try {
        const user = await db.getAsync(
            'SELECT id, username, email, best_score, total_games, total_score, created_at FROM users WHERE id = ?',
            [req.user.userId]
        );

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// @route   GET /api/users/:id
// @desc    Получить информацию о пользователе по ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const user = await db.getAsync(
            'SELECT id, username, best_score, total_games, created_at FROM users WHERE id = ?',
            [req.params.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user by id error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// @route   GET /api/users/leaderboard
// @desc    Получить таблицу лидеров
// @access  Public
router.get('/leaderboard/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const leaders = await db.allAsync(
            `SELECT id, username, best_score, total_games, total_score 
             FROM users 
             ORDER BY best_score DESC 
             LIMIT ?`,
            [limit]
        );

        res.json(leaders);
    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;



