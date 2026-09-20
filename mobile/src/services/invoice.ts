import { apiClient } from '@/lib/api';
import { Invoice, InvoiceItem, InvoiceStatus } from '@/types';

export interface ConvertQuotationOptions {
  due_days?: number;
  issue_date?: string;
  notes?: string;
  terms?: string;
}

interface ApiInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  tax_rate: string | number;
  tax_amount: string | number;
  line_total: string | number;
}

interface ApiInvoice {
  id: string;
  business_id: string;
  customer_id: string;
  customer_name?: string | null;
  quotation_id?: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: string | number;
  discount: string | number;
  tax: string | number;
  total: string | number;
  paid_amount: string | number;
  status: InvoiceStatus;
  notes?: string | null;
  terms?: string | null;
  items: ApiInvoiceItem[];
  created_at: string;
  updated_at: string;
}

function mapApiItem(item: ApiInvoiceItem): InvoiceItem {
  return {
    id: item.id,
    invoiceId: item.invoice_id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxRate: Number(item.tax_rate),
    taxAmount: Number(item.tax_amount),
    lineTotal: Number(item.line_total),
  };
}

function mapApiInvoice(inv: ApiInvoice): Invoice {
  return {
    id: inv.id,
    businessId: inv.business_id,
    customerId: inv.customer_id,
    customerName: inv.customer_name || 'Client',
    quotationId: inv.quotation_id ?? undefined,
    invoiceNumber: inv.invoice_number,
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    subtotal: Number(inv.subtotal),
    discount: Number(inv.discount),
    tax: Number(inv.tax),
    total: Number(inv.total),
    paidAmount: Number(inv.paid_amount || 0),
    status: inv.status,
    notes: inv.notes ?? undefined,
    terms: inv.terms ?? undefined,
    items: (inv.items || []).map(mapApiItem),
  };
}

export const InvoiceService = {
  /**
   * Fetch all invoices for the authenticated business.
   */
  async getInvoices(status?: InvoiceStatus | 'ALL', search?: string): Promise<Invoice[]> {
    const params: Record<string, string> = {};
    if (status && status !== 'ALL') {
      params.status = status;
    }
    if (search && search.trim().length > 0) {
      params.search = search.trim();
    }
    const response = await apiClient.get<ApiInvoice[]>('/api/v1/invoices', { params });
    return response.data.map(mapApiInvoice);
  },

  /**
   * Fetch single invoice by ID.
   */
  async getInvoiceById(id: string): Promise<Invoice> {
    const response = await apiClient.get<ApiInvoice>(`/api/v1/invoices/${id}`);
    return mapApiInvoice(response.data);
  },

  /**
   * Atomically convert an ACCEPTED quotation into a formal Tax Invoice.
   */
  async convertQuotationToInvoice(
    quotationId: string,
    options?: ConvertQuotationOptions
  ): Promise<Invoice> {
    const payload = {
      due_days: options?.due_days ?? 15,
      issue_date: options?.issue_date,
      notes: options?.notes,
      terms: options?.terms,
    };
    const response = await apiClient.post<ApiInvoice>(
      `/api/v1/quotations/${quotationId}/convert`,
      payload
    );
    return mapApiInvoice(response.data);
  },

  /**
   * Update invoice details or status (e.g. CANCELLED, PAID).
   */
  async updateInvoice(
    id: string,
    updates: {
      status?: InvoiceStatus;
      due_date?: string;
      notes?: string;
      terms?: string;
    }
  ): Promise<Invoice> {
    const response = await apiClient.patch<ApiInvoice>(`/api/v1/invoices/${id}`, updates);
    return mapApiInvoice(response.data);
  },

  /**
   * Return the relative endpoint for downloading the Tax Invoice PDF.
   */
  getInvoicePdfUrl(id: string): string {
    return `/api/v1/invoices/${id}/pdf`;
  },
};

