import React, { useState, useEffect } from 'react';
import { timerAPI } from '../services/api';
import './SettingsModal.css';

const SettingsModal = ({ onClose }) => {
  const [settings, setSettings] = useState(() => ({
    work_time: 25,
    break_time: 5,
    long_break_duration: 15,
    pomodoros_before_long_break: 4,
    auto_start_breaks: false,
    auto_start_pomodoro: false,
  }));

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await timerAPI.getDefaults();
      if (response.data) {
        setSettings((prev) => ({
          ...prev,
          work_time: response.data.work_time ?? 25,
          break_time: response.data.break_time ?? 5,
          long_break_duration: response.data.long_break_duration ?? 15,
          pomodoros_before_long_break: response.data.pomodoros_before_long_break ?? 4,
          auto_start_breaks: response.data.auto_start_breaks ?? prev.auto_start_breaks,
          auto_start_pomodoro: response.data.auto_start_pomodoro ?? prev.auto_start_pomodoro,
        }));
      }
    } catch (error) {
      console.error('Ошибка при получении настроек:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberInput = (field, value) => {
    const numeric = value.replace(/[^0-9]/g, '');
    if (numeric === '') {
      setSettings((p) => ({ ...p, [field]: 0 }));
      return;
    }
    const n = parseInt(numeric, 10);
    if (n >= 0 && n <= 120) {
      setSettings((p) => ({ ...p, [field]: n }));
    }
  };

  const validateSettings = () => {
    const errors = [];

    if (settings.work_time < 1 || settings.work_time > 90) {
      errors.push('Время работы должно быть от 1 до 90 минут');
    }
    if (settings.break_time < 1 || settings.break_time > 30) {
      errors.push('Короткий перерыв должен быть от 1 до 30 минут');
    }
    if (settings.long_break_duration < 1 || settings.long_break_duration > 60) {
      errors.push('Длинный перерыв должен быть от 1 до 60 минут');
    }
    if (settings.pomodoros_before_long_break < 1 || settings.pomodoros_before_long_break > 10) {
      errors.push('Количество помидоров должно быть от 1 до 10');
    }

    return errors;
  };

  const handleApply = async () => {
    const errors = validateSettings();
    if (errors.length) {
      alert(errors.join('\n'));
      return;
    }

    setIsSaving(true);
    try {
      const response = await timerAPI.updateSettings({
        work_time: settings.work_time,
        break_time: settings.break_time,
        long_break_duration: settings.long_break_duration,
        pomodoros_before_long_break: settings.pomodoros_before_long_break,
        auto_start_breaks: settings.auto_start_breaks,
        auto_start_pomodoro: settings.auto_start_pomodoro,
      });

      if (response.data?.success) {
       const legacy = {
          ...settings,
          pomodoroTime: settings.work_time,
          shortBreakTime: settings.break_time,
          longBreakTime: settings.long_break_duration,
          autoStartBreaks: settings.auto_start_breaks,
          autoStartPomodoro: settings.auto_start_pomodoro,
        };

        localStorage.setItem('timerSettings', JSON.stringify(legacy));

        window.dispatchEvent(
          new CustomEvent('timerSettingsChanged', { detail: settings })
        );

        onClose();
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      alert(error.response?.data?.detail || 'Ошибка при сохранении настроек');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => onClose();

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Настройки таймера</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="loading-content">Загрузка настроек...</div>
        </div>
      </div>
    );
  }

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
              value={settings.work_time}
              onChange={(e) => handleNumberInput('work_time', e.target.value)}
              placeholder="25"
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">Время короткого перерыва (минуты)</label>
            <input
              type="text"
              className="time-input"
              value={settings.break_time}
              onChange={(e) => handleNumberInput('break_time', e.target.value)}
              placeholder="5"
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">Время длинного перерыва (минуты)</label>
            <input
              type="text"
              className="time-input"
              value={settings.long_break_duration}
              onChange={(e) => handleNumberInput('long_break_duration', e.target.value)}
              placeholder="15"
            />
          </div>


          <div className="checkbox-group">
            <label className="checkbox-label">
              Автоматический старт перерывов
              <input
                type="checkbox"
                className="checkbox-input"
                checked={settings.auto_start_breaks}
                onChange={(e) => setSettings((p) => ({ ...p, auto_start_breaks: e.target.checked }))}
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
                checked={settings.auto_start_pomodoro}
                onChange={(e) => setSettings((p) => ({ ...p, auto_start_pomodoro: e.target.checked }))}
              />
              <span className="custom-checkbox"></span>
            </label>
          </div>

          <div className="settings-actions">
            <button className="cancel-btn" onClick={handleCancel}>Отмена</button>
            <button className="apply-btn" onClick={handleApply} disabled={isSaving}>
              Применить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
