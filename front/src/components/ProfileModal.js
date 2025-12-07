import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './ProfileModal.css';

const ProfileModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsLoading(true);
    try {
      // Здесь будет запрос на обновление имени
      console.log('Обновление имени:', name);
      // После успешного обновления закрываем модалку
      onClose();
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      // Здесь будет запрос на удаление аккаунта
      await authAPI.deleteAccount();
      logout();
      onClose();
    } catch (error) {
      console.error('Ошибка при удалении аккаунта:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Мой профиль</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <div className="profile-photo">
              <div className="photo-placeholder">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
            
            <div className="profile-info">
              <div className="info-group">
                <label className="info-label">Имя</label>
                <input
                  type="text"
                  className="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите ваше имя"
                />
              </div>

              <div className="info-group">
                <label className="info-label">EMAIL</label>
                <div className="email-text">{user?.email || 'email@example.com'}</div>
              </div>
            </div>
          </div>

          <div className="profile-actions">
            <button 
              className="delete-btn"
              onClick={handleDeleteAccount}
              disabled={isLoading}
            >
              Удалить аккаунт
            </button>
            
            <button 
              className="save-btn"
              onClick={handleSave}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;