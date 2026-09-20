import { apiClient } from '@/lib/api';
import {
  Payment,
  PaymentMethod,
  PaymentCategoryFilter,
  OutstandingSummary,
  OutstandingMetrics,
  OutstandingInvoiceItem,
  InvoiceStatus,
} from '@/types';

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

interface ApiOutstandingMetrics {
  total_outstanding: string | number;
  total_overdue: string | number;
  total_partially_paid: string | number;
  total_paid: string | number;
  outstanding_count: number;
  overdue_count: number;
  partially_paid_count: number;
  paid_count: number;
}

interface ApiOutstandingInvoiceItem {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  issue_date: string;
  due_date: string;
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  paid_amount: string | number;
  outstanding_balance: string | number;
  status: InvoiceStatus;
  is_overdue: boolean;
  payment_category: 'PENDING' | 'OVERDUE' | 'PAID';
}

interface ApiOutstandingSummary {
  metrics: ApiOutstandingMetrics;
  items: ApiOutstandingInvoiceItem[];
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

function mapOutstandingMetrics(m: ApiOutstandingMetrics): OutstandingMetrics {
  return {
    totalOutstanding: Number(m.total_outstanding),
    totalOverdue: Number(m.total_overdue),
    totalPartiallyPaid: Number(m.total_partially_paid),
    totalPaid: Number(m.total_paid),
    outstandingCount: m.outstanding_count,
    overdueCount: m.overdue_count,
    partiallyPaidCount: m.partially_paid_count,
    paidCount: m.paid_count,
  };
}

function mapOutstandingItem(item: ApiOutstandingInvoiceItem): OutstandingInvoiceItem {
  return {
    id: item.id,
    invoiceNumber: item.invoice_number,
    customerId: item.customer_id,
    customerName: item.customer_name,
    customerPhone: item.customer_phone ?? undefined,
    issueDate: item.issue_date,
    dueDate: item.due_date,
    subtotal: Number(item.subtotal),
    tax: Number(item.tax),
    total: Number(item.total),
    paidAmount: Number(item.paid_amount),
    outstandingBalance: Number(item.outstanding_balance),
    status: item.status,
    isOverdue: item.is_overdue,
    paymentCategory: item.payment_category,
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

  /**
   * Fetch outstanding payment summary metrics and categorized invoice items.
   * Categorizes dynamically into PENDING, OVERDUE, and PAID.
   */
  async getOutstandingPayments(
    filter?: PaymentCategoryFilter,
    search?: string
  ): Promise<OutstandingSummary> {
    const params: Record<string, string> = {};
    if (filter && filter !== 'ALL') {
      params.filter = filter;
    }
    if (search && search.trim().length > 0) {
      params.search = search.trim();
    }
    const response = await apiClient.get<ApiOutstandingSummary>(
      '/api/v1/payments/outstanding',
      { params }
    );
    return {
      metrics: mapOutstandingMetrics(response.data.metrics),
      items: (response.data.items || []).map(mapOutstandingItem),
    };
  },
};
