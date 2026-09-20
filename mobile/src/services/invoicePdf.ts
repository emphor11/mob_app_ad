import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform, Alert } from 'react-native';
import { Invoice, Business, Customer } from '@/types';

function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateInvoiceHtml(
  invoice: Invoice,
  business: Business | null,
  customer: Customer | null
): string {
  const bizName = business?.name || 'SmartQuote Merchant';
  const bizOwner = business?.ownerName ? `Prop: ${business.ownerName}` : '';
  const bizPhone = business?.phone || '';
  const bizEmail = business?.email || '';
  const bizAddress = business?.address || '';
  const bizGstin = business?.gstin ? `<strong>GSTIN:</strong> ${business.gstin}` : '';

  const custName = customer?.name || invoice.customerName || 'Valued Client';
  const custPhone = customer?.phone ? `Phone: ${customer.phone}` : '';
  const custEmail = customer?.email ? `Email: ${customer.email}` : '';
  const custAddress = customer?.address ? `Address: ${customer.address}` : '';
  const custGstin = customer?.gstin ? `<strong>GSTIN:</strong> ${customer.gstin}` : '';

  const balanceDue = Math.max(0, invoice.total - invoice.paidAmount);

  const statusColorMap: Record<string, string> = {
    PAID: '#16a34a',
    PARTIALLY_PAID: '#ca8a04',
    UNPAID: '#2563eb',
    OVERDUE: '#dc2626',
    CANCELLED: '#64748b',
  };
  const statusColor = statusColorMap[invoice.status] || '#2563eb';

  const itemRows = (invoice.items || [])
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center; color: #718096; width: 40px;">${idx + 1}</td>
        <td style="font-weight: 500; color: #1a202c;">
          ${item.description}
          ${item.taxRate > 0 ? `<div style="font-size: 11px; color: #718096;">GST: ${item.taxRate}%</div>` : ''}
        </td>
        <td style="text-align: center; color: #2d3748;">${item.quantity}</td>
        <td style="text-align: right; color: #2d3748;">${formatCurrency(item.unitPrice)}</td>
        <td style="text-align: center; color: #4a5568;">${item.taxRate}%</td>
        <td style="text-align: right; color: #4a5568;">${formatCurrency(item.taxAmount)}</td>
        <td style="text-align: right; font-weight: 600; color: #1a202c;">${formatCurrency(item.lineTotal)}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Invoice ${invoice.invoiceNumber}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #2d3748;
            margin: 0;
            padding: 32px;
            background-color: #ffffff;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .business-title {
            font-size: 24px;
            font-weight: 700;
            color: #1e3a8a;
            margin: 0 0 4px 0;
          }
          .business-meta {
            color: #4a5568;
            font-size: 12px;
            line-height: 1.4;
          }
          .invoice-title-card {
            text-align: right;
          }
          .invoice-badge {
            font-size: 18px;
            font-weight: 800;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .invoice-number {
            font-size: 15px;
            font-weight: 700;
            color: #1a202c;
          }
          .invoice-meta-row {
            font-size: 12px;
            color: #718096;
            margin-top: 3px;
          }
          .status-tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            background-color: ${statusColor};
            margin-top: 4px;
          }
          .card-grid {
            display: flex;
            gap: 16px;
            margin-bottom: 24px;
          }
          .info-card {
            flex: 1;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 16px;
          }
          .card-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #718096;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
          }
          .card-name {
            font-size: 15px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          th {
            background-color: #1e40af;
            color: #ffffff;
            font-weight: 600;
            font-size: 12px;
            padding: 10px 8px;
            text-align: left;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #edf2f7;
            font-size: 12px;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .lower-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-top: 8px;
          }
          .notes-terms {
            flex: 1.2;
          }
          .terms-block {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 12px;
          }
          .terms-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #4a5568;
            margin-bottom: 4px;
          }
          .terms-content {
            font-size: 11px;
            color: #4a5568;
            white-space: pre-wrap;
          }
          .financial-summary {
            flex: 0.8;
            background-color: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 14px;
            font-size: 12px;
            border-bottom: 1px solid #edf2f7;
          }
          .summary-row.total-row {
            background-color: #eff6ff;
            border-top: 2px solid #1e40af;
            font-size: 14px;
            font-weight: 700;
            color: #1e40af;
          }
          .summary-row.balance-due {
            background-color: #fef2f2;
            border-top: 1px solid #fecaca;
            border-bottom: none;
            padding: 10px 14px;
          }
          .balance-label {
            font-size: 13px;
            font-weight: 700;
            color: #b91c1c;
          }
          .balance-value {
            font-size: 15px;
            font-weight: 800;
            color: #b91c1c;
          }
          .footer-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 48px;
            padding-top: 16px;
          }
          .signature-box {
            width: 220px;
            border-top: 1px solid #cbd5e0;
            padding-top: 8px;
            text-align: center;
            font-size: 11px;
            color: #718096;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <div class="header">
          <div>
            ${
              business?.logoUrl
                ? `<img src="${business.logoUrl}" style="max-height: 48px; max-width: 140px; margin-bottom: 8px; object-fit: contain;" alt="Logo" />`
                : ''
            }
            <h1 class="business-title">${bizName}</h1>
            <div class="business-meta">
              ${bizOwner ? `<div>${bizOwner}</div>` : ''}
              ${bizPhone || bizEmail ? `<div>Phone: ${bizPhone} | Email: ${bizEmail}</div>` : ''}
              ${bizAddress ? `<div>${bizAddress}</div>` : ''}
              ${bizGstin ? `<div>${bizGstin}</div>` : ''}
            </div>
          </div>
          <div class="invoice-title-card">
            <div class="invoice-badge">TAX INVOICE</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <div class="invoice-meta-row"><strong>Issue Date:</strong> ${invoice.issueDate}</div>
            <div class="invoice-meta-row"><strong>Due Date:</strong> ${invoice.dueDate}</div>
            <div><span class="status-tag">${invoice.status}</span></div>
          </div>
        </div>

        <!-- Customer Billed To -->
        <div class="card-grid">
          <div class="info-card">
            <div class="card-label">BILLED TO</div>
            <div class="card-name">${custName}</div>
            <div style="font-size: 12px; color: #4a5568; line-height: 1.4;">
              ${custPhone ? `<div>${custPhone}</div>` : ''}
              ${custEmail ? `<div>${custEmail}</div>` : ''}
              ${custAddress ? `<div>${custAddress}</div>` : ''}
              ${custGstin ? `<div>${custGstin}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Line Items Table -->
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 40px;">#</th>
              <th>Description</th>
              <th style="text-align: center; width: 60px;">Qty</th>
              <th style="text-align: right; width: 100px;">Unit Price</th>
              <th style="text-align: center; width: 60px;">GST %</th>
              <th style="text-align: right; width: 90px;">Tax Amt</th>
              <th style="text-align: right; width: 110px;">Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <!-- Lower Section: Notes & Summary -->
        <div class="lower-section">
          <div class="notes-terms">
            ${
              business?.paymentInstructions
                ? `
              <div class="terms-block">
                <div class="terms-title">Payment Instructions & Bank Details</div>
                <div class="terms-content">${business.paymentInstructions}</div>
              </div>
            `
                : ''
            }
            ${
              invoice.notes
                ? `
              <div class="terms-block">
                <div class="terms-title">Notes</div>
                <div class="terms-content">${invoice.notes}</div>
              </div>
            `
                : ''
            }
            ${
              (invoice.terms || business?.defaultTerms)
                ? `
              <div class="terms-block">
                <div class="terms-title">Terms & Conditions</div>
                <div class="terms-content">${invoice.terms || business?.defaultTerms}</div>
              </div>
            `
                : ''
            }
            <div style="font-size: 11px; color: #718096; font-style: italic;">
              Thank you for your prompt payment. Please clear the balance due before the due date.
            </div>
          </div>

          <div class="financial-summary">
            <div class="summary-row">
              <span style="color: #718096;">Taxable Subtotal:</span>
              <span style="font-weight: 600;">${formatCurrency(invoice.subtotal)}</span>
            </div>
            ${
              invoice.discount > 0
                ? `
              <div class="summary-row">
                <span style="color: #718096;">Trade Discount:</span>
                <span style="font-weight: 600; color: #e53e3e;">- ${formatCurrency(invoice.discount)}</span>
              </div>
            `
                : ''
            }
            <div class="summary-row">
              <span style="color: #718096;">GST Output Tax:</span>
              <span style="font-weight: 600;">${formatCurrency(invoice.tax)}</span>
            </div>
            <div class="summary-row total-row">
              <span>Total Invoice:</span>
              <span>${formatCurrency(invoice.total)}</span>
            </div>
            <div class="summary-row">
              <span style="color: #718096;">Paid to Date:</span>
              <span style="font-weight: 600; color: #16a34a;">${formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div class="summary-row balance-due">
              <span class="balance-label">Balance Due:</span>
              <span class="balance-value">${formatCurrency(balanceDue)}</span>
            </div>
          </div>
        </div>

        <!-- Signatures -->
        <div class="footer-signatures">
          <div class="signature-box">
            Customer Acknowledgment<br/>
            (Goods & Invoice Received)
          </div>
          <div class="signature-box">
            For <strong>${bizName}</strong><br/>
            Authorized Signatory
          </div>
        </div>
      </body>
    </html>
  `;
}

export const InvoicePdfService = {
  /**
   * Generates a Tax Invoice PDF and opens the system native share sheet
   * (supporting WhatsApp, Email, AirDrop, Messages, Google Drive, Files, etc.).
   */
  async shareInvoicePdf(
    invoice: Invoice,
    business: Business | null,
    customer: Customer | null
  ): Promise<void> {
    try {
      const html = generateInvoiceHtml(invoice, business, customer);

      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }

      // Generate local PDF file
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this device.');
        return;
      }

      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Tax Invoice ${invoice.invoiceNumber}`,
      });
    } catch (error) {
      console.error('Failed to generate or share invoice PDF:', error);
      Alert.alert('Error', 'Unable to generate or share invoice PDF. Please try again.');
    }
  },

  /**
   * Directly prints or opens system print preview for the tax invoice.
   */
  async printInvoice(
    invoice: Invoice,
    business: Business | null,
    customer: Customer | null
  ): Promise<void> {
    try {
      const html = generateInvoiceHtml(invoice, business, customer);
      await Print.printAsync({ html });
    } catch (error) {
      console.error('Failed to print invoice:', error);
      Alert.alert('Error', 'Unable to print invoice.');
    }
  },

  /**
   * Quick trade shortcut: share tax invoice summary message directly via WhatsApp.
   */
  async shareViaWhatsAppText(
    invoice: Invoice,
    business: Business | null,
    customer: Customer | null
  ): Promise<void> {
    const bizName = business?.name || 'SmartQuote';
    const custName = customer?.name || invoice.customerName;
    const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    const balanceDue = Math.max(0, invoice.total - invoice.paidAmount);

    const message = [
      `*Tax Invoice from ${bizName}*`,
      `Invoice No: ${invoice.invoiceNumber}`,
      `Client: ${custName}`,
      `Date: ${invoice.issueDate}`,
      `Due Date: ${invoice.dueDate}`,
      `Status: ${invoice.status}`,
      `*Total Amount: ${formatCurrency(invoice.total)}*`,
      `Paid: ${formatCurrency(invoice.paidAmount)}`,
      `*Balance Due: ${formatCurrency(balanceDue)}*`,
      invoice.notes ? `Note: ${invoice.notes}` : '',
      `\nPlease clear the balance by ${invoice.dueDate}. Thank you!`,
    ]
      .filter(Boolean)
      .join('\n');

    const url = phone
      ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        const webUrl = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
          : `https://wa.me/?text=${encodeURIComponent(message)}`;
        await Linking.openURL(webUrl);
      }
    } catch {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please ensure the app is installed.');
    }
  },
};
