// Domain models for SmartQuote

export interface User {
  id: string;
  email: string;
  fullName: string;
}

export interface Business {
  id: string;
  userId?: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  gstin?: string;
  logoUrl?: string;
  currency: string;
  isDefault?: boolean;
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
  lastRemindedAt?: string;
  items: InvoiceItem[];
}

export type ReminderChannel = 'WHATSAPP' | 'SMS' | 'SHARE' | 'EMAIL';

export interface InvoiceReminder {
  id: string;
  businessId: string;
  invoiceId: string;
  channel: ReminderChannel;
  recipientName?: string;
  recipientPhone?: string;
  message: string;
  sentAt: string;
  createdAt: string;
}

export interface ReminderTemplate {
  invoiceId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  invoiceNumber: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  standardMessage: string;
  gentleMessage: string;
  urgentMessage: string;
  whatsappUrl?: string;
}

export interface DueAlertItem {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  dueDate: string;
  totalAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  alertType: 'DUE_TOMORROW' | 'OVERDUE';
  daysOffset: number;
  suggestedMessage: string;
}

export interface DueAlertsResponse {
  dueTomorrowCount: number;
  overdueCount: number;
  totalAlerts: number;
  alerts: DueAlertItem[];
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
  outstanding: number;
  overdue: number;
  customersCount: number;
  quotationsCount: number;
  invoicesCount: number;
  // Compatibility fields
  outstandingBalance?: number;
  overdueAmount?: number;
  activeQuotationsCount?: number;
  pendingInvoicesCount?: number;
}

export interface DashboardRecentQuotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  total: number;
  status: QuotationStatus;
  issueDate: string;
  validUntil: string;
  createdAt: string;
}

export interface DashboardRecentInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  createdAt: string;
}

export interface DashboardRecentPayment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  createdAt: string;
}

export interface DashboardOverdueInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: string;
  daysOverdue: number;
}

export interface DashboardData {
  businessId: string;
  businessName: string;
  ownerName: string;
  metrics: DashboardMetrics;
  recentQuotations: DashboardRecentQuotation[];
  recentInvoices: DashboardRecentInvoice[];
  recentPayments: DashboardRecentPayment[];
  overdueInvoices: DashboardOverdueInvoice[];
}

export type PaymentCategoryFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'PAID';

export interface OutstandingMetrics {
  totalOutstanding: number;
  totalOverdue: number;
  totalPartiallyPaid: number;
  totalPaid: number;
  outstandingCount: number;
  overdueCount: number;
  partiallyPaidCount: number;
  paidCount: number;
}

export interface OutstandingInvoiceItem {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  outstandingBalance: number;
  status: InvoiceStatus;
  isOverdue: boolean;
  paymentCategory: 'PENDING' | 'OVERDUE' | 'PAID';
  lastRemindedAt?: string;
}

export interface OutstandingSummary {
  metrics: OutstandingMetrics;
  items: OutstandingInvoiceItem[];
}

