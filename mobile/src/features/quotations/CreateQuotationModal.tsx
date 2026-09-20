import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Customer } from '@/types';
import { CustomerService } from '@/services/customer';
import { QuotationService, CreateQuotationItemInput } from '@/services/quotation';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TAX_PRESETS = [0, 5, 12, 18, 28];

export function CreateQuotationModal({ visible, onClose, onSuccess }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [validDays, setValidDays] = useState<number>(15);
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [terms, setTerms] = useState<string>('Payment within 15 days of acceptance.');
  const [saving, setSaving] = useState<boolean>(false);

  // Line items state
  const [items, setItems] = useState<CreateQuotationItemInput[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 18 },
  ]);

  useEffect(() => {
    if (visible) {
      CustomerService.getCustomers()
        .then((data) => {
          setCustomers(data);
          if (data.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [visible, selectedCustomerId]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: '', quantity: 1, unit_price: 0, tax_rate: 18 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      Alert.alert('Notice', 'At least one line item is required.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    field: keyof CreateQuotationItemInput,
    value: string | number
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Client-side UX calculations (Authoritative calculations happen on server)
  const previewSubtotal = items.reduce(
    (acc, it) => acc + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const previewTax = items.reduce((acc, it) => {
    const itemSub = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    return acc + (itemSub * (Number(it.tax_rate) || 0)) / 100;
  }, 0);
  const numDiscount = Number(discount) || 0;
  const previewDiscountedSub = Math.max(0, previewSubtotal - numDiscount);
  const previewTotal = previewDiscountedSub + previewTax;

  const handleSubmit = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Missing Customer', 'Please select a customer.');
      return;
    }

    const invalidItem = items.find((i) => !i.description.trim() || Number(i.unit_price) <= 0);
    if (invalidItem) {
      Alert.alert(
        'Incomplete Line Items',
        'Please provide a description and valid unit price for every item.'
      );
      return;
    }

    setSaving(true);
    try {
      const issueDate = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validDays);

      await QuotationService.createQuotation({
        customer_id: selectedCustomerId,
        issue_date: issueDate.toISOString().split('T')[0],
        valid_until: validUntil.toISOString().split('T')[0],
        discount: numDiscount,
        notes: notes.trim() || undefined,
        terms: terms.trim() || undefined,
        items: items.map((i) => ({
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
          tax_rate: Number(i.tax_rate) || 0,
        })),
      });

      Alert.alert('Success', 'Quotation created successfully!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      let msg = 'Failed to create quotation.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const resp = err as { response?: { data?: { detail?: string } } };
        if (resp.response?.data?.detail) {
          msg = resp.response.data.detail;
        }
      }
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Commercial Quotation</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Customer Picker */}
            <Text style={styles.sectionLabel}>Select Customer *</Text>
            {customers.length === 0 ? (
              <Text style={styles.warningNote}>
                No customers found. Please add a customer from the Customers tab first.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.customerPill,
                      selectedCustomerId === c.id && styles.customerPillActive,
                    ]}
                    onPress={() => setSelectedCustomerId(c.id)}>
                    <Text
                      style={[
                        styles.customerPillText,
                        selectedCustomerId === c.id && styles.customerPillTextActive,
                      ]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Validity Presets */}
            <Text style={styles.sectionLabel}>Quote Validity Period</Text>
            <View style={styles.pillRow}>
              {[7, 15, 30].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[styles.validPill, validDays === days && styles.validPillActive]}
                  onPress={() => setValidDays(days)}>
                  <Text
                    style={[
                      styles.validPillText,
                      validDays === days && styles.validPillTextActive,
                    ]}>
                    {days} Days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Line Items */}
            <View style={styles.itemsHeaderRow}>
              <Text style={styles.sectionLabel}>Line Items ({items.length})</Text>
              <TouchableOpacity onPress={handleAddItem} style={styles.addItemBtn}>
                <Ionicons name="add-circle" size={18} color={Colors.light.primary} />
                <Text style={styles.addItemBtnText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map((item, index) => {
              const itemSub = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
              return (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemIndex}>Item #{index + 1}</Text>
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.light.danger} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={styles.input}
                    value={item.description}
                    onChangeText={(val) => handleUpdateItem(index, 'description', val)}
                    placeholder="Item description (e.g. PVC Pipe 25mm Heavy Duty)"
                    placeholderTextColor={Colors.light.textMuted}
                  />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.subLabel}>Qty</Text>
                      <TextInput
                        style={styles.input}
                        value={String(item.quantity)}
                        onChangeText={(val) => handleUpdateItem(index, 'quantity', Number(val) || 0)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.subLabel}>Unit Price (₹)</Text>
                      <TextInput
                        style={styles.input}
                        value={String(item.unit_price)}
                        onChangeText={(val) =>
                          handleUpdateItem(index, 'unit_price', Number(val) || 0)
                        }
                        keyboardType="decimal-pad"
                        placeholder="500"
                      />
                    </View>
                  </View>

                  {/* GST Tax Rate Preset Buttons */}
                  <Text style={styles.subLabel}>GST Tax Rate (%)</Text>
                  <View style={styles.pillRow}>
                    {TAX_PRESETS.map((rate) => (
                      <TouchableOpacity
                        key={rate}
                        style={[
                          styles.taxPill,
                          item.tax_rate === rate && styles.taxPillActive,
                        ]}
                        onPress={() => handleUpdateItem(index, 'tax_rate', rate)}>
                        <Text
                          style={[
                            styles.taxPillText,
                            item.tax_rate === rate && styles.taxPillTextActive,
                          ]}>
                          {rate}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.itemSubtotalPreview}>
                    Item Subtotal: ₹{itemSub.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              );
            })}

            {/* Discount & Terms */}
            <Text style={styles.sectionLabel}>Overall Discount (₹)</Text>
            <TextInput
              style={styles.input}
              value={discount}
              onChangeText={setDiscount}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />

            <Text style={styles.sectionLabel}>Notes for Client</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Delivery within 3 working days..."
              multiline
              numberOfLines={2}
            />

            <Text style={styles.sectionLabel}>Commercial Terms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={terms}
              onChangeText={setTerms}
              placeholder="Payment within 15 days of acceptance..."
              multiline
              numberOfLines={2}
            />


            {/* Live Financial Preview Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Live Financial Preview</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  ₹{previewSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              {numDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Discount</Text>
                  <Text style={[styles.summaryValue, { color: Colors.light.danger }]}>
                    -₹{numDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Estimated GST Tax</Text>
                <Text style={styles.summaryValue}>
                  +₹{previewTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  ₹{previewTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
              <Button
                title={saving ? 'Calculating & Saving...' : 'Save Quotation'}
                variant="primary"
                loading={saving}
                onPress={handleSubmit}
                style={{ flex: 2 }}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  scrollContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginTop: 6,
    marginBottom: 4,
  },
  warningNote: {
    fontSize: 13,
    color: Colors.light.warning,
    marginVertical: 6,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  customerPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundElement,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  customerPillActive: {
    backgroundColor: Colors.light.primaryMuted,
    borderColor: Colors.light.primary,
  },
  customerPillText: {
    fontSize: 13,
    color: Colors.light.text,
    fontWeight: '500',
  },
  customerPillTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  validPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  validPillActive: {
    backgroundColor: Colors.light.primaryMuted,
    borderColor: Colors.light.primary,
  },
  validPillText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '600',
  },
  validPillTextActive: {
    color: Colors.light.primary,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addItemBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  itemCard: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  taxPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundElement,
    marginRight: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  taxPillActive: {
    backgroundColor: Colors.light.primaryMuted,
    borderColor: Colors.light.primary,
  },
  taxPillText: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '600',
  },
  taxPillTextActive: {
    color: Colors.light.primary,
  },
  itemSubtotalPreview: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  input: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 55,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: Colors.light.primaryMuted,
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 8,
    textTransform: 'uppercase',
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.primary,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 12,
  },
});
