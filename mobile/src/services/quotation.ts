import { apiClient } from '@/lib/api';
import { Quotation, QuotationItem, QuotationStatus } from '@/types';

export interface CreateQuotationItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
}

export interface CreateQuotationInput {
  customer_id: string;
  issue_date: string;
  valid_until: string;
  discount?: number;
  notes?: string;
  terms?: string;
  items: CreateQuotationItemInput[];
}

export interface UpdateQuotationInput {
  status?: QuotationStatus;
  issue_date?: string;
  valid_until?: string;
  discount?: number;
  notes?: string;
  terms?: string;
  items?: CreateQuotationItemInput[];
}

interface ApiQuotationItem {
  id: string;
  quotation_id: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  line_total: string | number;
}

interface ApiQuotation {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name?: string | null;
  quotation_number: string;
  issue_date: string;
  valid_until: string;
  status: QuotationStatus;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  notes?: string | null;
  terms?: string | null;
  items: ApiQuotationItem[];
  created_at: string;
  updated_at: string;
}

function mapApiItem(item: ApiQuotationItem): QuotationItem {
  return {
    id: item.id,
    quotationId: item.quotation_id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxRate: Number(item.tax_rate),
    taxAmount: Number(item.tax_amount),
    lineTotal: Number(item.line_total),
  };
}

function mapApiQuotation(q: ApiQuotation): Quotation {
  return {
    id: q.id,
    businessId: q.business_id,
    customerId: q.customer_id,
    customerName: q.customer_name || 'Client',
    quotationNumber: q.quotation_number,
    issueDate: q.issue_date,
    validUntil: q.valid_until,
    status: q.status,
    subtotal: Number(q.subtotal),
    discount: Number(q.discount),
    tax: Number(q.tax),
    total: Number(q.total),
    notes: q.notes ?? undefined,
    terms: q.terms ?? undefined,
    items: (q.items || []).map(mapApiItem),
  };
}

export const QuotationService = {
  /**
   * Fetch all quotations for the current business.
   * Supports search (by quote number or customer name) and status filter.
   */
  async getQuotations(status?: QuotationStatus | 'ALL', search?: string): Promise<Quotation[]> {
    const params: Record<string, string> = {};
    if (status && status !== 'ALL') {
      params.status = status;
    }
    if (search && search.trim().length > 0) {
      params.search = search.trim();
    }
    const response = await apiClient.get<ApiQuotation[]>('/api/v1/quotations', { params });
    return response.data.map(mapApiQuotation);
  },

  /**
   * Fetch single quotation by ID.
   */
  async getQuotationById(id: string): Promise<Quotation> {
    const response = await apiClient.get<ApiQuotation>(`/api/v1/quotations/${id}`);
    return mapApiQuotation(response.data);
  },

  /**
   * Create a new quotation with server-authoritative calculations.
   */
  async createQuotation(input: CreateQuotationInput): Promise<Quotation> {
    const payload = {
      customer_id: input.customer_id,
      issue_date: input.issue_date,
      valid_until: input.valid_until,
      discount: (input.discount || 0).toFixed(2),
      notes: input.notes,
      terms: input.terms,
      items: input.items.map((i) => ({
        description: i.description,
        quantity: i.quantity.toFixed(2),
        unit_price: i.unit_price.toFixed(2),
        tax_rate: i.tax_rate.toFixed(2),
      })),
    };
    const response = await apiClient.post<ApiQuotation>('/api/v1/quotations', payload);
    return mapApiQuotation(response.data);
  },

  /**
   * Update quotation details or status (e.g. DRAFT -> SENT).
   */
  async updateQuotation(id: string, input: UpdateQuotationInput): Promise<Quotation> {
    const payload: Record<string, unknown> = {};
    if (input.status) payload.status = input.status;
    if (input.issue_date) payload.issue_date = input.issue_date;
    if (input.valid_until) payload.valid_until = input.valid_until;
    if (input.notes !== undefined) payload.notes = input.notes;
    if (input.terms !== undefined) payload.terms = input.terms;
    if (input.discount !== undefined) payload.discount = input.discount.toFixed(2);
    if (input.items) {
      payload.items = input.items.map((i) => ({
        description: i.description,
        quantity: i.quantity.toFixed(2),
        unit_price: i.unit_price.toFixed(2),
        tax_rate: i.tax_rate.toFixed(2),
      }));
    }
    const response = await apiClient.patch<ApiQuotation>(`/api/v1/quotations/${id}`, payload);
    return mapApiQuotation(response.data);
  },
};
