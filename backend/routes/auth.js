const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { db } = require('../models/database');

// @route   POST /api/auth/register
// @desc    Регистрация нового пользователя
// @access  Public
router.post('/register', [
    body('username').trim().isLength({ min: 3, max: 20 }).withMessage('Имя должно быть от 3 до 20 символов'),
    body('email').optional().isEmail().withMessage('Некорректный email'),
    body('password').optional().isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, email, password } = req.body;

        // Проверка существования пользователя
        const existingUser = await db.getAsync(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );

        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }

        // Хеширование пароля (если указан)
        let passwordHash = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            passwordHash = await bcrypt.hash(password, salt);
        }

        // Создание пользователя
        const result = await db.runAsync(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email || null, passwordHash]
        );

        // Создание JWT токена
        const token = jwt.sign(
            { userId: result.id, username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // Получение созданного пользователя
        const user = await db.getAsync(
            'SELECT id, username, email, best_score, total_games, total_score, created_at FROM users WHERE id = ?',
            [result.id]
        );

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            token,
            user
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

// @route   POST /api/auth/login
// @desc    Вход пользователя
// @access  Public
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Введите имя пользователя')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // Поиск пользователя
        const user = await db.getAsync(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверка пароля (если установлен)
        if (user.password_hash && password) {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ error: 'Неверный пароль' });
            }
        }

        // Создание JWT токена
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE }
        );

        // Удаляем password_hash из ответа
        delete user.password_hash;

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

module.exports = router;


