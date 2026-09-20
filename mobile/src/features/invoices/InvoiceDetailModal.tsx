import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Invoice, InvoiceStatus, Business, Customer, Payment } from '@/types';
import { InvoiceService } from '@/services/invoice';
import { BusinessService } from '@/services/business';
import { CustomerService } from '@/services/customer';
import { InvoicePdfService } from '@/services/invoicePdf';
import { PaymentService } from '@/services/payment';
import { RecordPaymentModal } from '@/features/payments/RecordPaymentModal';

interface Props {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onUpdated: (updated: Invoice) => void;
}

export function InvoiceDetailModal({ visible, invoice, onClose, onUpdated }: Props) {
  const [updating, setUpdating] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [recordPaymentVisible, setRecordPaymentVisible] = useState(false);

  useEffect(() => {
    if (visible && invoice) {
      BusinessService.getMyBusiness()
        .then((b) => setBusiness(b))
        .catch(() => {});

      if (invoice.customerId) {
        CustomerService.getCustomerById(invoice.customerId)
          .then((c) => setCustomer(c))
          .catch(() => {});
      }

      // Fetch payment history for this invoice
      PaymentService.getInvoicePayments(invoice.id)
        .then((p) => setPayments(p))
        .catch(() => setPayments([]));
    }
  }, [visible, invoice]);

  if (!invoice) return null;

  const balanceDue = Math.max(0, invoice.total - invoice.paidAmount);

  const handleSharePdf = async () => {
    setSharingPdf(true);
    try {
      await InvoicePdfService.shareInvoicePdf(invoice, business, customer);
    } finally {
      setSharingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    setPrinting(true);
    try {
      await InvoicePdfService.printInvoice(invoice, business, customer);
    } finally {
      setPrinting(false);
    }
  };

  const handleWhatsAppShare = async () => {
    await InvoicePdfService.shareViaWhatsAppText(invoice, business, customer);
  };

  const handleUpdateStatus = async (newStatus: InvoiceStatus) => {
    setUpdating(true);
    try {
      const updated = await InvoiceService.updateInvoice(invoice.id, {
        status: newStatus,
      });
      Alert.alert('Status Updated', `Invoice marked as ${newStatus}.`);
      onUpdated(updated);
    } catch {
      Alert.alert('Error', 'Failed to update invoice status.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmCancelInvoice = () => {
    Alert.alert(
      'Cancel Invoice',
      `Are you sure you want to cancel invoice ${invoice.invoiceNumber}? This action records the invoice as cancelled for compliance.`,
      [
        { text: 'No, Keep Active', style: 'cancel' },
        {
          text: 'Yes, Cancel Invoice',
          style: 'destructive',
          onPress: () => handleUpdateStatus('CANCELLED'),
        },
      ]
    );
  };

  const handlePaymentRecorded = (newPayment: Payment, updatedInvoice: Invoice) => {
    setPayments((prev) => [newPayment, ...prev]);
    onUpdated(updatedInvoice);
  };

  const getMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'UPI':
        return 'phone-portrait-outline';
      case 'BANK_TRANSFER':
        return 'business-outline';
      case 'CASH':
        return 'cash-outline';
      case 'CARD':
        return 'card-outline';
      default:
        return 'ellipsis-horizontal-circle-outline';
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{invoice.invoiceNumber}</Text>
                <Text style={styles.modalSubtitle}>{invoice.customerName}</Text>
              </View>
              <View style={styles.headerRight}>
                <StatusBadge status={invoice.status} />
                <TouchableOpacity onPress={onClose} style={{ marginLeft: 12 }}>
                  <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Meta Details */}
              <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Issue Date</Text>
                  <Text style={styles.metaValue}>{invoice.issueDate}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>Due Date</Text>
                  <Text style={[styles.metaValue, invoice.status === 'OVERDUE' && styles.overdueValue]}>
                    {invoice.dueDate}
                  </Text>
                </View>
              </View>

              {/* Financial Status Section */}
              <View style={styles.balanceSection}>
                <View style={styles.balanceCol}>
                  <Text style={styles.balanceLabel}>Total Invoice</Text>
                  <Text style={styles.balanceTotal}>
                    ₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.balanceCol}>
                  <Text style={styles.balanceLabel}>Paid Amount</Text>
                  <Text style={styles.balancePaid}>
                    ₹{invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.balanceCol}>
                  <Text style={styles.balanceLabel}>Balance Due</Text>
                  <Text
                    style={[
                      styles.balanceRemaining,
                      balanceDue > 0 ? styles.dueText : styles.paidText,
                    ]}>
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* Line Items Table */}
              <Text style={styles.sectionHeader}>Invoice Line Items</Text>
              <View style={styles.itemsTable}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.thText, { flex: 2 }]}>Description</Text>
                  <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
                  <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Price</Text>
                  <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
                </View>

                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item, idx) => (
                    <View key={item.id || idx} style={styles.tableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                        {item.taxRate > 0 && (
                          <Text style={styles.itemTaxRate}>GST: {item.taxRate}%</Text>
                        )}
                      </View>
                      <Text style={[styles.tdText, { flex: 0.8, textAlign: 'center' }]}>
                        {item.quantity}
                      </Text>
                      <Text style={[styles.tdText, { flex: 1.2, textAlign: 'right' }]}>
                        ₹{item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                      <Text
                        style={[
                          styles.tdText,
                          { flex: 1.2, textAlign: 'right', fontWeight: '700' },
                        ]}>
                        ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>No line items specified.</Text>
                )}
              </View>

              {/* Financial Summary Breakdown */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Taxable Subtotal</Text>
                  <Text style={styles.summaryValue}>
                    ₹{invoice.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                {invoice.discount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Trade Discount</Text>
                    <Text style={[styles.summaryValue, { color: Colors.light.danger }]}>
                      -₹{invoice.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST Output Tax</Text>
                  <Text style={styles.summaryValue}>
                    +₹{invoice.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={[styles.summaryRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total Amount</Text>
                  <Text style={styles.grandTotalValue}>
                    ₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paid to Date</Text>
                  <Text style={[styles.summaryValue, { color: Colors.light.success }]}>
                    ₹{invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={[styles.summaryRow, styles.balanceDueRow]}>
                  <Text style={styles.balanceDueLabel}>Balance Due</Text>
                  <Text style={styles.balanceDueValue}>
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>

              {/* Payment History Section */}
              <View style={styles.paymentHistorySection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>Payment History ({payments.length})</Text>
                  {balanceDue > 0 && invoice.status !== 'CANCELLED' && (
                    <TouchableOpacity
                      onPress={() => setRecordPaymentVisible(true)}
                      style={styles.addPaymentHeaderBtn}>
                      <Ionicons name="add-circle-outline" size={16} color={Colors.light.primary} />
                      <Text style={styles.addPaymentHeaderText}>Record Payment</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {payments.length > 0 ? (
                  <View style={styles.paymentsList}>
                    {payments.map((p) => (
                      <View key={p.id} style={styles.paymentHistoryItem}>
                        <View style={styles.paymentItemLeft}>
                          <View style={styles.paymentMethodIconBox}>
                            <Ionicons
                              name={getMethodIcon(p.method) as any}
                              size={16}
                              color={Colors.light.primary}
                            />
                          </View>
                          <View>
                            <Text style={styles.paymentMethodText}>
                              {p.method.replace('_', ' ')}
                            </Text>
                            <Text style={styles.paymentDateText}>
                              {p.paymentDate}
                              {p.reference ? ` • Ref: ${p.reference}` : ''}
                            </Text>
                            {p.notes ? (
                              <Text style={styles.paymentNotesText}>{p.notes}</Text>
                            ) : null}
                          </View>
                        </View>
                        <Text style={styles.paymentAmountText}>
                          +₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyPaymentsBox}>
                    <Text style={styles.emptyPaymentsText}>
                      No payments recorded yet for this invoice.
                    </Text>
                  </View>
                )}
              </View>

              {/* Notes & Terms */}
              {invoice.notes ? (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoBlockLabel}>Notes</Text>
                  <Text style={styles.infoBlockText}>{invoice.notes}</Text>
                </View>
              ) : null}

              {invoice.terms ? (
                <View style={styles.infoBlock}>
                  <Text style={styles.infoBlockLabel}>Terms & Conditions</Text>
                  <Text style={styles.infoBlockText}>{invoice.terms}</Text>
                </View>
              ) : null}

              {/* Document Sharing & PDF Section */}
              <View style={styles.shareSection}>
                <Text style={styles.sectionHeader}>Share & Export Invoice</Text>

                <Button
                  title="Share Invoice PDF (WhatsApp / Email)"
                  variant="primary"
                  loading={sharingPdf}
                  icon={<Ionicons name="share-social-outline" size={18} color="#FFFFFF" />}
                  onPress={handleSharePdf}
                  style={styles.primaryShareButton}
                />

                <View style={styles.shareOptionsRow}>
                  <TouchableOpacity
                    style={[styles.quickShareBtn, styles.whatsAppBtn]}
                    onPress={handleWhatsAppShare}
                    activeOpacity={0.8}>
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                    <Text style={styles.quickShareBtnText}>WhatsApp Text</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickShareBtn, styles.printBtn]}
                    onPress={handlePrintPdf}
                    activeOpacity={0.8}>
                    <Ionicons name="print-outline" size={18} color={Colors.light.text} />
                    <Text style={[styles.quickShareBtnText, { color: Colors.light.text }]}>
                      {printing ? 'Preparing...' : 'Print / Preview'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Invoice Management Actions */}
              <View style={styles.actionSection}>
                <Text style={styles.sectionHeader}>Invoice Actions</Text>

                {balanceDue > 0 && invoice.status !== 'CANCELLED' && (
                  <Button
                    title="Record Payment"
                    variant="primary"
                    icon={<Ionicons name="card-outline" size={16} color="#FFFFFF" />}
                    onPress={() => setRecordPaymentVisible(true)}
                    style={{ marginBottom: 8 }}
                  />
                )}

                {invoice.status !== 'CANCELLED' && (
                  <Button
                    title="Cancel Invoice"
                    variant="outline"
                    loading={updating}
                    icon={<Ionicons name="close-circle-outline" size={16} color={Colors.light.danger} />}
                    onPress={confirmCancelInvoice}
                  />
                )}

                {invoice.status === 'PAID' && (
                  <View style={styles.statusBannerSuccess}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
                    <Text style={styles.statusBannerSuccessText}>
                      Invoice is fully paid and settled.
                    </Text>
                  </View>
                )}

                {invoice.status === 'CANCELLED' && (
                  <View style={styles.statusBannerCancelled}>
                    <Ionicons name="alert-circle-outline" size={20} color={Colors.light.danger} />
                    <Text style={styles.statusBannerCancelledText}>
                      This invoice was cancelled.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        visible={recordPaymentVisible}
        invoice={invoice}
        onClose={() => setRecordPaymentVisible(false)}
        onPaymentRecorded={handlePaymentRecorded}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  metaRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  overdueValue: {
    color: Colors.light.danger,
    fontWeight: '700',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  balanceCol: {
    alignItems: 'flex-start',
  },
  balanceLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  balanceTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  balancePaid: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.success,
  },
  balanceRemaining: {
    fontSize: 14,
    fontWeight: '700',
  },
  dueText: {
    color: Colors.light.danger,
  },
  paidText: {
    color: Colors.light.success,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addPaymentHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addPaymentHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  itemsTable: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.text,
  },
  itemTaxRate: {
    fontSize: 10,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  tdText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  noItemsText: {
    padding: 16,
    textAlign: 'center',
    color: Colors.light.textMuted,
    fontSize: 13,
  },
  summaryBox: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 6,
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  balanceDueRow: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: -12,
    marginBottom: -12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  balanceDueLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.danger,
  },
  balanceDueValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.danger,
  },
  paymentHistorySection: {
    marginBottom: 16,
  },
  paymentsList: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: 'hidden',
  },
  paymentHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  paymentMethodIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  paymentDateText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  paymentNotesText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  paymentAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.success,
  },
  emptyPaymentsBox: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    alignItems: 'center',
  },
  emptyPaymentsText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  infoBlock: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 12,
    marginBottom: 12,
  },
  infoBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  infoBlockText: {
    fontSize: 13,
    color: Colors.light.text,
    lineHeight: 18,
  },
  shareSection: {
    marginBottom: 20,
  },
  primaryShareButton: {
    marginBottom: 10,
  },
  shareOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  whatsAppBtn: {
    backgroundColor: '#25D366',
  },
  printBtn: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickShareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionSection: {
    marginBottom: 24,
  },
  statusBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  statusBannerSuccessText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.success,
  },
  statusBannerCancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  statusBannerCancelledText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.danger,
  },
});
