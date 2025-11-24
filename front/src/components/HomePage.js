import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import TimerWidget from './TimerWidget';
import StatisticsModal from './StatisticsModal';
import './HomePage.css';

import logo from '../assets/images/logo.png';

const HomePage = () => {
  const [showStatistics, setShowStatistics] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="home-page">
      <div className="logo">
        <img src={logo} alt="Pomodoro Timer" className="logo-image" />
      </div>

      <nav className="top-nav">
        <button className="nav-btn">Настройки</button>
        <button 
          className="nav-btn"
          onClick={() => setShowStatistics(true)}
        >
          Статистика
        </button>
        <button className="nav-btn">
          Профиль
        </button>
      </nav>

      <div className="main-content">
        <TimerWidget />
      </div>

      {showStatistics && (
        <StatisticsModal onClose={() => setShowStatistics(false)} />
      )}
    </div>
  );
};

export default HomePage;