import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '@/types';

const ACCESS_TOKEN_KEY = 'smartquote_access_token';
const REFRESH_TOKEN_KEY = 'smartquote_refresh_token';
const USER_KEY = 'smartquote_user_profile';

// In-memory fallback for web environment where native SecureStore is unavailable
const memoryStorage = new Map<string, string>();

async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key) ?? memoryStorage.get(key) ?? null;
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    memoryStorage.delete(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const StorageService = {
  async getAccessToken(): Promise<string | null> {
    return await getSecureItem(ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    await setSecureItem(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return await getSecureItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await setSecureItem(REFRESH_TOKEN_KEY, token);
  },

  async getUser(): Promise<User | null> {
    const raw = await getSecureItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  async setUser(user: User): Promise<void> {
    await setSecureItem(USER_KEY, JSON.stringify(user));
  },

  async clearSession(): Promise<void> {
    await deleteSecureItem(ACCESS_TOKEN_KEY);
    await deleteSecureItem(REFRESH_TOKEN_KEY);
    await deleteSecureItem(USER_KEY);
  },
};
