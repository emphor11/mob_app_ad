import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Invoice, Payment, PaymentMethod } from '@/types';
import { PaymentService } from '@/services/payment';
import { InvoiceService } from '@/services/invoice';

interface Props {
  visible: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onPaymentRecorded: (payment: Payment, updatedInvoice: Invoice) => void;
}

const PAYMENT_METHODS: { label: string; value: PaymentMethod; icon: string }[] = [
  { label: 'UPI', value: 'UPI', icon: 'phone-portrait-outline' },
  { label: 'Cash', value: 'CASH', icon: 'cash-outline' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', icon: 'business-outline' },
  { label: 'Card', value: 'CARD', icon: 'card-outline' },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal-circle-outline' },
];

interface FormProps {
  invoice: Invoice;
  onClose: () => void;
  onPaymentRecorded: (payment: Payment, updatedInvoice: Invoice) => void;
}

function RecordPaymentForm({ invoice, onClose, onPaymentRecorded }: FormProps) {
  const remaining = Math.max(0, invoice.total - invoice.paidAmount);
  const [amount, setAmount] = useState(remaining > 0 ? remaining.toString() : '');
  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  const enteredAmount = parseFloat(amount) || 0;
  const isOverpayment = enteredAmount > remaining;
  const isInvalidAmount = enteredAmount <= 0 || isOverpayment;

  const handleFillFullAmount = () => {
    setAmount(remaining.toString());
  };

  const handleSubmit = async () => {
    if (enteredAmount <= 0) {
      Alert.alert('Invalid Amount', 'Payment amount must be greater than ₹0.');
      return;
    }

    if (isOverpayment) {
      Alert.alert(
        'Overpayment Not Allowed',
        `Payment amount (₹${enteredAmount.toLocaleString('en-IN')}) cannot exceed remaining balance (₹${remaining.toLocaleString('en-IN')}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payment = await PaymentService.recordPayment(invoice.id, {
        amount: enteredAmount,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        method,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // Refetch updated invoice from backend to get verified status and paid_amount
      const updatedInvoice = await InvoiceService.getInvoiceById(invoice.id);

      Alert.alert(
        'Payment Recorded!',
        `Recorded ₹${enteredAmount.toLocaleString('en-IN')} via ${method} for invoice ${invoice.invoiceNumber}.`
      );
      onPaymentRecorded(payment, updatedInvoice);
      onClose();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to record payment. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      {/* Invoice Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Client</Text>
          <Text style={styles.summaryValBold}>{invoice.customerName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Invoice Amount</Text>
          <Text style={styles.summaryVal}>
            ₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Already Paid</Text>
          <Text style={[styles.summaryVal, { color: Colors.light.success }]}>
            ₹{invoice.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.balanceDueRow]}>
          <Text style={styles.balanceDueLabel}>Remaining Balance Due</Text>
          <Text style={styles.balanceDueValue}>
            ₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Amount Field */}
      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Payment Amount (₹) *</Text>
          {remaining > 0 && enteredAmount !== remaining && (
            <TouchableOpacity onPress={handleFillFullAmount}>
              <Text style={styles.fillFullText}>Pay Full (₹{remaining.toLocaleString('en-IN')})</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[styles.input, isOverpayment && styles.inputError]}
          keyboardType="numeric"
          placeholder="0.00"
          value={amount}
          onChangeText={setAmount}
          placeholderTextColor={Colors.light.textMuted}
        />
        {isOverpayment && (
          <Text style={styles.errorText}>
            Amount exceeds remaining balance of ₹{remaining.toLocaleString('en-IN')}
          </Text>
        )}
      </View>

      {/* Payment Method Selector */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Payment Method *</Text>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((m) => {
            const isSelected = method === m.value;
            return (
              <TouchableOpacity
                key={m.value}
                style={[styles.methodCard, isSelected && styles.methodCardSelected]}
                onPress={() => setMethod(m.value)}
                activeOpacity={0.7}>
                <Ionicons
                  name={m.icon as any}
                  size={18}
                  color={isSelected ? '#FFFFFF' : Colors.light.primary}
                />
                <Text
                  style={[
                    styles.methodText,
                    isSelected && styles.methodTextSelected,
                  ]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Payment Date */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Payment Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={paymentDate}
          onChangeText={setPaymentDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.light.textMuted}
        />
      </View>

      {/* Transaction Reference / UTR */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Reference / UTR / Cheque #</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. UPI Ref, NEFT UTR, Cheque No."
          value={reference}
          onChangeText={setReference}
          placeholderTextColor={Colors.light.textMuted}
        />
      </View>

      {/* Payment Notes */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional notes regarding this transaction..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.light.textMuted}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        <Button
          title="Cancel"
          variant="outline"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <Button
          title={submitting ? 'Recording...' : 'Confirm Payment'}
          variant="primary"
          loading={submitting}
          disabled={isInvalidAmount}
          onPress={handleSubmit}
          style={{ flex: 1.5 }}
        />
      </View>
    </ScrollView>
  );
}

export function RecordPaymentModal({
  visible,
  invoice,
  onClose,
  onPaymentRecorded,
}: Props) {
  if (!visible || !invoice) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <Text style={styles.modalSubtitle}>Invoice {invoice.invoiceNumber}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          <RecordPaymentForm
            key={`${invoice.id}-${invoice.paidAmount}`}
            invoice={invoice}
            onClose={onClose}
            onPaymentRecorded={onPaymentRecorded}
          />
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
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  modalSubtitle: {
    fontSize: 13,
    color: Colors.light.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  summaryValBold: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
  },
  balanceDueRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 6,
    paddingTop: 8,
  },
  balanceDueLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.danger,
  },
  balanceDueValue: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.danger,
  },
  formGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  fillFullText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  input: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
  },
  inputError: {
    borderColor: Colors.light.danger,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 12,
    marginTop: 4,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 6,
  },
  methodCardSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  methodTextSelected: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
});
