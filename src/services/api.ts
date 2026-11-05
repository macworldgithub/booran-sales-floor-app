import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Lead,
  Vehicle,
  ActionItem,
  Rooftop,
  FeedLog,
  CsvSyncResult,
  Appointment,
  StaffMember,
  UnifiedSummary,
  CustomerMedia,
  CustomerMessage,
  CustomerMessageHistory,
  PageMetadata,
  AuthUser,
} from '../types';

export const PRODUCTION_URL = 'https://booran-sales-floor-backend.vercel.app/api';
const DEFAULT_URL = PRODUCTION_URL;

const STORAGE_KEY_API_URL = '@booran_api_url';
const STORAGE_KEY_SESSION = '@booran_session_token';
const STORAGE_KEY_USER = '@booran_user';

let currentBaseUrl: string = DEFAULT_URL;
let currentSessionToken: string | null = null;
let onUnauthorizedCallback: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void) {
  onUnauthorizedCallback = callback;
}

export async function initApiService(): Promise<{ url: string; token: string | null; user: AuthUser | null }> {
  try {
    const savedUrl = await AsyncStorage.getItem(STORAGE_KEY_API_URL);
    if (savedUrl) {
      currentBaseUrl = savedUrl;
    } else {
      currentBaseUrl = DEFAULT_URL;
    }
    const token = await AsyncStorage.getItem(STORAGE_KEY_SESSION);
    if (token) {
      currentSessionToken = token;
    }
    const userJson = await AsyncStorage.getItem(STORAGE_KEY_USER);
    const user = userJson ? JSON.parse(userJson) : null;
    return { url: currentBaseUrl, token, user };
  } catch (err) {
    console.error('Error initializing API service:', err);
    return { url: currentBaseUrl, token: null, user: null };
  }
}

export async function setApiBaseUrl(url: string) {
  currentBaseUrl = url.trim().replace(/\/+$/, '');
  await AsyncStorage.setItem(STORAGE_KEY_API_URL, currentBaseUrl);
}

export function getApiBaseUrl(): string {
  return currentBaseUrl;
}

export async function setSessionToken(token: string | null) {
  currentSessionToken = token;
  if (token) {
    await AsyncStorage.setItem(STORAGE_KEY_SESSION, token);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY_SESSION);
  }
}

export async function setStoredUser(user: AuthUser | null) {
  if (user) {
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY_USER);
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; pagination?: PageMetadata; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (currentSessionToken) {
    headers['Cookie'] = `booran_session=${currentSessionToken}`;
    headers['Authorization'] = `Bearer ${currentSessionToken}`;
  }

  const url = `${currentBaseUrl}${endpoint}`;
  try {
    const response = await fetch(url, {
      credentials: 'include',
      ...options,
      headers,
    });

    // Check Set-Cookie for booran_session across various fetch polyfill formats
    try {
      let cookieStr = response.headers.get('set-cookie') || '';
      if (!cookieStr && typeof (response.headers as any).getSetCookie === 'function') {
        const cookies = (response.headers as any).getSetCookie();
        cookieStr = Array.isArray(cookies) ? cookies.join('; ') : '';
      }
      if (!cookieStr && (response.headers as any).map) {
        cookieStr = (response.headers as any).map['set-cookie'] || '';
      }
      if (cookieStr) {
        const match = cookieStr.match(/booran_session=([a-f0-9]{64})/);
        if (match && match[1]) {
          await setSessionToken(match[1]);
        }
      }
    } catch {
      // Header inspection safe ignore
    }

    const json = await response.json().catch(() => null);

    if (response.status === 401 && endpoint !== '/auth/login') {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }

    if (!response.ok || json?.success === false) {
      const errorMsg = json?.message || json?.error || `Request failed (${response.status}). Please retry.`;
      const error: any = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    if (!json || json.success !== true) {
      throw new Error('The server returned an invalid response. Please retry.');
    }

    return json;
  } catch (err: any) {
    console.warn(`API Error [${options.method || 'GET'}] ${endpoint}:`, err?.message || err);
    throw err;
  }
}

// ─── AUTH ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (email: string, password?: string) => {
    const res = await fetchApi<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // In addition to cookie, if token was returned in data
    if (res.data?.token) {
      await setSessionToken(res.data.token);
    }
    if (res.data?.user) {
      await setStoredUser(res.data.user);
    }
    return res;
  },
  me: () => fetchApi<AuthUser>('/auth/me'),
  logout: async () => {
    try {
      await fetchApi('/auth/logout', { method: 'POST' });
    } finally {
      await setSessionToken(null);
      await setStoredUser(null);
    }
  },
};

