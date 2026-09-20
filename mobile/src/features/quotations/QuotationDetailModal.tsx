import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import { Quotation, QuotationStatus, Business, Customer } from '@/types';
import { QuotationService } from '@/services/quotation';
import { BusinessService } from '@/services/business';
import { CustomerService } from '@/services/customer';
import { QuotationPdfService } from '@/services/quotationPdf';
import { InvoiceService } from '@/services/invoice';



interface Props {
  visible: boolean;
  quotation: Quotation | null;
  onClose: () => void;
  onUpdated: (updated: Quotation) => void;
}

export function QuotationDetailModal({ visible, quotation, onClose, onUpdated }: Props) {
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);


  React.useEffect(() => {
    if (visible && quotation) {
      // Fetch current business and customer details for comprehensive PDF generation
      BusinessService.getMyBusiness()
        .then((b) => setBusiness(b))
        .catch(() => {});

      if (quotation.customerId) {
        CustomerService.getCustomerById(quotation.customerId)
          .then((c) => setCustomer(c))
          .catch(() => {});
      }
    }
  }, [visible, quotation]);

  if (!quotation) return null;

  const handleSharePdf = async () => {
    setSharingPdf(true);
    try {
      await QuotationPdfService.shareQuotationPdf(quotation, business, customer);
    } finally {
      setSharingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    setPrinting(true);
    try {
      await QuotationPdfService.printQuotation(quotation, business, customer);
    } finally {
      setPrinting(false);
    }
  };

  const handleWhatsAppShare = async () => {
    await QuotationPdfService.shareViaWhatsAppText(quotation, business, customer);
  };

  const handleUpdateStatus = async (newStatus: QuotationStatus) => {
    setUpdating(true);
    try {
      const updated = await QuotationService.updateQuotation(quotation.id, {
        status: newStatus,
      });
      Alert.alert('Status Updated', `Quotation status updated to ${newStatus}.`);
      onUpdated(updated);
    } catch {
      Alert.alert('Error', 'Failed to update quotation status.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmMarkRejected = () => {
    Alert.alert(
      'Mark as Rejected',
      'Are you sure the client has declined this quotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Mark Rejected', style: 'destructive', onPress: () => handleUpdateStatus('REJECTED') },
      ]
    );
  };

  const confirmMarkExpired = () => {
    Alert.alert(
      'Mark as Expired',
      'Mark this quotation as expired due to exceeded validity period?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Mark Expired', onPress: () => handleUpdateStatus('EXPIRED') },
      ]
    );
  };

  const confirmConvertToInvoice = () => {
    Alert.alert(
      'Convert to Official Invoice',
      `Generate official Tax Invoice from ${quotation.quotationNumber}? All items and financials will be copied to an independent invoice record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert Now',
          style: 'default',
          onPress: async () => {
            setConverting(true);
            try {
              const invoice = await InvoiceService.convertQuotationToInvoice(quotation.id);
              Alert.alert(
                'Invoice Created!',
                `Quotation converted to Tax Invoice ${invoice.invoiceNumber}.`
              );
              onUpdated({
                ...quotation,
                status: 'CONVERTED',
              });
            } catch {
              Alert.alert('Conversion Failed', 'Could not convert quotation to invoice. Please ensure quotation is accepted.');
            } finally {
              setConverting(false);
            }
          },
        },
      ]
    );
  };




  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{quotation.quotationNumber}</Text>
              <Text style={styles.modalSubtitle}>{quotation.customerName}</Text>
            </View>
            <View style={styles.headerRight}>
              <StatusBadge status={quotation.status} />
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
                <Text style={styles.metaValue}>{quotation.issueDate}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Valid Until</Text>
                <Text style={styles.metaValue}>{quotation.validUntil}</Text>
              </View>
            </View>

            {/* Line Items Table */}
            <Text style={styles.sectionHeader}>Quotation Line Items</Text>
            <View style={styles.itemsTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.thText, { flex: 2 }]}>Description</Text>
                <Text style={[styles.thText, { flex: 0.8, textAlign: 'center' }]}>Qty</Text>
                <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Price</Text>
                <Text style={[styles.thText, { flex: 1.2, textAlign: 'right' }]}>Total</Text>
              </View>

              {quotation.items && quotation.items.length > 0 ? (
                quotation.items.map((item, idx) => (
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
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  ₹{quotation.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {quotation.discount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: Colors.light.danger }]}>
                    -₹{quotation.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST Tax</Text>
                <Text style={styles.summaryValue}>
                  +₹{quotation.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  ₹{quotation.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Notes & Terms */}
            {quotation.notes ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Notes</Text>
                <Text style={styles.infoBlockText}>{quotation.notes}</Text>
              </View>
            ) : null}

            {quotation.terms ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoBlockLabel}>Commercial Terms</Text>
                <Text style={styles.infoBlockText}>{quotation.terms}</Text>
              </View>
            ) : null}

            {/* Document Sharing & PDF Section */}
            <View style={styles.shareSection}>
              <Text style={styles.sectionHeader}>Share & Export Document</Text>
              
              <Button
                title="Share PDF (WhatsApp / Email / Other)"
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
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.quickShareBtnText}>WhatsApp Text</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickShareBtn, styles.printBtn]}
                  onPress={handlePrintPdf}
                  activeOpacity={0.8}
                >
                  <Ionicons name="print-outline" size={18} color={Colors.light.text} />
                  <Text style={[styles.quickShareBtnText, { color: Colors.light.text }]}>
                    {printing ? 'Preparing...' : 'Print / Preview'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status Transition Action Buttons */}
            <View style={styles.actionSection}>
              <Text style={styles.sectionHeader}>Quotation Lifecycle</Text>

              {quotation.status === 'DRAFT' && (
                <View style={{ gap: 8 }}>
                  <Button
                    title="Mark as Sent to Client"
                    variant="primary"
                    loading={updating}
                    icon={<Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />}
                    onPress={() => handleUpdateStatus('SENT')}
                  />
                  <Button
                    title="Mark Expired"
                    variant="outline"
                    loading={updating}
                    icon={<Ionicons name="timer-outline" size={16} color={Colors.light.textSecondary} />}
                    onPress={confirmMarkExpired}
                  />
                </View>
              )}

              {quotation.status === 'SENT' && (
                <View style={{ gap: 8 }}>
                  <Button
                    title="Mark Accepted (Deal Won)"
                    variant="primary"
                    loading={updating}
                    icon={<Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}
                    onPress={() => handleUpdateStatus('ACCEPTED')}
                  />
                  <View style={styles.buttonRow}>
                    <Button
                      title="Mark Rejected"
                      variant="danger"
                      loading={updating}
                      icon={<Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />}
                      onPress={confirmMarkRejected}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Mark Expired"
                      variant="outline"
                      loading={updating}
                      icon={<Ionicons name="timer-outline" size={16} color={Colors.light.textSecondary} />}
                      onPress={confirmMarkExpired}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              )}

              {quotation.status === 'ACCEPTED' && (
                <View style={{ gap: 10 }}>
                  <View style={styles.acceptedBanner}>
                    <Ionicons name="checkmark-done-circle" size={24} color={Colors.light.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.acceptedBannerTitle}>Quotation Accepted</Text>
                      <Text style={styles.acceptedBannerText}>
                        Client agreed to quotation. You can now issue the formal Tax Invoice.
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleUpdateStatus('SENT')}
                      style={styles.revertButton}
                    >
                      <Text style={styles.revertButtonText}>Undo</Text>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Convert to Tax Invoice"
                    variant="primary"
                    loading={converting}
                    icon={<Ionicons name="receipt-outline" size={18} color="#FFFFFF" />}
                    onPress={confirmConvertToInvoice}
                  />
                </View>
              )}


              {(quotation.status === 'REJECTED' || quotation.status === 'EXPIRED') && (
                <View style={{ gap: 8 }}>
                  <View style={styles.closedBanner}>
                    <Ionicons
                      name={quotation.status === 'REJECTED' ? 'close-circle' : 'time-outline'}
                      size={20}
                      color={quotation.status === 'REJECTED' ? Colors.light.danger : '#7E22CE'}
                    />
                    <Text style={styles.closedBannerText}>
                      Quotation is currently marked as {quotation.status.toLowerCase()}.
                    </Text>
                  </View>
                  <Button
                    title="Reopen Quotation (Resume Negotiations)"
                    variant="outline"
                    loading={updating}
                    icon={<Ionicons name="refresh-outline" size={16} color={Colors.light.primary} />}
                    onPress={() => handleUpdateStatus('SENT')}
                  />
                </View>
              )}

              {quotation.status === 'CONVERTED' && (
                <View style={[styles.acceptedBanner, { backgroundColor: Colors.light.infoBg, borderColor: '#BFDBFE' }]}>
                  <Ionicons name="documents-outline" size={24} color={Colors.light.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.acceptedBannerTitle, { color: Colors.light.info }]}>Converted to Invoice</Text>
                    <Text style={styles.acceptedBannerText}>
                      This quotation has been converted into an official tax invoice.
                    </Text>
                  </View>
                </View>
              )}
            </View>

          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 14,
    color: Colors.light.text,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  itemsTable: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    alignItems: 'center',
  },
  itemDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  itemTaxRate: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  tdText: {
    fontSize: 13,
    color: Colors.light.text,
  },
  noItemsText: {
    padding: 14,
    textAlign: 'center',
    color: Colors.light.textMuted,
  },
  summaryBox: {
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
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
    borderTopColor: '#BFDBFE',
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  infoBlock: {
    marginBottom: 12,
  },
  infoBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
  },
  infoBlockText: {
    fontSize: 13,
    color: Colors.light.text,
    marginTop: 3,
    lineHeight: 18,
  },
  actionSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareSection: {
    marginTop: 6,
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    backgroundColor: '#EDF2F7',
    borderWidth: 1,
    borderColor: '#CBD5E0',
  },
  quickShareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.light.successBg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    padding: 14,
  },
  acceptedBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.success,
  },
  acceptedBannerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  revertButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  revertButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  closedBannerText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: '500',
  },
});


