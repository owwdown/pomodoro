import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import TimerWidget from './TimerWidget';
import StatisticsModal from './StatisticsModal';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';
import './HomePage.css';
import logo from '../assets/images/logo.png';

const HomePage = () => {
  const [showStatistics, setShowStatistics] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentTimer, setCurrentTimer] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

 return (
    <div className="home-page">
      <div className="logo">
        <img src={logo} alt="Pomodoro Timer" className="logo-image" />
      </div>

      <nav className="top-nav">
        <button 
          className="nav-btn"
          onClick={() => setShowSettings(true)}
        >
          Настройки
        </button>
        <button 
          className="nav-btn"
          onClick={() => setShowStatistics(true)}
        >
          Статистика
        </button>
        <button 
          className="nav-btn"
          onClick={() => setShowProfile(true)}
        >
          Профиль
        </button>
      </nav>

      <div className="main-content">
        <TimerWidget />
      </div>

      {showStatistics && (
        <StatisticsModal onClose={() => setShowStatistics(false)} />
      )}
      
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
      
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default HomePage;