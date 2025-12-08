import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import './AuthForms.css';

import logo from '../assets/images/logo.png';

const Login = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    code: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    if (location.state?.email) {
      setFormData(prev => ({ ...prev, email: location.state.email }));
      setStep(2);
    }
    if (location.state?.message) {
      setMessage(location.state.message);
    }
  }, [location]);

  const validateEmail = () => {
    if (!formData.email) {
      setErrors({ email: 'Email обязателен' });
      return false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: 'Некорректный формат email' });
      return false;
    }
    setErrors({});
    return true;
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) return;

    setIsLoading(true);
    try {
      await authAPI.login({ email: formData.email });
      setStep(2);
      setErrors({});
      setMessage(`Код отправлен на ${formData.email}`);
    } catch (error) {
      console.error('Ошибка при отправке кода:', error);
      setErrors({ 
        submit: error.response?.data?.detail || 'Произошла ошибка при отправке кода. Попробуйте еще раз.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.code) {
      setErrors({ code: 'Код обязателен' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await authAPI.verifyLogin({
        email: formData.email,
        code: formData.code
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
      console.error('Ошибка при входе:', error);
      if (error.response && error.response.status === 400) {
        setErrors({ 
          code: error.response.data.detail || 'Неверный код подтверждения' 
        });
      } else if (error.response && error.response.status === 404) {
        setErrors({ 
          submit: 'Пользователь не найден. Зарегистрируйтесь сначала.' 
        });
      } else {
        setErrors({ 
          submit: error.response?.data?.detail || 'Произошла ошибка при входе. Попробуйте еще раз.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
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

  const handleRegisterClick = () => {
    navigate('/register');
  };

 return (
     <div className="auth-container">
       {/* Логотип */}
       <div className="auth-logo">
         <img src={logo} alt="Pomodoro Timer" className="auth-logo-image" />
       </div>
 
       {/* Заголовок над формой */}
       <h1 className="auth-title">Вход в аккаунт</h1>
       
       {message && <div className="success-message">{message}</div>}
 
       <div className="auth-form">
         {step === 1 ? (
           <form onSubmit={handleEmailSubmit}>
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
               className="submit-btn"
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
               className="submit-btn"
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
         onClick={handleRegisterClick}
       >
         Нет аккаунта
       </button>
     </div>
   );
 };
 
 export default Login;