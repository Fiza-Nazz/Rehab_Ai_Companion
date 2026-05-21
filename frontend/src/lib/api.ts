import axios from 'axios';
import { getSession } from 'next-auth/react';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor to inject the JWT token
api.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    // @ts-ignore - NextAuth types might need augmentation for accessToken
    if (session?.accessToken) {
      // @ts-ignore
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
