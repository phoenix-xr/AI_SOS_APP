import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();
let useMemoryFallback = false;

export const safeStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!useMemoryFallback) {
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        // Fall back gracefully if native module has not been compiled into debug APK yet
        useMemoryFallback = true;
        console.warn('AsyncStorage native module not linked yet. Using in-memory fallback until app is rebuilt.');
      }
    }
    return memoryStore.get(key) || null;
  },

  async setItem(key: string, value: string): Promise<void> {
    memoryStore.set(key, value);
    if (!useMemoryFallback) {
      try {
        await AsyncStorage.setItem(key, value);
      } catch {
        useMemoryFallback = true;
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    memoryStore.delete(key);
    if (!useMemoryFallback) {
      try {
        await AsyncStorage.removeItem(key);
      } catch {
        useMemoryFallback = true;
      }
    }
  },

  async clearAll(): Promise<void> {
    memoryStore.clear();
    if (!useMemoryFallback) {
      try {
        await AsyncStorage.clear();
      } catch {
        useMemoryFallback = true;
      }
    }
  },
};
