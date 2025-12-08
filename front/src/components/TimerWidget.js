import React, { useState, useEffect } from 'react';
import { timerAPI } from '../services/api';
import './TimerWidget.css';

const TimerWidget = () => {
  const [settings, setSettings] = useState({
    work_time: 25,
    break_time: 5,
    long_break_duration: 15,
  });

  const [timer, setTimer] = useState({
    isRunning: false,
    timeLeft: 25 * 60,
    mode: 'work', // 'work' | 'short_break' | 'long_break'
    startTime: null,
    duration: 25 * 60,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [sequenceInfo, setSequenceInfo] = useState({
    next_timer_type: 'work',
    next_timer_description: 'Время работать!',
    sequence_progress: '0/4',
    progress_percentage: 0,
    current_pomodoro_count: 0,
  });

  const durationForMode = (mode) => {
    if (mode === 'work') return (settings.work_time || 25) * 60;
    if (mode === 'short_break') return (settings.break_time || 5) * 60;
    return (settings.long_break_duration || 15) * 60; // long_break
  };

  useEffect(() => {
    (async () => {
      await fetchDefaults();
      await fetchCurrentTimer();
      await fetchSequenceInfo();
    })();

    const onSettingsChanged = (e) => {
      const next = e.detail || {};
      setSettings((prev) => ({ ...prev, ...next }));

      setTimer((prev) => {
        if (prev.isRunning) return prev;
        const nextDuration = durationForMode(prev.mode);
        return {
          ...prev,
          duration: nextDuration,
          timeLeft: nextDuration,
        };
      });
    };

    window.addEventListener('timerSettingsChanged', onSettingsChanged);
    return () => window.removeEventListener('timerSettingsChanged', onSettingsChanged);
  }, []);

  const fetchDefaults = async () => {
    try {
      const defaults = await timerAPI.getDefaults();
      const d = defaults.data || {};
      setSettings({
        work_time: d.work_time ?? 25,
        break_time: d.break_time ?? 5,
        long_break_duration: d.long_break_duration ?? 15,
      });
    } catch (error) {
      console.error('Ошибка при получении дефолтных настроек:', error);
    }
  };

  const fetchCurrentTimer = async () => {
    try {
      const response = await timerAPI.getCurrent();
      if (response.data && response.data.timer_id) {
        const timeLeft = Math.floor(response.data.timeLeft || 0);
        setTimer({
          isRunning: true,
          timeLeft,
          mode: response.data.type || 'work',
          startTime: response.data.startTime,
          duration: response.data.duration || durationForMode(response.data.type || 'work'),
        });
      } else {
        const d = durationForMode('work');
        setTimer({
          isRunning: false,
          timeLeft: d,
          mode: 'work',
          startTime: null,
          duration: d,
        });
      }
    } catch (error) {
      console.error('Ошибка при получении таймера:', error);
    }
  };

  const fetchSequenceInfo = async () => {
    try {
      const response = await timerAPI.getSequenceInfo();
      if (response.data) setSequenceInfo(response.data);
    } catch (error) {
      console.error('Ошибка при получении информации о последовательности:', error);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (timer.isRunning && timer.startTime) updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.isRunning, timer.startTime, timer.duration]);

  const updateTimer = () => {
    if (!timer.startTime) return;

    const startTime = new Date(timer.startTime).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const timeLeft = Math.max(0, timer.duration - elapsedSeconds);

    setTimer((prev) => ({ ...prev, timeLeft }));

    if (timeLeft === 0 && timer.isRunning) handleTimerComplete();
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
        setTimer((prev) => ({ ...prev, isRunning: false }));
      } else {
        const response = await timerAPI.start(timer.mode);
        if (response.data) {
          setTimer({
            isRunning: true,
            timeLeft: response.data.duration || durationForMode(timer.mode),
            mode: response.data.type || timer.mode,
            startTime: response.data.startTime,
            duration: response.data.duration || durationForMode(timer.mode),
          });
        }
      }
    } catch (error) {
      console.error('Ошибка при управлении таймером:', error);
      alert(error.response?.data?.detail || 'Ошибка при управлении таймером');
    } finally {
      setIsLoading(false);
      fetchSequenceInfo();
    }
  };

  const handleModeChange = async (mode) => {
    if (timer.isRunning) {
      await timerAPI.stop();
    }

    setIsLoading(true);
    try {
      const response = await timerAPI.start(mode);
      if (response.data) {
        setTimer({
          isRunning: true,
          timeLeft: response.data.duration || durationForMode(mode),
          mode: response.data.type || mode,
          startTime: response.data.startTime,
          duration: response.data.duration || durationForMode(mode),
        });
      }
    } catch (error) {
      console.error('Ошибка при смене режима:', error);
      setTimer({
        isRunning: false,
        timeLeft: durationForMode(mode),
        mode,
        duration: durationForMode(mode),
        startTime: null,
      });
    } finally {
      setIsLoading(false);
      fetchSequenceInfo();
    }
  };

  const handleTimerComplete = async () => {
    setIsLoading(true);
    try {
      await timerAPI.complete();
      const sequenceResponse = await timerAPI.getSequenceInfo();
      const nextMode = sequenceResponse.data?.next_timer_type || 'work';

      const timerResponse = await timerAPI.start(nextMode);
      if (timerResponse.data) {
        setTimer({
          isRunning: true,
          timeLeft: timerResponse.data.duration || durationForMode(nextMode),
          mode: timerResponse.data.type || nextMode,
          startTime: timerResponse.data.startTime,
          duration: timerResponse.data.duration || durationForMode(nextMode),
        });
        setSequenceInfo(sequenceResponse.data);
      }
    } catch (error) {
      console.error('Ошибка при завершении таймера:', error);
      setTimer((prev) => ({
        ...prev,
        isRunning: false,
        timeLeft: durationForMode(prev.mode),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetCounter = async () => {
    if (window.confirm('Вы уверены, что хотите сбросить счетчик помидоров?')) {
      setIsLoading(true);
      try {
        await timerAPI.resetCounter();
        await fetchSequenceInfo();
        alert('Счетчик помидоров сброшен');
      } catch (error) {
        console.error('Ошибка при сбросе счетчика:', error);
        alert(error.response?.data?.detail || 'Ошибка при сбросе счетчика');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="timer-widget">
      <div className="timer-modes">
        <button
          className={`mode-btn ${timer.mode === 'work' ? 'active' : ''}`}
          onClick={() => handleModeChange('work')}
        >
          Помодоро
        </button>
        <button
          className={`mode-btn ${timer.mode === 'short_break' ? 'active' : ''}`}
          onClick={() => handleModeChange('short_break')}
        >
          Короткий<br />перерыв
        </button>
        <button
          className={`mode-btn ${timer.mode === 'long_break' ? 'active' : ''}`}
          onClick={() => handleModeChange('long_break')}
        >
          Длинный<br />перерыв
        </button>
      </div>

      <div className="timer-display">
        <div className="timer-time">{formatTime(timer.timeLeft)}</div>
      </div>

      <div className="timer-controls">
        <button onClick={handleToggleTimer} disabled={isLoading} className="timer-btn">
          {timer.isRunning ? 'СТОП' : 'СТАРТ'}
        </button>
      </div>
    </div>
  );
};

export default TimerWidget;
