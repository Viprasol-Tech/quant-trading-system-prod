import axios, { AxiosInstance } from 'axios';

// Axios instance configured to proxy to backend on port 6005
export const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:6005/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - check Alpaca credentials');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
