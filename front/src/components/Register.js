import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Register.css';
import logo from '../assets/images/logo.png';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authAPI.register(formData);
      
      if (response.data.success) {
        navigate('/register-confirm', { 
          state: { 
            email: formData.email
          }
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setErrors({ 
          email: 'Пользователь с таким email уже существует' 
        });
      } else {
        setErrors({ 
          submit: 'Произошла ошибка при регистрации. Попробуйте еще раз.' 
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
      <div className="auth-logo">
        <img src={logo} alt="Pomodoro Timer" className="auth-logo-image" />
      </div>

      <h1 className="auth-title">Создание аккаунта</h1>

      <div className="auth-form">
        <form onSubmit={handleSubmit}>
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
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>

      <button 
        className="register-btn"
        onClick={handleLoginClick}
      >
        Нет аккаунта
      </button>
    </div>
  );
};

export default Register;