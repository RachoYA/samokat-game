import React, { useState, useEffect } from 'react';
import Game2D from './Game2D';
import { sessionsAPI, missionsAPI } from '../services/api';
import './GameScreen.css';
import './GameScreen-mobile.css';

function GameScreen({ user, onLogout }) {
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMissions();
    }, []);

    const loadMissions = async () => {
        try {
            const data = await missionsAPI.getRandom(3);
            setMissions(data);
        } catch (error) {
            console.error('Error loading missions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGameEnd = async (score, moves, missionsCompleted) => {
        try {
            const response = await sessionsAPI.create(score, moves, missionsCompleted);
            console.log('Session saved:', response);

            // Обновляем данные пользователя в localStorage
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }

            return response;
        } catch (error) {
            console.error('Error saving session:', error);
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Загрузка игры...</p>
            </div>
        );
    }

    return (
        <div className="game-screen">
            <div className="game-header">
                <div className="user-info">
                    <span className="user-name">👤 {user.username}</span>
                    <span className="user-stats">🏆 Рекорд: {user.best_score}</span>
                    <span className="user-stats">🎮 Игр: {user.total_games}</span>
                </div>
                <button className="btn-logout" onClick={onLogout}>
                    Выйти
                </button>
            </div>

            <Game2D
                user={user}
                missions={missions}
                onGameEnd={handleGameEnd}
            />
        </div>
    );
}

export default GameScreen;


