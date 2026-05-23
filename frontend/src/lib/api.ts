import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor — JWT token inject karo
api.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    // @ts-ignore - NextAuth types might need augmentation for accessToken
    if (session?.accessToken) {
      // @ts-ignore
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    } else {
      console.warn('[API] No accessToken found in session — request will be unauthenticated.');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor — 401 ko clearly log karo
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('[API] 401 Unauthorized — Token missing ya expire ho gaya. Backend URL:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default api;
