import axios from 'axios';
import { SchedulePayload, EmailItem, SlackStatus, User } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  getMe: async (): Promise<{ user: User }> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  demoLogin: async (email?: string, name?: string): Promise<{ user: User; token: string }> => {
    const res = await api.post('/auth/demo', { email, name });
    return res.data;
  },
  verifyGoogleToken: async (idToken: string): Promise<{ user: User; token: string }> => {
    const res = await api.post('/auth/google/verify', { idToken });
    return res.data;
  },
  getGmailStatus: async (): Promise<{ connected: boolean; email?: string }> => {
    const res = await api.get('/auth/gmail/status');
    return res.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};

export const emailApi = {
  sendNowEmail: async (payload: { subject: string; body: string; sender?: string; recipients: string[] }) => {
    const res = await api.post('/emails/send-now', payload);
    return res.data;
  },
  scheduleEmail: async (payload: SchedulePayload) => {
    const res = await api.post('/emails/schedule', payload);
    return res.data;
  },
  getScheduledEmails: async (): Promise<{ count: number; emails: EmailItem[] }> => {
    const res = await api.get('/emails/scheduled');
    return res.data;
  },
  getSentEmails: async (): Promise<{ count: number; emails: EmailItem[] }> => {
    const res = await api.get('/emails/sent');
    return res.data;
  },
  getEmailById: async (id: string): Promise<{ email: EmailItem }> => {
    const res = await api.get(`/emails/${id}`);
    return res.data;
  },
  searchEmails: async (q: string, status?: string): Promise<{ results: EmailItem[] }> => {
    const res = await api.get('/emails/search', { params: { q, status } });
    return res.data;
  },
};

export const slackApi = {
  getStatus: async (): Promise<SlackStatus> => {
    const res = await api.get('/slack/status');
    return res.data;
  },
  disconnect: async (): Promise<{ connected: boolean }> => {
    const res = await api.post('/slack/disconnect');
    return res.data;
  },
  mockConnect: async (): Promise<{ connection: any }> => {
    const res = await api.post('/slack/mock-connect');
    return res.data;
  },
};
