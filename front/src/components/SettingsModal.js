import React, { useState } from 'react';
import './SettingsModal.css';

const SettingsModal = ({ onClose }) => {
  const [settings, setSettings] = useState({
    pomodoroTime: 25,
    shortBreakTime: 5,
    longBreakTime: 15,
    autoStartBreaks: false,
    autoStartPomodoro: false
  });

  const handleNumberInput = (field, value) => {
    // Разрешаем только цифры
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '' || (parseInt(numericValue) > 0 && parseInt(numericValue) <= 60)) {
      handleChange(field, numericValue === '' ? '' : parseInt(numericValue));
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApply = () => {
    // Здесь будет сохранение настроек
    console.log('Применены настройки:', settings);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Настройки таймера</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="setting-group">
            <label className="setting-label">Время помодоро (минуты)</label>
            <input
              type="text"
              className="time-input"
              value={settings.pomodoroTime}
              onChange={(e) => handleNumberInput('pomodoroTime', e.target.value)}
              placeholder="25"
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">Время короткого перерыва (минуты)</label>
            <input
              type="text"
              className="time-input"
              value={settings.shortBreakTime}
              onChange={(e) => handleNumberInput('shortBreakTime', e.target.value)}
              placeholder="5"
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">Время длинного перерыва (минуты)</label>
            <input
              type="text"
              className="time-input"
              value={settings.longBreakTime}
              onChange={(e) => handleNumberInput('longBreakTime', e.target.value)}
              placeholder="15"
            />
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              Автоматический старт перерывов
              <input
                type="checkbox"
                className="checkbox-input"
                checked={settings.autoStartBreaks}
                onChange={(e) => handleChange('autoStartBreaks', e.target.checked)}
              />
              <span className="custom-checkbox"></span>
            </label>
          </div>

          <div className="checkbox-group">
            <label className="checkbox-label">
              Автоматический старт помодоро
              <input
                type="checkbox"
                className="checkbox-input"
                checked={settings.autoStartPomodoro}
                onChange={(e) => handleChange('autoStartPomodoro', e.target.checked)}
              />
              <span className="custom-checkbox"></span>
            </label>
          </div>

          <div className="settings-actions">
            <button 
              className="cancel-btn"
              onClick={handleCancel}
            >
              Отмена
            </button>
            
            <button 
              className="apply-btn"
              onClick={handleApply}
            >
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;