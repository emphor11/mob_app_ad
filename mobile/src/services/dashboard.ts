import { apiClient } from '@/lib/api';
import { DashboardData } from '@/types';

interface ApiDashboardMetrics {
  total_sales: string | number;
  total_collected: string | number;
  outstanding: string | number;
  overdue: string | number;
  customers_count: number;
  quotations_count: number;
  invoices_count: number;
}

interface ApiRecentQuotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  customer_name: string;
  total: string | number;
  status: any;
  issue_date: string;
  valid_until: string;
  created_at: string;
}

interface ApiRecentInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  total: string | number;
  paid_amount: string | number;
  remaining_amount: string | number;
  status: any;
  issue_date: string;
  due_date: string;
  created_at: string;
}

interface ApiRecentPayment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  amount: string | number;
  method: any;
  payment_date: string;
  created_at: string;
}

interface ApiOverdueInvoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  total: string | number;
  paid_amount: string | number;
  remaining_amount: string | number;
  due_date: string;
  days_overdue: number;
}

interface ApiDashboardResponse {
  business_id: string;
  business_name: string;
  owner_name: string;
  metrics: ApiDashboardMetrics;
  recent_quotations: ApiRecentQuotation[];
  recent_invoices: ApiRecentInvoice[];
  recent_payments: ApiRecentPayment[];
  overdue_invoices: ApiOverdueInvoice[];
}

export const DashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    const res = await apiClient.get<ApiDashboardResponse>('/dashboard');
    const d = res.data;
    const m = d.metrics;

    const totalSales = parseFloat(String(m.total_sales)) || 0;
    const totalCollected = parseFloat(String(m.total_collected)) || 0;
    const outstanding = parseFloat(String(m.outstanding)) || 0;
    const overdue = parseFloat(String(m.overdue)) || 0;

    return {
      businessId: d.business_id,
      businessName: d.business_name,
      ownerName: d.owner_name,
      metrics: {
        totalSales,
        totalCollected,
        outstanding,
        overdue,
        customersCount: m.customers_count || 0,
        quotationsCount: m.quotations_count || 0,
        invoicesCount: m.invoices_count || 0,
        // Compatibility
        outstandingBalance: outstanding,
        overdueAmount: overdue,
        activeQuotationsCount: m.quotations_count || 0,
        pendingInvoicesCount: m.invoices_count || 0,
      },
      recentQuotations: (d.recent_quotations || []).map((q) => ({
        id: q.id,
        quotationNumber: q.quotation_number,
        customerId: q.customer_id,
        customerName: q.customer_name,
        total: parseFloat(String(q.total)) || 0,
        status: q.status,
        issueDate: q.issue_date,
        validUntil: q.valid_until,
        createdAt: q.created_at,
      })),
      recentInvoices: (d.recent_invoices || []).map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer_id,
        customerName: inv.customer_name,
        total: parseFloat(String(inv.total)) || 0,
        paidAmount: parseFloat(String(inv.paid_amount)) || 0,
        remainingAmount: parseFloat(String(inv.remaining_amount)) || 0,
        status: inv.status,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        createdAt: inv.created_at,
      })),
      recentPayments: (d.recent_payments || []).map((p) => ({
        id: p.id,
        invoiceId: p.invoice_id,
        invoiceNumber: p.invoice_number,
        customerName: p.customer_name,
        amount: parseFloat(String(p.amount)) || 0,
        method: p.method,
        paymentDate: p.payment_date,
        createdAt: p.created_at,
      })),
      overdueInvoices: (d.overdue_invoices || []).map((o) => ({
        id: o.id,
        invoiceNumber: o.invoice_number,
        customerId: o.customer_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone ?? undefined,
        total: parseFloat(String(o.total)) || 0,
        paidAmount: parseFloat(String(o.paid_amount)) || 0,
        remainingAmount: parseFloat(String(o.remaining_amount)) || 0,
        dueDate: o.due_date,
        daysOverdue: o.days_overdue,
      })),
    };
  },
};
