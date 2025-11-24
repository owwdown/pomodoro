import axios from 'axios';

const API_BASE_URL = '';

const mockUsers = [];
const mockStatistics = [
  { date: '2024-01-15', completedPomodoros: 8, focusTime: 120 },
  { date: '2024-01-16', completedPomodoros: 6, focusTime: 90 },
  { date: '2024-01-17', completedPomodoros: 10, focusTime: 150 },
  { date: '2024-01-18', completedPomodoros: 7, focusTime: 105 },
  { date: '2024-01-19', completedPomodoros: 9, focusTime: 135 },
];

let currentTimer = {
  isRunning: false,
  timeLeft: 25 * 60,
  mode: 'pomodoro'
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (data) => {
    await delay(1000);
    
    const existingUser = mockUsers.find(user => user.email === data.email);
    if (existingUser) {
      throw {
        response: {
          status: 400,
          data: { message: 'Пользователь с таким email уже существует' }
        }
      };
    }

    const newUser = {
      id: Date.now(),
      ...data,
      createdAt: new Date().toISOString()
    };
    mockUsers.push(newUser);

    console.log('Зарегистрирован пользователь:', newUser);
    return { data: { success: true } };
  },

  login: async (data) => {
    await delay(1000);
    
    console.log('Отправлен код для email:', data.email);
    return { data: { success: true } };
  },

  verify: async (data) => {
    await delay(1000);
    
    if (data.code) {
      const user = mockUsers.find(u => u.email === data.email) || {
        id: Date.now(),
        email: data.email,
        name: data.email.split('@')[0]
      };
      
      const token = 'mock-jwt-token-' + Date.now();
      
      console.log('Успешный вход:', user);
      
      return { 
        data: { 
          token,
          user 
        } 
      };
    }
    
    throw {
      response: {
        status: 400,
        data: { message: 'Неверный код подтверждения' }
      }
    };
  },
};

export const timerAPI = {
  getCurrent: async () => {
    await delay(500);
    return { data: currentTimer };
  },

  start: async () => {
    await delay(500);
    currentTimer.isRunning = true;
    console.log('Таймер запущен');
    return { data: { success: true } };
  },

  stop: async () => {
    await delay(500);
    currentTimer.isRunning = false;
    console.log('Таймер остановлен');
    return { data: { success: true } };
  },
};

export const statisticsAPI = {
  get: async (params) => {
    await delay(800);
    
    const filteredStats = mockStatistics.filter(stat => {
      const statDate = new Date(stat.date);
      const fromDate = new Date(params.from);
      const toDate = new Date(params.to);
      return statDate >= fromDate && statDate <= toDate;
    });

    return { data: filteredStats };
  },
};

export default api;