// ─── CRM & LEADS ─────────────────────────────────────────────────────────────
export const leadApi = {
  getLeads: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Lead[]>(`/leads${query}`);
  },
  getLead: (id: string) => fetchApi<Lead>(`/leads/${encodeURIComponent(id)}`),
  createLead: (data: Partial<Lead>) =>
    fetchApi<Lead>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Partial<Lead>) =>
    fetchApi<Lead>(`/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addNote: (id: string, note: string, author?: string) =>
    fetchApi<Lead>(`/leads/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ newNote: note, author }),
    }),
  getCrmStats: () => fetchApi<any>('/crm/stats'),
  getCrmRooftops: (rooftop?: string) =>
    fetchApi<Rooftop[]>(`/crm/rooftops?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  getOrganization: () => fetchApi<any>('/crm/organization'),
  syncFlwup: (options?: { rooftop_id?: string; token?: string }) =>
    fetchApi<any>('/leads/sync-flwup', { method: 'POST', body: JSON.stringify(options || {}) }),
};

// ─── CUSTOMER MESSAGES (SMS) ─────────────────────────────────────────────────
export const customerMessageApi = {
  history: (id: string, page = 1) =>
    fetchApi<CustomerMessageHistory>(`/leads/${encodeURIComponent(id)}/messages?page=${page}`),
  media: (id: string) => fetchApi<CustomerMedia[]>(`/leads/${encodeURIComponent(id)}/media`),
  send: (id: string, data: { body: string; media_ids: string[]; request_id: string }) =>
    fetchApi<CustomerMessage>(`/leads/${encodeURIComponent(id)}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── INVENTORY & CAPITAL RADAR ──────────────────────────────────────────────
export const inventoryApi = {
  getVehicles: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Vehicle[]>(`/inventory/vehicles${query}`);
  },
  getVehicle: (id: string) => fetchApi<Vehicle>(`/inventory/vehicles/${encodeURIComponent(id)}`),
  softHold: (id: string, payload: { prospectName: string; notes?: string; consultant?: string }) =>
    fetchApi<any>(`/inventory/vehicles/${encodeURIComponent(id)}/soft-hold`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  releaseHold: (id: string, expected: { holdId?: string; heldAt?: string }) =>
    fetchApi<Vehicle>(`/inventory/vehicles/${encodeURIComponent(id)}/release-hold`, {
      method: 'POST',
      body: JSON.stringify(expected),
    }),
  getActionItems: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .filter(([_, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<ActionItem[]>(`/inventory/action-items${query}`);
  },
  updateActionItem: (id: string, data: { status: string; resolvedNotes?: string }) =>
    fetchApi<any>(`/inventory/action-items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getInventoryRooftops: (rooftop?: string) =>
    fetchApi<Rooftop[]>(`/inventory/rooftops?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  getInventoryStats: () => fetchApi<any>('/inventory/stats'),
  getFeedLogs: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<FeedLog[]>(`/inventory/feed-logs${query}`);
  },
  syncCsv: () => fetchApi<CsvSyncResult>('/inventory/sync-csv', { method: 'POST' }),
};

// ─── APPOINTMENTS ────────────────────────────────────────────────────────────
export const appointmentApi = {
  getAppointments: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' +
        Object.entries(params)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return fetchApi<Appointment[]>(`/appointments${query}`);
  },
  createAppointment: (data: Partial<Appointment>) =>
    fetchApi<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── STAFF ───────────────────────────────────────────────────────────────────
export const staffApi = {
  getStaff: (rooftop?: string) =>
    fetchApi<StaffMember[]>(`/staff?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
};

// ─── UNIFIED DASHBOARD & SEARCH ──────────────────────────────────────────────
export const unifiedApi = {
  getSummary: (rooftop?: string) =>
    fetchApi<UnifiedSummary>(`/unified/summary?rooftop=${encodeURIComponent(rooftop || 'All Locations')}`),
  search: (query: string, rooftop?: string) =>
    fetchApi<{ leads: Lead[]; vehicles: Vehicle[]; actionItems: ActionItem[] }>(
      `/unified/search?q=${encodeURIComponent(query)}&rooftop=${encodeURIComponent(rooftop || 'All Locations')}`
    ),
};

