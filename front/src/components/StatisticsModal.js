import React, { useState, useEffect } from 'react';
import { statisticsAPI } from '../services/api';
import './StatisticsModal.css';

const StatisticsModal = ({ onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [statistics, setStatistics] = useState([]);
  const [summary, setSummary] = useState({ 
    today_minutes: 0, 
    total_minutes: 0,
    today_pomodoros: 0,
    total_pomodoros: 0,
    average_daily_minutes: 0,
    current_streak_days: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  
  useEffect(() => {
    fetchStatistics();
  }, [currentMonth, currentYear]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchStatistics = async () => {
    try {
      const dateFrom = new Date(currentYear, currentMonth, 1);
      const dateTo = new Date(currentYear, currentMonth + 1, 0);
      
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };
      
      const response = await statisticsAPI.get({
        params: {
          date_from: formatDate(dateFrom),
          date_to: formatDate(dateTo)
        }
      });
      
      if (response.data?.statistics) {
        setStatistics(response.data.statistics);
      } else {
        setStatistics([]);
      }
    } catch (error) {
      console.error('Ошибка при получении статистики:', error);
      setStatistics([]);
    } 
  };

  const fetchSummary = async () => {
    try {
      const response = await statisticsAPI.getSummary();
      if (response.data?.summary) {
        setSummary(response.data.summary);
      }
    } catch (error) {
      console.error('Ошибка при получении сводной статистики:', error);
      calculateSummaryFromStats();
    }
  };

  const calculateSummaryFromStats = () => {
    const todayLocal = new Date();
    todayLocal.setMinutes(todayLocal.getMinutes() - todayLocal.getTimezoneOffset());
    const today = todayLocal.toISOString().split("T")[0];
    let todayFocus = 0;
    let totalFocus = 0;
    let todayPomodoros = 0;
    let totalPomodoros = 0;

    statistics.forEach(stat => {
      totalFocus += stat.totalFocusTime || 0;
      totalPomodoros += stat.completedPomodoros || 0;
      if (stat.date === today) {
        todayFocus = stat.totalFocusTime || 0;
        todayPomodoros = stat.completedPomodoros || 0;
      }
    });

    setSummary(prev => ({
      ...prev,
      today_minutes: todayFocus,
      total_minutes: totalFocus,
      today_pomodoros: todayPomodoros,
      total_pomodoros: totalPomodoros
    }));
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  };

  const generateChartData = () => {
    const daysInMonth = getDaysInMonth();
    const chartData = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stat = statistics.find(s => s.date === dateStr);
      
      chartData.push({
        day: day,
        value: stat?.totalFocusTime || 0,
        pomodoros: stat?.completedPomodoros || 0,
        date: dateStr,
       dayOfWeek: new Date(currentYear, currentMonth, day).getDay()
      });
    }
    
    return chartData;
  };

  const chartData = generateChartData();
  
  const maxValue = Math.max(...chartData.map(item => item.value), 1);
  
  const niceScale = (value) => {
    if (value <= 30) return 30;
    if (value <= 60) return 60;
    if (value <= 120) return 120;
    if (value <= 180) return 180;
    if (value <= 240) return 240;
    return Math.ceil(value / 60) * 60;
  };

  const scaleMax = niceScale(maxValue);

  
  const formatMinutes = (minutes) => {
    if (minutes < 60) {
      return `${minutes} мин`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}ч ${mins > 0 ? `${mins}м` : ''}`.trim();
    }
  };

  const scaleLabels = [
  0,
  Math.round(scaleMax / 2),
  scaleMax
];

  const getDayOfWeek = (dayIndex) => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[dayIndex];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="statistics-modal" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div className="modal-header">
          <h2>Статистика</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {/* Блок времени */}
        <div className="time-section">
          <div className="time-today">
            Сегодня: {formatMinutes(summary.today_minutes)}
          </div>

          <div className="time-total">
            Всего: {formatMinutes(summary.total_minutes)}
          </div>
        </div>

        {/* Переключение месяцев */}
        <div className="month-selector">
          <button className="month-arrow" onClick={handlePrevMonth}>◀</button>
          <span className="current-month">{months[currentMonth]}</span>
          <button className="month-arrow" onClick={handleNextMonth}>▶</button>
        </div>

        {/* Столбчатая диаграмма */}
        <div className="chart-container">
          {/* Вертикальная белая полоса с цифрами */}
          <div className="chart-scale">
            <div className="scale-line"></div>
            <div className="scale-label-top">{scaleLabels[2]}</div>
            <div className="scale-label-mid">{scaleLabels[1]}</div>
            <div className="scale-label-bottom">{scaleLabels[0]}</div>

          </div>
          
          <div className="chart">
            {chartData.map((item, index) => (
              <div key={index} className="chart-bar-container">
                <div 
                  className="chart-bar"
                  style={{ height: `${(item.value / scaleMax) * 100}%` }}
                ></div>
                <div className="chart-bar-label">{item.day}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;