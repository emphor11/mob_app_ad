import { apiClient } from '@/lib/api';
import { Payment, PaymentMethod } from '@/types';

export interface RecordPaymentInput {
  amount: number;
  payment_date?: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

interface ApiPayment {
  id: string;
  business_id: string;
  invoice_id: string;
  invoice_number?: string | null;
  customer_name?: string | null;
  amount: string | number;
  payment_date: string;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

function mapApiPayment(p: ApiPayment): Payment {
  return {
    id: p.id,
    invoiceId: p.invoice_id,
    invoiceNumber: p.invoice_number || '',
    customerName: p.customer_name || 'Client',
    amount: Number(p.amount),
    paymentDate: p.payment_date,
    method: p.method,
    reference: p.reference ?? undefined,
    notes: p.notes ?? undefined,
  };
}

export const PaymentService = {
  /**
   * Record a payment against an invoice.
   * Atomically updates invoice.paid_amount and invoice.status on backend.
   */
  async recordPayment(invoiceId: string, input: RecordPaymentInput): Promise<Payment> {
    const payload = {
      amount: input.amount.toFixed(2),
      payment_date: input.payment_date || new Date().toISOString().split('T')[0],
      method: input.method,
      reference: input.reference?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
    };
    const response = await apiClient.post<ApiPayment>(
      `/api/v1/invoices/${invoiceId}/payments`,
      payload
    );
    return mapApiPayment(response.data);
  },

  /**
   * Fetch payment history for a specific invoice.
   */
  async getInvoicePayments(invoiceId: string): Promise<Payment[]> {
    const response = await apiClient.get<ApiPayment[]>(
      `/api/v1/invoices/${invoiceId}/payments`
    );
    return response.data.map(mapApiPayment);
  },

  /**
   * Fetch all payment records across all invoices for the authenticated business.
   */
  async getAllPayments(method?: PaymentMethod): Promise<Payment[]> {
    const params: Record<string, string> = {};
    if (method) {
      params.method = method;
    }
    const response = await apiClient.get<ApiPayment[]>('/api/v1/payments', { params });
    return response.data.map(mapApiPayment);
  },
};
