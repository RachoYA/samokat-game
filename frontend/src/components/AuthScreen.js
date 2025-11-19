import React, { useState } from 'react';
import { authAPI } from '../services/api';
import './AuthScreen.css';
import './AuthScreen-mobile.css';

function AuthScreen({ onLogin }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let response;
            if (isRegister) {
                response = await authAPI.register(username, email);
            } else {
                response = await authAPI.login(username);
            }
            
            onLogin(response.user, response.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка при авторизации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-screen">
            <div className="auth-content">
                <div className="auth-logo">
                    <h1>🛴 Микрорайон 3D</h1>
                    <p>Градостроительный пазл от Самокат</p>
                </div>

                <div className="auth-box">
                    <h2>{isRegister ? 'Регистрация' : 'Вход в игру'}</h2>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="Имя пользователя"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                minLength="3"
                                maxLength="20"
                            />
                        </div>

                        {isRegister && (
                            <div className="form-group">
                                <input
                                    type="email"
                                    placeholder="Email (необязательно)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="btn-primary" disabled={loading}>
                            {loading ? 'Загрузка...' : (isRegister ? 'Зарегистрироваться' : 'Войти')}
                        </button>
                    </form>

                    <button 
                        className="btn-switch" 
                        onClick={() => setIsRegister(!isRegister)}
                    >
                        {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                    </button>
                </div>

                <div className="auth-footer">
                    <p>🛴 Powered by Babylon.js • Самокат 2025</p>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;


