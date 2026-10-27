import { Platform } from 'react-native';
import { storage } from './storage';

export const DEFAULT_BASE_URL = 'https://ai-sos-app-backend-h-blush.vercel.app/api/v1';

let currentBaseUrl = DEFAULT_BASE_URL;

// Initialize custom URL if previously saved, ignoring legacy localhost entries
storage.getCustomBaseUrl().then(saved => {
  if (saved && !saved.includes('localhost') && !saved.includes('10.0.2.2')) {
    currentBaseUrl = saved;
  } else {
    currentBaseUrl = DEFAULT_BASE_URL;
    if (saved) {
      storage.saveCustomBaseUrl(DEFAULT_BASE_URL);
    }
  }
});

export const apiConfig = {
  getBaseUrl(): string {
    return currentBaseUrl;
  },
  async setBaseUrl(url: string): Promise<void> {
    currentBaseUrl = url.trim().replace(/\/+$/, '');
    await storage.saveCustomBaseUrl(currentBaseUrl);
  },
  async resetBaseUrl(): Promise<void> {
    currentBaseUrl = DEFAULT_BASE_URL;
    await storage.saveCustomBaseUrl(DEFAULT_BASE_URL);
  },
};

export interface User {
  id: string | number;
  username: string;
  email: string;
  full_name?: string | null;
  role?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface HealthResponse {
  status: string;
  database: string;
  version: string;
  timestamp: string;
}

async function fetchWithFallback(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    // If localhost failed on Android, fallback to emulator 10.0.2.2 or vice versa
    if (Platform.OS === 'android') {
      if (url.includes('localhost:8000')) {
        const fallbackUrl = url.replace('localhost:8000', '10.0.2.2:8000');
        return await fetch(fallbackUrl, init);
      } else if (url.includes('10.0.2.2:8000')) {
        const fallbackUrl = url.replace('10.0.2.2:8000', 'localhost:8000');
        return await fetch(fallbackUrl, init);
      }
    }
    throw err;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const url = `${currentBaseUrl}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const authToken = token !== undefined ? token : await storage.getToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetchWithFallback(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      let errorMessage = 'Network error';
      if (typeof data === 'object' && data !== null) {
        if (typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
          errorMessage = data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
        } else if (data.message) {
          errorMessage = data.message;
        }
      } else if (typeof data === 'string' && data.length > 0) {
        errorMessage = data;
      }
      throw new Error(errorMessage || `Request failed with status ${response.status}`);
    }

    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Connection timed out. Ensure the backend server is reachable.');
    }
    if (error.message === 'Network request failed') {
      throw new Error(
        `Unable to reach backend at ${currentBaseUrl}. Make sure the FastAPI backend is running.`
      );
    }
    throw error;
  }
}

export const api = {
  async register(payload: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async getMe(token?: string): Promise<User> {
    return request<User>('/auth/me', { method: 'GET' }, token);
  },

  async checkHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health', { method: 'GET' });
  },
};
