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
import { Quotation, QuotationStatus } from '@/types';
import { QuotationService } from '@/services/quotation';

interface Props {
  visible: boolean;
  quotation: Quotation | null;
  onClose: () => void;
  onUpdated: (updated: Quotation) => void;
}

export function QuotationDetailModal({ visible, quotation, onClose, onUpdated }: Props) {
  const [updating, setUpdating] = useState(false);

  if (!quotation) return null;

  const handleUpdateStatus = async (newStatus: QuotationStatus) => {
    setUpdating(true);
    try {
      const updated = await QuotationService.updateQuotation(quotation.id, {
        status: newStatus,
      });
      Alert.alert('Status Updated', `Quotation marked as ${newStatus}.`);
      onUpdated(updated);
    } catch {
      Alert.alert('Error', 'Failed to update quotation status.');
    } finally {
      setUpdating(false);
    }
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

            {/* Status Transition Action Buttons */}
            <View style={styles.actionSection}>
              {quotation.status === 'DRAFT' && (
                <Button
                  title="Mark as Sent to Client"
                  variant="primary"
                  loading={updating}
                  icon={<Ionicons name="paper-plane-outline" size={16} color="#FFFFFF" />}
                  onPress={() => handleUpdateStatus('SENT')}
                  style={{ marginBottom: 8 }}
                />
              )}

              {quotation.status === 'SENT' && (
                <View style={styles.buttonRow}>
                  <Button
                    title="Mark Accepted"
                    variant="primary"
                    loading={updating}
                    icon={<Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />}
                    onPress={() => handleUpdateStatus('ACCEPTED')}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Mark Rejected"
                    variant="danger"
                    loading={updating}
                    icon={<Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />}
                    onPress={() => handleUpdateStatus('REJECTED')}
                    style={{ flex: 1 }}
                  />
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
});
