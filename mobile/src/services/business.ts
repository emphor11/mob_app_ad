import { apiClient } from '@/lib/api';
import { Business } from '@/types';

export interface BusinessInput {
  name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  logo_url?: string;
  currency?: string;
}

export interface BusinessUpdateInput {
  name?: string;
  owner_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  logo_url?: string;
  currency?: string;
}

interface ApiBusinessResponse {
  id: string;
  user_id: string;
  name: string;
  owner_name: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string | null;
  logo_url?: string | null;
  currency: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function mapApiBusiness(apiBiz: ApiBusinessResponse): Business {
  return {
    id: apiBiz.id,
    userId: apiBiz.user_id,
    name: apiBiz.name,
    ownerName: apiBiz.owner_name,
    phone: apiBiz.phone,
    email: apiBiz.email,
    address: apiBiz.address,
    gstin: apiBiz.gstin ?? undefined,
    logoUrl: apiBiz.logo_url ?? undefined,
    currency: apiBiz.currency,
    isDefault: apiBiz.is_default,
  };
}

export const BusinessService = {
  /**
   * Fetch current authenticated user's business profile.
   * Returns null if 404 (user hasn't completed business setup yet).
   */
  async getMyBusiness(): Promise<Business | null> {
    try {
      const response = await apiClient.get<ApiBusinessResponse>('/api/v1/business/me');
      return mapApiBusiness(response.data);
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 404) {
          return null;
        }
      }
      throw error;
    }
  },

  /**
   * Create initial business profile for the current user.
   */
  async createBusiness(input: BusinessInput): Promise<Business> {
    const response = await apiClient.post<ApiBusinessResponse>('/api/v1/business', input);
    return mapApiBusiness(response.data);
  },

  /**
   * Update current user's business profile.
   */
  async updateBusiness(input: BusinessUpdateInput): Promise<Business> {
    const response = await apiClient.put<ApiBusinessResponse>('/api/v1/business/me', input);
    return mapApiBusiness(response.data);
  },

  /**
   * List all user businesses (supports multi-business).
   */
  async listMyBusinesses(): Promise<Business[]> {
    const response = await apiClient.get<ApiBusinessResponse[]>('/api/v1/business');
    return response.data.map(mapApiBusiness);
  },
};
