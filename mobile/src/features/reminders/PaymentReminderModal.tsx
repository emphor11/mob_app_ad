import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import {
  Invoice,
  OutstandingInvoiceItem,
  ReminderTemplate,
  InvoiceReminder,
} from '@/types';
import { ReminderService } from '@/services/reminder';

type ToneOption = 'STANDARD' | 'GENTLE' | 'URGENT';

interface Props {
  visible: boolean;
  invoice: Invoice | OutstandingInvoiceItem | null;
  customerPhone?: string;
  customerName?: string;
  onClose: () => void;
  onReminderSent?: () => void;
}

export function PaymentReminderModal({
  visible,
  invoice,
  customerPhone: propCustomerPhone,
  customerName: propCustomerName,
  onClose,
  onReminderSent,
}: Props) {
  const initialName = propCustomerName || (invoice ? invoice.customerName : '') || '';
  const initialPhone =
    propCustomerPhone ||
    (invoice && 'customerPhone' in invoice ? invoice.customerPhone : '') ||
    '';

  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState<ReminderTemplate | null>(null);
  const [history, setHistory] = useState<InvoiceReminder[]>([]);
  const [selectedTone, setSelectedTone] = useState<ToneOption>('STANDARD');
  const [messageText, setMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState(initialPhone);
  const [recipientName, setRecipientName] = useState(initialName);

  useEffect(() => {
    let isCancelled = false;

    async function loadReminderData() {
      if (!visible || !invoice) return;

      try {
        const [tpl, hist] = await Promise.all([
          ReminderService.getReminderTemplate(invoice.id),
          ReminderService.getReminderHistory(invoice.id).catch(() => []),
        ]);
        if (isCancelled) return;
        setTemplate(tpl);
        setMessageText(tpl.standardMessage);
        setSelectedTone('STANDARD');
        setRecipientName(tpl.customerName || initialName);
        setRecipientPhone(tpl.customerPhone || initialPhone);
        setHistory(hist);
      } catch {
        if (isCancelled) return;
        const balance =
          'outstandingBalance' in invoice
            ? invoice.outstandingBalance
            : Math.max(0, invoice.total - invoice.paidAmount);
        const formatted = balance.toLocaleString('en-IN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        });
        const shortName = (initialName || 'Customer').split(' ')[0];
        const fallback = `Hi ${shortName}, this is a reminder regarding invoice ${invoice.invoiceNumber} for ₹${formatted}, which is currently pending. Please let us know once the payment is completed.`;
        setMessageText(fallback);
        setSelectedTone('STANDARD');
        setRecipientName(initialName);
        setRecipientPhone(initialPhone);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    if (visible && invoice) {
      loadReminderData();
    }

    return () => {
      isCancelled = true;
    };
  }, [visible, invoice, initialName, initialPhone]);

  if (!invoice) return null;

  const balanceDue =
    'outstandingBalance' in invoice
      ? invoice.outstandingBalance
      : Math.max(0, invoice.total - invoice.paidAmount);

  const handleToneChange = (tone: ToneOption) => {
    setSelectedTone(tone);
    if (!template) return;
    if (tone === 'STANDARD') {
      setMessageText(template.standardMessage);
    } else if (tone === 'GENTLE') {
      setMessageText(template.gentleMessage);
    } else if (tone === 'URGENT') {
      setMessageText(template.urgentMessage);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!messageText.trim()) {
      Alert.alert('Empty Message', 'Please enter a reminder message to send.');
      return;
    }

    setSending(true);
    try {
      const success = await ReminderService.openWhatsApp(
        recipientPhone,
        messageText
      );
      if (success) {
        // Record reminder log on backend
        await ReminderService.recordReminder(invoice.id, {
          channel: 'WHATSAPP',
          message: messageText,
          recipientName,
          recipientPhone: recipientPhone || undefined,
        });

        // Refresh history
        const updatedHistory = await ReminderService.getReminderHistory(
          invoice.id
        ).catch(() => []);
        setHistory(updatedHistory);

        onReminderSent?.();
        Alert.alert(
          'Reminder Sent',
          `Payment reminder for ${invoice.invoiceNumber} shared via WhatsApp.`
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to record reminder.');
    } finally {
      setSending(false);
    }
  };

  const handleShareSystem = async () => {
    if (!messageText.trim()) {
      Alert.alert('Empty Message', 'Please enter a reminder message to share.');
      return;
    }

    setSending(true);
    try {
      const shared = await ReminderService.shareViaSystem(
        messageText,
        `Payment Reminder for ${invoice.invoiceNumber}`
      );
      if (shared) {
        await ReminderService.recordReminder(invoice.id, {
          channel: 'SHARE',
          message: messageText,
          recipientName,
          recipientPhone: recipientPhone || undefined,
        });

        const updatedHistory = await ReminderService.getReminderHistory(
          invoice.id
        ).catch(() => []);
        setHistory(updatedHistory);

        onReminderSent?.();
      }
    } catch {
      // Ignored if cancelled
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Remind Customer</Text>
              <Text style={styles.headerSubtitle}>
                Invoice {invoice.invoiceNumber} • {recipientName || 'Customer'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={Colors.light.primary} />
              <Text style={styles.loadingText}>Generating reminder preview...</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled">
              {/* Outstanding Balance Banner */}
              <View style={styles.balanceCard}>
                <View style={styles.balanceInfo}>
                  <Text style={styles.balanceLabel}>Pending Balance</Text>
                  <Text style={styles.balanceAmount}>
                    ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.dueBadge}>
                  <Ionicons name="time-outline" size={14} color="#B45309" />
                  <Text style={styles.dueBadgeText}>Due: {invoice.dueDate}</Text>
                </View>
              </View>

              {/* Recipient Phone Field */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>WhatsApp / Contact Number</Text>
                <View style={styles.phoneInputContainer}>
                  <Ionicons
                    name="call-outline"
                    size={18}
                    color={Colors.light.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={styles.phoneInput}
                    value={recipientPhone}
                    onChangeText={setRecipientPhone}
                    placeholder="+91 98765 43210"
                    placeholderTextColor={Colors.light.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Tone Selection Tabs */}
              <Text style={styles.fieldLabel}>Message Tone</Text>
              <View style={styles.toneSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.toneTab,
                    selectedTone === 'STANDARD' && styles.toneTabActive,
                  ]}
                  onPress={() => handleToneChange('STANDARD')}>
                  <Text
                    style={[
                      styles.toneTabText,
                      selectedTone === 'STANDARD' && styles.toneTabTextActive,
                    ]}>
                    Standard
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toneTab,
                    selectedTone === 'GENTLE' && styles.toneTabActive,
                  ]}
                  onPress={() => handleToneChange('GENTLE')}>
                  <Text
                    style={[
                      styles.toneTabText,
                      selectedTone === 'GENTLE' && styles.toneTabTextActive,
                    ]}>
                    Gentle
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toneTab,
                    selectedTone === 'URGENT' && styles.toneTabActive,
                  ]}
                  onPress={() => handleToneChange('URGENT')}>
                  <Text
                    style={[
                      styles.toneTabText,
                      selectedTone === 'URGENT' && styles.toneTabTextActive,
                    ]}>
                    Urgent
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message Editor */}
              <View style={styles.fieldGroup}>
                <View style={styles.messageHeaderRow}>
                  <Text style={styles.fieldLabel}>Message Preview (Editable)</Text>
                  <TouchableOpacity
                    onPress={() => handleToneChange(selectedTone)}
                    style={styles.resetBtn}>
                    <Ionicons name="refresh-outline" size={14} color={Colors.light.primary} />
                    <Text style={styles.resetBtnText}>Reset</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.messageInput}
                  value={messageText}
                  onChangeText={setMessageText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {/* Primary CTA: WhatsApp */}
                <TouchableOpacity
                  style={[styles.whatsAppButton, sending && styles.btnDisabled]}
                  onPress={handleSendWhatsApp}
                  disabled={sending}
                  activeOpacity={0.85}>
                  <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
                  <Text style={styles.whatsAppButtonText}>
                    {sending ? 'Sending...' : 'Send via WhatsApp'}
                  </Text>
                </TouchableOpacity>

                {/* Secondary CTA: System Share */}
                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    style={styles.shareSheetBtn}
                    onPress={handleShareSystem}
                    disabled={sending}
                    activeOpacity={0.8}>
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color={Colors.light.text}
                    />
                    <Text style={styles.shareSheetBtnText}>Share via Other Apps</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Reminder Audit History */}
              {history.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.historyTitle}>Past Reminders</Text>
                  {history.map((rem) => {
                    const dateFormatted = new Date(rem.sentAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <View key={rem.id} style={styles.historyItem}>
                        <View style={styles.historyChannelBadge}>
                          <Ionicons
                            name={
                              rem.channel === 'WHATSAPP'
                                ? 'logo-whatsapp'
                                : 'paper-plane-outline'
                            }
                            size={14}
                            color={
                              rem.channel === 'WHATSAPP' ? '#16A34A' : Colors.light.primary
                            }
                          />
                          <Text style={styles.historyChannelText}>{rem.channel}</Text>
                        </View>
                        <Text style={styles.historyDateText}>{dateFormatted}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  scrollContent: {
    padding: 16,
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  balanceInfo: {},
  balanceLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#B45309',
    marginTop: 2,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  dueBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 6,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.text,
  },
  toneSelectorRow: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundElement,
    padding: 4,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  toneTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toneTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toneTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.textSecondary,
  },
  toneTabTextActive: {
    color: Colors.light.primary,
    fontWeight: '700',
  },
  messageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  resetBtnText: {
    fontSize: 12,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  messageInput: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.light.text,
    minHeight: 100,
    lineHeight: 20,
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 16,
  },
  whatsAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsAppButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  shareSheetBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  shareSheetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  historySection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  historyChannelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyChannelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  historyDateText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
