import { safeStorage } from './safeStorage';

const TOKEN_KEY = '@healthm_access_token';
const USER_KEY = '@healthm_user_data';
const BASE_URL_KEY = '@healthm_api_base_url';

export const storage = {
  async saveToken(token: string): Promise<void> {
    try {
      await safeStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.error('Failed to save auth token', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      return await safeStorage.getItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to get auth token', e);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      await safeStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove auth token', e);
    }
  },

  async saveUser(user: any): Promise<void> {
    try {
      await safeStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user data', e);
    }
  },

  async getUser<T = any>(): Promise<T | null> {
    try {
      const data = await safeStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to get user data', e);
      return null;
    }
  },

  async removeUser(): Promise<void> {
    try {
      await safeStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('Failed to remove user data', e);
    }
  },

  async saveCustomBaseUrl(url: string): Promise<void> {
    try {
      await safeStorage.setItem(BASE_URL_KEY, url);
    } catch (e) {
      console.error('Failed to save custom base url', e);
    }
  },

  async getCustomBaseUrl(): Promise<string | null> {
    try {
      return await safeStorage.getItem(BASE_URL_KEY);
    } catch {
      return null;
    }
  },

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        safeStorage.removeItem(TOKEN_KEY),
        safeStorage.removeItem(USER_KEY),
      ]);
    } catch (e) {
      console.error('Failed to clear auth storage', e);
    }
  },
};
