import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './RegisterConfirm.css';
import logo from '../assets/images/logo.png';

const RegisterConfirm = () => {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const email = location.state?.email || '';

  const validateCode = () => {
    if (!code) {
      setErrors({ code: 'Код обязателен' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (e) => {
    setCode(e.target.value);
    if (errors.code) {
      setErrors({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCode()) return;

    setIsLoading(true);
    try {
      const response = await authAPI.verify({
        email: email,
        code: code
      });
      
      if (response.data.token && response.data.user) {
        login(response.data.token, response.data.user);
        navigate('/');
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setErrors({ code: 'Неверный код подтверждения' });
      } else {
        setErrors({ 
          submit: 'Произошла ошибка при подтверждении кода. Попробуйте еще раз.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/register');
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <img src={logo} alt="Pomodoro Timer" className="auth-logo-image" />
      </div>

      <h1 className="auth-title">Подтверждение аккаунта</h1>

      <div className="auth-form">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="code">Введите код</label>
            <input
              type="text"
              id="code"
              name="code"
              value={code}
              onChange={handleChange}
              className={errors.code ? 'error' : ''}
              placeholder="Введите код из письма"
            />
            {errors.code && <span className="error-text">{errors.code}</span>}
          </div>

          {errors.submit && <div className="error-text submit-error">{errors.submit}</div>}

          <button 
            type="submit" 
            className="submit-btn narrow-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Подтверждение...' : 'Подтвердить'}
          </button>

          <button 
            type="button" 
            className="secondary-btn narrow-btn"
            onClick={handleBack}
            disabled={isLoading}
          >
            Назад к регистрации
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterConfirm;