import React, { useState, useEffect } from 'react';
import { timerAPI } from '../services/api';
import StartTimerButton from './StartTimerButton';
import StopTimerButton from './StopTimerButton';
import './TimerWidget.css';

const TimerWidget = () => {
  const [timer, setTimer] = useState({
    isRunning: false,
    timeLeft: 25 * 60,
    mode: 'pomodoro'
  });
  const [isLoading, setIsLoading] = useState(false);

  const timerModes = {
    pomodoro: { name: 'Помодоро', duration: 25 * 60 },
    shortBreak: { name: 'Короткий перерыв', duration: 5 * 60 },
    longBreak: { name: 'Длинный перерыв', duration: 15 * 60 }
  };

  useEffect(() => {
    fetchCurrentTimer();
  }, []);

  useEffect(() => {
    let interval;
    if (timer.isRunning && timer.timeLeft > 0) {
      interval = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          timeLeft: prev.timeLeft - 1
        }));
      }, 1000);
    } else if (timer.timeLeft === 0) {
      handleTimerComplete();
    }

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.timeLeft]);

  const fetchCurrentTimer = async () => {
    try {
      const response = await timerAPI.getCurrent();
      if (response.data) {
        setTimer(response.data);
      }
    } catch (error) {
      console.log('Используем таймер по умолчанию');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = async () => {
    setIsLoading(true);
    try {
      if (timer.isRunning) {
        await timerAPI.stop();
        setTimer(prev => ({
          ...prev,
          isRunning: false
        }));
      } else {
        await timerAPI.start();
        setTimer(prev => ({
          ...prev,
          isRunning: true
        }));
      }
    } catch (error) {
      console.error('Ошибка при управлении таймером:', error);
      setTimer(prev => ({
        ...prev,
        isRunning: !prev.isRunning
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode) => {
    if (timer.isRunning) {
      handleToggleTimer();
    }
    setTimer({
      isRunning: false,
      timeLeft: timerModes[mode].duration,
      mode: mode
    });
  };

  const handleTimerComplete = () => {
    const nextMode = timer.mode === 'pomodoro' ? 'shortBreak' : 'pomodoro';
    setTimer({
      isRunning: false,
      timeLeft: timerModes[nextMode].duration,
      mode: nextMode
    });
  };

  return (
    <div className="timer-widget">
      <div className="timer-modes">
        <button
          className={`mode-btn ${timer.mode === 'pomodoro' ? 'active' : ''}`}
          onClick={() => handleModeChange('pomodoro')}
        >
          Помодоро
        </button>
        <button
          className={`mode-btn ${timer.mode === 'shortBreak' ? 'active' : ''}`}
          onClick={() => handleModeChange('shortBreak')}
        >
          Короткий<br/>перерыв
        </button>
        <button
          className={`mode-btn ${timer.mode === 'longBreak' ? 'active' : ''}`}
          onClick={() => handleModeChange('longBreak')}
        >
          Длинный<br/>перерыв
        </button>
      </div>

      <div className="timer-display">
        <div className="timer-time">{formatTime(timer.timeLeft)}</div>
      </div>
      
      <div className="timer-controls">
        {timer.isRunning ? (
          <StopTimerButton 
            onClick={handleToggleTimer}
            disabled={isLoading}
          />
        ) : (
          <StartTimerButton 
            onClick={handleToggleTimer}
            disabled={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default TimerWidget;