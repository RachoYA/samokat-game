const express = require('express');
const router = express.Router();
const { db } = require('../models/database');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// @route   POST /api/sessions
// @desc    Создать новую игровую сессию
// @access  Private
router.post('/', auth, [
    body('score').isInt({ min: 0 }).withMessage('Счет должен быть положительным числом'),
    body('moves').isInt({ min: 0, max: 64 }).withMessage('Ходов должно быть от 0 до 64'),
    body('missions_completed').isInt({ min: 0, max: 10 }).withMessage('Миссий от 0 до 10')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { score, moves, missions_completed } = req.body;
        const userId = req.user.userId;

        // Создаем сессию
        const result = await db.runAsync(
            'INSERT INTO game_sessions (user_id, score, moves, missions_completed) VALUES (?, ?, ?, ?)',
            [userId, score, moves, missions_completed || 0]
        );

        // Обновляем статистику пользователя
        const user = await db.getAsync(
            'SELECT best_score, total_games, total_score FROM users WHERE id = ?',
            [userId]
        );

        const newBestScore = Math.max(user.best_score, score);
        const newTotalGames = user.total_games + 1;
        const newTotalScore = user.total_score + score;

        await db.runAsync(
            'UPDATE users SET best_score = ?, total_games = ?, total_score = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newBestScore, newTotalGames, newTotalScore, userId]
        );

        // Получаем обновленного пользователя
        const updatedUser = await db.getAsync(
            'SELECT id, username, best_score, total_games, total_score FROM users WHERE id = ?',
            [userId]
        );

        res.status(201).json({
            message: 'Игровая сессия сохранена',
            sessionId: result.id,
            user: updatedUser
        });

    } catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({ error: 'Ошибка сервера при сохранении сессии' });
    }
});

// @route   GET /api/sessions/my
// @desc    Получить историю игр текущего пользователя
// @access  Private
router.get('/my', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const sessions = await db.allAsync(
            `SELECT id, score, moves, missions_completed, created_at 
             FROM game_sessions 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [req.user.userId, limit]
        );

        res.json(sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// @route   GET /api/sessions/user/:userId
// @desc    Получить историю игр пользователя по ID
// @access  Public
router.get('/user/:userId', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const sessions = await db.allAsync(
            `SELECT id, score, moves, missions_completed, created_at 
             FROM game_sessions 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT ?`,
            [req.params.userId, limit]
        );

        res.json(sessions);
    } catch (error) {
        console.error('Get user sessions error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

module.exports = router;



