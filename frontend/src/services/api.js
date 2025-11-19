import axios from 'axios';

// Базовый URL API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Получение токена из localStorage
export const getToken = () => localStorage.getItem('token');

// Получение пользователя из localStorage
export const getUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

// Настройка axios
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Добавление токена к каждому запросу
api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Авторизация
export const authAPI = {
    register: async (username, email) => {
        const { data } = await api.post('/auth/register', { username, email });
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },
    
    login: async (username) => {
        const { data } = await api.post('/auth/login', { username });
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    }
};

// Пользователи
export const usersAPI = {
    getMe: async () => {
        const { data } = await api.get('/users/me');
        return data;
    },
    
    getUser: async (userId) => {
        const { data } = await api.get(`/users/${userId}`);
        return data;
    },
    
    getLeaderboard: async (limit = 10) => {
        const { data } = await api.get(`/users/leaderboard/top?limit=${limit}`);
        return data;
    }
};

// Игровые сессии
export const sessionsAPI = {
    create: async (score, moves, missionsCompleted) => {
        const { data } = await api.post('/sessions', {
            score,
            moves,
            missions_completed: missionsCompleted
        });
        return data;
    },
    
    getMySessions: async (limit = 10) => {
        const { data } = await api.get(`/sessions/my?limit=${limit}`);
        return data;
    },
    
    getUserSessions: async (userId, limit = 10) => {
        const { data } = await api.get(`/sessions/user/${userId}?limit=${limit}`);
        return data;
    }
};

// Миссии
export const missionsAPI = {
    getAll: async () => {
        const { data } = await api.get('/missions');
        return data;
    },
    
    getRandom: async (count = 3) => {
        const { data } = await api.get(`/missions/random?count=${count}`);
        return data;
    },
    
    getById: async (missionId) => {
        const { data } = await api.get(`/missions/${missionId}`);
        return data;
    }
};

export default api;

