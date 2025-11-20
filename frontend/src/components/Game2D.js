import React, { useEffect, useRef, useState } from 'react';
import { Game2D as GameEngine } from '../game-engine-2d';
import { BuildingTypes } from '../config/buildings';
import './Game2D.css';

function Game2D({ user, missions, onGameEnd }) {
    const canvasRef = useRef(null);
    const gameRef = useRef(null);
    const [gameState, setGameState] = useState({
        score: 0,
        moves: 0,
        highScore: 0,
        currentCards: [],
        selectedCard: null,
        completedMissions: [],
        loading: true
    });

    const [missionsCollapsed, setMissionsCollapsed] = useState(false);

    useEffect(() => {
        if (!canvasRef.current) return;

        console.log('Initializing 2D game engine...');

        try {
            const game = new GameEngine(canvasRef.current);
            gameRef.current = game;

            const updateInterval = setInterval(() => {
                if (game) {
                    setGameState({
                        score: game.score,
                        moves: game.moves,
                        highScore: game.highScore,
                        currentCards: game.currentCards,
                        selectedCard: game.selectedCard,
                        completedMissions: Array.from(game.missionSystem.completedMissions),
                        loading: game.isLoading
                    });
                }
            }, 100);

            // Override endGame
            const originalEndGame = game.endGame.bind(game);
            game.endGame = async function () {
                const missionsCompleted = this.missionSystem.completedMissions.size;
                if (onGameEnd) {
                    await onGameEnd(this.score, this.moves, missionsCompleted);
                }
                await originalEndGame();
            };

            return () => {
                clearInterval(updateInterval);
                if (game) {
                    game.isRunning = false;
                }
            };
        } catch (error) {
            console.error('Error initializing 2D game:', error);
        }
    }, [onGameEnd]);

    const handleCardClick = (cardType) => {
        if (gameRef.current) {
            gameRef.current.selectedCard = cardType;
            // Force update to show selection in UI immediately if needed
            setGameState(prev => ({ ...prev, selectedCard: cardType }));
        }
    };

    return (
        <div className="game3d-container" style={{ background: '#87CEFA' }}>
            <canvas
                ref={canvasRef}
                className="game3d-canvas"
                style={{ width: '100%', height: '100%', touchAction: 'none' }}
            />

            {gameState.loading && (
                <div className="loading-overlay" style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000,
                    fontSize: '24px'
                }}>
                    Loading Assets...
                </div>
            )}

            {/* UI Overlay (Reused) */}
            <div className="game-ui">
                <div className="stats-panel">
                    <div className="stat-item">
                        <div className="stat-label">Очки</div>
                        <div className="stat-value">{gameState.score}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Ход</div>
                        <div className="stat-value">{gameState.moves}/{gameRef.current?.maxMoves || 64}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Рекорд</div>
                        <div className="stat-value">{gameState.highScore}</div>
                    </div>
                </div>

                <div className={`missions-panel ${missionsCollapsed ? 'collapsed' : ''}`}>
                    <div className="missions-header">
                        <h3>🎯 Задания</h3>
                        <button
                            className="btn-collapse"
                            onClick={() => setMissionsCollapsed(!missionsCollapsed)}
                        >
                            {missionsCollapsed ? '◀' : '▶'}
                        </button>
                    </div>
                    {!missionsCollapsed && missions.map((mission) => {
                        const isCompleted = gameState.completedMissions.includes(mission.id);
                        return (
                            <div key={mission.id} className={`mission-item ${isCompleted ? 'completed' : ''}`}>
                                <div className="mission-desc">
                                    {isCompleted ? '✅' : '⬜'} {mission.description}
                                </div>
                                <span className="mission-reward">+{mission.reward} 💎</span>
                            </div>
                        );
                    })}
                </div>

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

                <div className="bottom-left-panel">
                    <div className="controls-hint">
                        <h4>🎮 2D Режим</h4>
                        <p>🖱️ Драг - перемещение</p>
                        <p>🔍 Колесо - зум</p>
                        <p>👆 Клик - строить</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Game2D;
