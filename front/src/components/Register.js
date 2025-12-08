import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './AuthForms.css';

import logo from '../assets/images/logo.png';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    code: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Имя обязательно';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Некорректный формат email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCode = () => {
    if (!formData.code) {
      setErrors({ code: 'Код обязателен' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authAPI.register(formData);
      
      if (response.data.success) {
        setStep(2);
        setErrors({});
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setErrors({ 
          email: error.response.data.detail || 'Пользователь с таким email уже существует' 
        });
      } else {
        setErrors({ 
          submit: error.response?.data?.detail || 'Произошла ошибка при регистрации. Попробуйте еще раз.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateCode()) return;

    setIsLoading(true);
    try {
      const response = await authAPI.verifyRegistration({
        email: formData.email,
        code: formData.code,
        name: formData.name
      });
      
      if (response.data.access_token) {
        const user = {
          id: response.data.user_id,
          email: response.data.email,
          name: response.data.name
        };
        
        login(response.data.access_token, user);
        navigate('/');
      }
    } catch (error) {
      console.error('Ошибка при подтверждении регистрации:', error);
      if (error.response && error.response.status === 400) {
        setErrors({ 
          code: error.response.data.detail || 'Неверный код подтверждения' 
        });
      } else {
        setErrors({ 
          submit: error.response?.data?.detail || 'Произошла ошибка при подтверждении кода. Попробуйте еще раз.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
      <div className="auth-container">
        {/* Логотип */}
        <div className="auth-logo">
          <img src={logo} alt="Pomodoro Timer" className="auth-logo-image" />
        </div>
  
        {/* Заголовок над формой */}
        <h1 className="auth-title">
          {step === 1 ? 'Создание аккаунта' : 'Подтверждение аккаунта'}
        </h1>
  
        <div className="auth-form">
          {step === 1 ? (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label htmlFor="name">Введите ваше имя</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? 'error' : ''}
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
  
              <div className="form-group">
                <label htmlFor="email">Введите ваш Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
  
              {errors.submit && <div className="error-text submit-error">{errors.submit}</div>}
  
              <button 
                type="submit" 
                className="submit-btn narrow-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Отправка...' : 'Получить код'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit}>
              <div className="form-group">
                <label htmlFor="code">Введите код</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className={errors.code ? 'error' : ''}
                />
                {errors.code && <span className="error-text">{errors.code}</span>}
              </div>
  
              {errors.submit && <div className="error-text submit-error">{errors.submit}</div>}
  
              <button 
                type="submit" 
                className="submit-btn narrow-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Отправка...' : 'Отправить код'}
              </button>
            </form>
          )}
        </div>
  
        {/* Кнопка "Нет аккаунта" */}
        <button 
          className="register-btn"
          onClick={handleLoginClick}
        >
          Аккаунт есть
        </button>
      </div>
    );
  };
  
  export default Register;