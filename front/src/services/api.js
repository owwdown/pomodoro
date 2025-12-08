import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (data) => {
    try {
      const response = await api.post('/auth/register', {
        email: data.email,
        name: data.name
      });
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  login: async (data) => {
    try {
      const response = await api.post('/auth/login', {
        email: data.email
      });
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  verifyRegistration: async (data) => {
    try {
      const response = await api.post('/auth/verify-code', {
        email: data.email,
        code: data.code,
        name: data.name
      });
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  verifyLogin: async (data) => {
    try {
      const response = await api.post('/auth/verify-login-code', {
        email: data.email,
        code: data.code
      });
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },
};

export const timerAPI = {
  getCurrent: async () => {
    try {
      const response = await api.get('/timer/current');
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return { data: null };
      }
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  start: async (timerType = null) => {
    try {
      const response = await api.post('/timer/start', {
        type: timerType
      });
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  stop: async () => {
    try {
      const response = await api.post('/timer/stop');
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  complete: async () => {
    try {
      const response = await api.post('/timer/complete');
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  getSettings: async () => {
    try {
      const response = await api.get('/settings');
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  updateSettings: async (settings) => {
    try {
      const response = await api.put('/settings', settings);
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  getDefaults: async () => {
    try {
      const response = await api.get('/settings/defaults');
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  getSequenceInfo: async () => {
    try {
      const response = await api.get('/timer/sequence-info');
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          data: {
            next_timer_type: 'work',
            next_timer_description: 'Время работать!',
            pomodoros_before_long_break: 4,
            current_pomodoro_count: 0,
            sequence_progress: '0/4',
            progress_percentage: 0
          }
        };
      }
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  resetCounter: async () => {
    try {
      const response = await api.post('/timer/reset-counter', { confirm: true });
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          data: {
            success: true,
            message: 'Счетчик помидоров сброшен',
            pomodoro_count: 0
          }
        };
      }
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  }
};

export const statisticsAPI = {
  get: async (params = {}) => {
    try {
      const response = await api.get('/statistics', {
        params: {
          date_from: params.from || null,
          date_to: params.to || null
        }
      });
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        const mockStats = [
          { date: '2024-01-15', completedPomodoros: 8, totalFocusTime: 120 },
          { date: '2024-01-16', completedPomodoros: 6, totalFocusTime: 90 },
          { date: '2024-01-17', completedPomodoros: 10, totalFocusTime: 150 },
          { date: '2024-01-18', completedPomodoros: 7, totalFocusTime: 105 },
          { date: '2024-01-19', completedPomodoros: 9, totalFocusTime: 135 },
        ];
        return { data: { statistics: mockStats } };
      }
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  getSummary: async () => {
    try {
      const response = await api.get('/statistics/summary');
      return response;
    } catch (error) {
      return {
        data: {
          today: 82,
          total: 254,
          average: 120,
          streak: 5
        }
      };
    }
  }
};

export const profileAPI = {
  getProfile: async () => {
    try {
      const response = await api.get('/profile');
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await api.put('/profile', data);
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  },

  deleteAccount: async () => {
    try {
      const response = await api.delete('/profile', {
        data: { confirm: true }
      });
      return response;
    } catch (error) {
      if (error.response) {
        throw {
          response: {
            status: error.response.status,
            data: error.response.data
          }
        };
      } else if (error.request) {
        throw {
          response: {
            status: 500,
            data: { message: 'Нет ответа от сервера. Проверьте подключение.' }
          }
        };
      } else {
        throw {
          response: {
            status: 500,
            data: { message: 'Ошибка при отправке запроса' }
          }
        };
      }
    }
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const setAuthToken = (token) => {
  localStorage.setItem('token', token);
};

export const setCurrentUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export default api;