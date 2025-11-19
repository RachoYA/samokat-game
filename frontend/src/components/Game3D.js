import React, { useEffect, useRef, useState } from 'react';
import * as BABYLON from '@babylonjs/core';
import { Game3D as GameEngine, BuildingTypes } from '../game-engine';
import './Game3D.css';
import './Game3D-mobile.css';

function Game3D({ user, missions, onGameEnd }) {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const [gameState, setGameState] = useState({
        score: 0,
        moves: 0,
        highScore: 0,
        currentCards: [],
        selectedCard: null,
        completedMissions: []
    });

    const [missionsCollapsed, setMissionsCollapsed] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) {
            console.error('Canvas ref not found');
            return;
        }

        console.log('Initializing game engine...');

        try {
            // Создаем игровой движок с передачей canvas
            const game = new GameEngine(canvasRef.current);
            gameRef.current = game;
            console.log('Game engine created successfully');

            // Подписываемся на обновления состояния
            const updateInterval = setInterval(() => {
                if (game) {
                    setGameState({
                        score: game.score,
                        moves: game.moves,
                        highScore: game.highScore,
                        currentCards: game.currentCards,
                        selectedCard: game.selectedCard,
                        completedMissions: Array.from(game.missionSystem.completedMissions)
                    });
                }
            }, 100);

            // Переопределяем метод endGame для интеграции с React
            const originalEndGame = game.endGame.bind(game);
            game.endGame = async function () {
                const missionsCompleted = this.missionSystem.completedMissions.size;

                // Сохраняем через callback
                if (onGameEnd) {
                    await onGameEnd(this.score, this.moves, missionsCompleted);
                }

                // Вызываем оригинальный метод
                await originalEndGame();
            };

            console.log('Game3D engine initialized');

            return () => {
                clearInterval(updateInterval);
                if (game && game.engine) {
                    game.engine.dispose();
                }
            };
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }, [onGameEnd]);


    const handleCardClick = (cardType) => {
        if (gameRef.current) {
            gameRef.current.selectedCard = cardType;
            gameRef.current.renderCards();
        }
    };

    return (
        <div className="game3d-container">
            {/* Canvas для Babylon.js */}
            <canvas ref={canvasRef} id="renderCanvas" className="game3d-canvas" />

            {/* UI Overlay */}
            <div className="game-ui">
                {/* Статистика */}
                <div className="stats-panel">
                    <div className="stat-item">
                        <div className="stat-label">Очки</div>
                        <div className="stat-value">{gameState.score}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Ход</div>
                        <div className="stat-value">{gameState.moves}/64</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Рекорд</div>
                        <div className="stat-value">{gameState.highScore}</div>
                    </div>
                </div>

                {/* Миссии (сворачиваемая панель) */}
                <div className={`missions-panel ${missionsCollapsed ? 'collapsed' : ''}`}>
                    <div className="missions-header">
                        <h3>🎯 Задания</h3>
                        <button
                            className="btn-collapse"
                            onClick={() => setMissionsCollapsed(!missionsCollapsed)}
                            title={missionsCollapsed ? 'Развернуть' : 'Свернуть'}
                        >
                            {missionsCollapsed ? '◀' : '▶'}
                        </button>
                    </div>
                    {!missionsCollapsed && missions.map((mission) => {
                        const isCompleted = gameState.completedMissions.includes(mission.id);
                        return (
                            <div
                                key={mission.id}
                                className={`mission-item ${isCompleted ? 'completed' : ''}`}
                            >
                                <div className="mission-desc">
                                    {isCompleted ? '✅' : '⬜'} {mission.description}
                                </div>
                                <span className="mission-reward">+{mission.reward} 💎</span>
                            </div>
                        );
                    })}
                </div>

                {/* Карточки зданий */}
                <div className="cards-panel">
                    <div className="cards-container">
                        {gameState.currentCards.map((cardType, index) => {
                            const type = BuildingTypes[cardType];
                            const isSelected = gameState.selectedCard === cardType;

                            return (
                                <div
                                    key={index}
                                    className={`building-card ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleCardClick(cardType)}
                                >
                                    <div className="card-icon">{type.icon}</div>
                                    <div className="card-name">{type.name}</div>
                                    <div className="card-desc">{type.desc}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Подсказка и переключатель */}
                <div className="bottom-left-panel">
                    <div className="controls-hint">
                        <h4>🎮 Управление</h4>
                        <p>🖱️ ЛКМ - вращение камеры</p>
                        <p>🔍 Колесо - зум</p>
                        <p>👆 Клик по клетке - разместить здание</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Game3D;
