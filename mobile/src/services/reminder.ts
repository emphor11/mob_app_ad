import { Linking, Share, Alert } from 'react-native';
import { apiClient } from '@/lib/api';
import {
  ReminderChannel,
  InvoiceReminder,
  ReminderTemplate,
  DueAlertsResponse,
} from '@/types';

interface ApiReminderTemplate {
  invoice_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  invoice_number: string;
  due_date: string;
  total_amount: string | number;
  paid_amount: string | number;
  remaining_amount: string | number;
  status: any;
  standard_message: string;
  gentle_message: string;
  urgent_message: string;
  whatsapp_url?: string | null;
}

interface ApiInvoiceReminder {
  id: string;
  business_id: string;
  invoice_id: string;
  channel: ReminderChannel;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  message: string;
  sent_at: string;
  created_at: string;
}

interface ApiDueAlertItem {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  due_date: string;
  total_amount: string | number;
  remaining_amount: string | number;
  status: any;
  alert_type: 'DUE_TOMORROW' | 'OVERDUE';
  days_offset: number;
  suggested_message: string;
}

interface ApiDueAlertsResponse {
  due_tomorrow_count: number;
  overdue_count: number;
  total_alerts: number;
  alerts: ApiDueAlertItem[];
}

function mapApiReminder(item: ApiInvoiceReminder): InvoiceReminder {
  return {
    id: item.id,
    businessId: item.business_id,
    invoiceId: item.invoice_id,
    channel: item.channel,
    recipientName: item.recipient_name ?? undefined,
    recipientPhone: item.recipient_phone ?? undefined,
    message: item.message,
    sentAt: item.sent_at,
    createdAt: item.created_at,
  };
}

export const ReminderService = {
  /**
   * Fetch pre-generated reminder messages and WhatsApp link for an invoice.
   */
  async getReminderTemplate(invoiceId: string): Promise<ReminderTemplate> {
    const res = await apiClient.get<ApiReminderTemplate>(
      `/invoices/${invoiceId}/reminder-template`
    );
    const d = res.data;
    return {
      invoiceId: d.invoice_id,
      customerId: d.customer_id,
      customerName: d.customer_name,
      customerPhone: d.customer_phone ?? undefined,
      invoiceNumber: d.invoice_number,
      dueDate: d.due_date,
      totalAmount: parseFloat(String(d.total_amount)) || 0,
      paidAmount: parseFloat(String(d.paid_amount)) || 0,
      remainingAmount: parseFloat(String(d.remaining_amount)) || 0,
      status: d.status,
      standardMessage: d.standard_message,
      gentleMessage: d.gentle_message,
      urgentMessage: d.urgent_message,
      whatsappUrl: d.whatsapp_url ?? undefined,
    };
  },

  /**
   * Log that a reminder was dispatched.
   */
  async recordReminder(
    invoiceId: string,
    payload: {
      channel: ReminderChannel;
      message: string;
      recipientName?: string;
      recipientPhone?: string;
    }
  ): Promise<InvoiceReminder> {
    const res = await apiClient.post<ApiInvoiceReminder>(
      `/invoices/${invoiceId}/reminders`,
      {
        channel: payload.channel,
        message: payload.message,
        recipient_name: payload.recipientName,
        recipient_phone: payload.recipientPhone,
      }
    );
    return mapApiReminder(res.data);
  },

  /**
   * Get reminder audit history for an invoice.
   */
  async getReminderHistory(invoiceId: string): Promise<InvoiceReminder[]> {
    const res = await apiClient.get<ApiInvoiceReminder[]>(
      `/invoices/${invoiceId}/reminders`
    );
    return res.data.map(mapApiReminder);
  },

  /**
   * Get upcoming due and overdue alerts for automated notifications.
   */
  async getDueAlerts(): Promise<DueAlertsResponse> {
    const res = await apiClient.get<ApiDueAlertsResponse>(
      '/invoices/reminders/due-alerts'
    );
    const d = res.data;
    return {
      dueTomorrowCount: d.due_tomorrow_count,
      overdueCount: d.overdue_count,
      totalAlerts: d.total_alerts,
      alerts: d.alerts.map((a) => ({
        invoiceId: a.invoice_id,
        invoiceNumber: a.invoice_number,
        customerId: a.customer_id,
        customerName: a.customer_name,
        customerPhone: a.customer_phone ?? undefined,
        dueDate: a.due_date,
        totalAmount: parseFloat(String(a.total_amount)) || 0,
        remainingAmount: parseFloat(String(a.remaining_amount)) || 0,
        status: a.status,
        alertType: a.alert_type,
        daysOffset: a.days_offset,
        suggestedMessage: a.suggested_message,
      })),
    };
  },

  /**
   * Launch WhatsApp with pre-filled message and recipient phone.
   */
  async openWhatsApp(phone: string | undefined, message: string): Promise<boolean> {
    const encoded = encodeURIComponent(message);
    let targetPhone = phone ? phone.replace(/[^\d+]/g, '') : '';
    if (targetPhone.startsWith('+')) {
      targetPhone = targetPhone.substring(1);
    } else if (targetPhone.length === 10) {
      targetPhone = `91${targetPhone}`;
    }

    const appUrl = targetPhone
      ? `whatsapp://send?phone=${targetPhone}&text=${encoded}`
      : `whatsapp://send?text=${encoded}`;
    const webUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        return true;
      } else {
        await Linking.openURL(webUrl);
        return true;
      }
    } catch {
      try {
        await Linking.openURL(webUrl);
        return true;
      } catch {
        Alert.alert('Error', 'Unable to launch WhatsApp.');
        return false;
      }
    }
  },

  /**
   * Open native system share dialog.
   */
  async shareViaSystem(message: string, title?: string): Promise<boolean> {
    try {
      const res = await Share.share({
        message,
        title: title || 'Payment Reminder',
      });
      return res.action === Share.sharedAction;
    } catch {
      return false;
    }
  },
};
