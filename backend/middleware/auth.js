const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Получаем токен из заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Проверяем наличие токена
    if (!token) {
        return res.status(401).json({ error: 'Нет токена авторизации' });
    }

    try {
        // Верифицируем токен
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Добавляем данные пользователя в request
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Недействительный токен' });
    }
};


