import React, { useState } from 'react';
import './StatisticsModal.css';

const StatisticsModal = ({ onClose }) => {
  const [currentMonth, setCurrentMonth] = useState('Окт');
  
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  
  const currentMonthIndex = months.indexOf(currentMonth);
  
  const handlePrevMonth = () => {
    const prevIndex = (currentMonthIndex - 1 + months.length) % months.length;
    setCurrentMonth(months[prevIndex]);
  };
  
  const handleNextMonth = () => {
    const nextIndex = (currentMonthIndex + 1) % months.length;
    setCurrentMonth(months[nextIndex]);
  };

  const chartData = [
    { value: 120 },
    { value: 90 },
    { value: 150 },
    { value: 80 },
    { value: 200 },
    { value: 60 },
    { value: 180 }
  ];

  const maxValue = Math.max(...chartData.map(item => item.value));

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
          <div className="time-today">Сегодня: 82 минуты</div>
          <div className="time-total">Всего: 254 минуты</div>
        </div>

        {/* Переключение месяцев */}
        <div className="month-selector">
          <button className="month-arrow" onClick={handlePrevMonth}>◀</button>
          <span className="current-month">{currentMonth}</span>
          <button className="month-arrow" onClick={handleNextMonth}>▶</button>
        </div>

        {/* Столбчатая диаграмма */}
        <div className="chart-container">
          {/* Вертикальная белая полоса с цифрами */}
          <div className="chart-scale">
            <div className="scale-line"></div>
            <div className="scale-label-120">120</div>
            <div className="scale-label-60">60</div>
            <div className="scale-label-0">0</div>
          </div>
          
          <div className="chart">
            {chartData.map((item, index) => (
              <div key={index} className="chart-bar-container">
                <div 
                  className="chart-bar"
                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                ></div>
                {}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;