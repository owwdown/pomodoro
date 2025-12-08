import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { profileAPI } from '../services/api';
import './ProfileModal.css';

const ProfileModal = ({ onClose }) => {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const response = await profileAPI.getProfile();
      if (response.data) {
        setProfileData(response.data);
        setName(response.data.name || user?.name || '');
      }
    } catch (error) {
      console.error('Ошибка при получении профиля:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Имя не может быть пустым');
      return;
    }

    if (name.trim() === user?.name) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const response = await profileAPI.updateProfile({ name: name.trim() });
      if (response.data.success) {
        const updatedUser = { ...user, name: name.trim() };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Ошибка при обновлении профиля:', error);
      alert(error.response?.data?.detail || 'Ошибка при обновлении профиля');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить.')) {
      return;
    }

    setIsLoading(true);
    try {
      await profileAPI.deleteAccount();
      logout();
      onClose();
      alert('Аккаунт успешно удален');
    } catch (error) {
      console.error('Ошибка при удалении аккаунта:', error);
      alert(error.response?.data?.detail || 'Ошибка при удалении аккаунта');
      setShowDeleteConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleOpenDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Мой профиль</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="loading-content">Загрузка профиля...</div>
        </div>
      </div>
    );
  }

  if (showDeleteConfirm) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="delete-confirm-content">
            <h3>Удалить аккаунт?</h3>
            <p className="delete-warning">
              Это действие нельзя отменить. Все ваши данные будут удалены без возможности восстановления.
            </p>
            <div className="delete-confirm-actions">
              <button 
                className="cancel-delete-btn"
                onClick={handleCancelDelete}
                disabled={isLoading}
              >
                Отмена
              </button>
              <button 
                className="confirm-delete-btn"
                onClick={handleDeleteAccount}
                disabled={isLoading}
              >
                {isLoading ? 'Удаление...' : 'Удалить аккаунт'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              onClick={handleOpenDeleteConfirm}
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