// Domain models for SmartQuote

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  currency: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  notes?: string;
  totalBilled: number;
  outstandingBalance: number;
}

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';

export interface QuotationItem {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  quotationNumber: string;
  issueDate: string;
  validUntil: string;
  status: QuotationStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  terms?: string;
  items: QuotationItem[];
}

export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  businessId: string;
  customerId: string;
  customerName: string;
  quotationId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes?: string;
  terms?: string;
  items: InvoiceItem[];
}

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  reference?: string;
  notes?: string;
}

export interface DashboardMetrics {
  totalSales: number;
  totalCollected: number;
  outstandingBalance: number;
  overdueAmount: number;
  activeQuotationsCount: number;
  pendingInvoicesCount: number;
  customersCount: number;
}
