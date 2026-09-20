import { apiClient } from '@/lib/api';
import { StorageService } from '@/lib/storage';
import { User } from '@/types';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  businessName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export const AuthService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/register', {
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
      business_name: payload.businessName,
    });

    const data = response.data;
    await StorageService.setAccessToken(data.access_token);
    await StorageService.setRefreshToken(data.refresh_token);
    await StorageService.setUser(data.user);

    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', {
      email: payload.email,
      password: payload.password,
    });

    const data = response.data;
    await StorageService.setAccessToken(data.access_token);
    await StorageService.setRefreshToken(data.refresh_token);
    await StorageService.setUser(data.user);

    return data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/api/v1/auth/me');
    const user = response.data;
    await StorageService.setUser(user);
    return user;
  },

  async logout(): Promise<void> {
    await StorageService.clearSession();
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await StorageService.getAccessToken();
    return !!token;
  },
};
