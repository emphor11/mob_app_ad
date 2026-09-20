import { apiClient } from '@/lib/api';
import { Customer } from '@/types';

export interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
}

export interface CustomerUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  notes?: string;
}

interface ApiCustomerResponse {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  notes?: string | null;
  total_billed: string | number;
  outstanding_balance: string | number;
  created_at: string;
  updated_at: string;
}

function mapApiCustomer(apiCust: ApiCustomerResponse): Customer {
  return {
    id: apiCust.id,
    businessId: apiCust.business_id,
    name: apiCust.name,
    phone: apiCust.phone,
    email: apiCust.email ?? '',
    address: apiCust.address ?? '',
    gstin: apiCust.gstin ?? undefined,
    notes: apiCust.notes ?? undefined,
    totalBilled: Number(apiCust.total_billed || 0),
    outstandingBalance: Number(apiCust.outstanding_balance || 0),
  };
}

export const CustomerService = {
  /**
   * Fetch all customers for the authenticated business.
   * Supports optional search query across name, phone, email.
   */
  async getCustomers(search?: string): Promise<Customer[]> {
    const params = search && search.trim().length > 0 ? { search: search.trim() } : {};
    const response = await apiClient.get<ApiCustomerResponse[]>('/api/v1/customers', { params });
    return response.data.map(mapApiCustomer);
  },

  /**
   * Fetch a single customer by ID.
   */
  async getCustomerById(id: string): Promise<Customer> {
    const response = await apiClient.get<ApiCustomerResponse>(`/api/v1/customers/${id}`);
    return mapApiCustomer(response.data);
  },

  /**
   * Create a new customer (automatically scoped to business).
   */
  async createCustomer(input: CustomerInput): Promise<Customer> {
    const response = await apiClient.post<ApiCustomerResponse>('/api/v1/customers', input);
    return mapApiCustomer(response.data);
  },

  /**
   * Update customer details.
   */
  async updateCustomer(id: string, input: CustomerUpdateInput): Promise<Customer> {
    const response = await apiClient.patch<ApiCustomerResponse>(`/api/v1/customers/${id}`, input);
    return mapApiCustomer(response.data);
  },

  /**
   * Delete a customer.
   */
  async deleteCustomer(id: string): Promise<void> {
    await apiClient.delete(`/api/v1/customers/${id}`);
  },
};
