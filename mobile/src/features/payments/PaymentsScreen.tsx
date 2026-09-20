import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import {
  OutstandingMetrics,
  OutstandingInvoiceItem,
  PaymentCategoryFilter,
  Invoice,
} from '@/types';
import { PaymentService } from '@/services/payment';
import { InvoiceService } from '@/services/invoice';
import { RecordPaymentModal } from '@/features/payments/RecordPaymentModal';
import { InvoiceDetailModal } from '@/features/invoices/InvoiceDetailModal';
import { PaymentReminderModal } from '@/features/reminders/PaymentReminderModal';

const FILTER_TABS: { label: string; value: PaymentCategoryFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Paid', value: 'PAID' },
];

function formatDisplayDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  } catch {
    // Fallback
  }
  return dateStr;
}

export function PaymentsScreen() {
  const [activeFilter, setActiveFilter] = useState<PaymentCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<OutstandingInvoiceItem[]>([]);
  const [metrics, setMetrics] = useState<OutstandingMetrics>({
    totalOutstanding: 0,
    totalOverdue: 0,
    totalPartiallyPaid: 0,
    totalPaid: 0,
    outstandingCount: 0,
    overdueCount: 0,
    partiallyPaidCount: 0,
    paidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
  const [recordPaymentVisible, setRecordPaymentVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [reminderItem, setReminderItem] = useState<OutstandingInvoiceItem | null>(null);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const loadData = useCallback(
    (filter: PaymentCategoryFilter, search?: string) => {
      PaymentService.getOutstandingPayments(filter, search)
        .then((data) => {
          setMetrics(data.metrics);
          setItems(data.items);
          setLoading(false);
          setRefreshing(false);
        })
        .catch(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    []
  );

  // Debounced search watcher
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData(activeFilter, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeFilter, searchQuery, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(activeFilter, searchQuery);
  };

  const handleOpenRecordPayment = async (item: OutstandingInvoiceItem) => {
    try {
      const fullInvoice = await InvoiceService.getInvoiceById(item.id);
      setInvoiceToPay(fullInvoice);
      setRecordPaymentVisible(true);
    } catch {
      Alert.alert('Error', 'Could not load invoice details for recording payment.');
    }
  };

  const handleOpenDetail = async (item: OutstandingInvoiceItem) => {
    try {
      const fullInvoice = await InvoiceService.getInvoiceById(item.id);
      setSelectedInvoice(fullInvoice);
      setDetailModalVisible(true);
    } catch {
      Alert.alert('Error', 'Could not load invoice details.');
    }
  };

  const handlePaymentRecorded = () => {
    loadData(activeFilter, searchQuery);
  };

  const handleSendReminder = (item: OutstandingInvoiceItem) => {
    setReminderItem(item);
    setReminderModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Outstanding Payments"
        subtitle={`${metrics.outstandingCount} active pending collections`}
        canGoBack
      />

      <View style={styles.container}>
        {/* KPI Summary Grid: Outstanding, Overdue, Partially Paid, Paid */}
        <View style={styles.kpiGrid}>
          <Card style={[styles.kpiCard, styles.kpiCardOutstanding]}>
            <Text style={styles.kpiLabel}>Outstanding</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.primary }]}>
              ₹{metrics.totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiCount}>{metrics.outstandingCount} pending invoices</Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardOverdue]}>
            <Text style={styles.kpiLabel}>Overdue</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.danger }]}>
              ₹{metrics.totalOverdue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={[styles.kpiCount, { color: Colors.light.danger }]}>
              {metrics.overdueCount} need follow-up
            </Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardPartial]}>
            <Text style={styles.kpiLabel}>Partially Paid</Text>
            <Text style={[styles.kpiValue, { color: '#B45309' }]}>
              ₹{metrics.totalPartiallyPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiCount}>{metrics.partiallyPaidCount} in progress</Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardPaid]}>
            <Text style={styles.kpiLabel}>Paid</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.success }]}>
              ₹{metrics.totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiCount}>{metrics.paidCount} cleared</Text>
          </Card>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client (e.g. Raj Traders) or invoice..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Filter Tabs: All, Pending, Overdue, Paid */}
        <View style={styles.filterScroll}>
          {FILTER_TABS.map((tab) => {
            const isSelected = activeFilter === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                style={[styles.filterTab, isSelected && styles.activeFilterTab]}
                onPress={() => setActiveFilter(tab.value)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.activeFilterTabText,
                  ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Outstanding Invoice List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="checkmark-circle-outline" size={48} color={Colors.light.success} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.textSecondary, marginTop: 12 }}>
                  No Outstanding Invoices
                </Text>
                <Text style={{ fontSize: 13, color: Colors.light.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 24 }}>
                  All invoices in this category are up to date.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const dueFormatted = formatDisplayDate(item.dueDate);

              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleOpenDetail(item)}>
                  <Card style={[styles.invoiceCard, item.isOverdue ? styles.overdueCardBorder : undefined]}>
                    {/* Top Row: Client Name + Category Badge */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerName}>{item.customerName}</Text>
                        <Text style={styles.invoiceNumber}>Invoice {item.invoiceNumber}</Text>
                      </View>
                      {item.paymentCategory === 'OVERDUE' && (
                        <View style={[styles.categoryBadge, styles.badgeOverdue]}>
                          <Ionicons name="alert-circle" size={12} color="#DC2626" />
                          <Text style={[styles.categoryBadgeText, { color: '#DC2626' }]}>Overdue</Text>
                        </View>
                      )}
                      {item.paymentCategory === 'PENDING' && (
                        <View style={[styles.categoryBadge, styles.badgePending]}>
                          <Text style={[styles.categoryBadgeText, { color: '#2563EB' }]}>
                            {item.paidAmount > 0 ? 'Partial' : 'Pending'}
                          </Text>
                        </View>
                      )}
                      {item.paymentCategory === 'PAID' && (
                        <View style={[styles.categoryBadge, styles.badgePaid]}>
                          <Ionicons name="checkmark" size={12} color="#16A34A" />
                          <Text style={[styles.categoryBadgeText, { color: '#16A34A' }]}>Paid</Text>
                        </View>
                      )}
                    </View>

                    {/* Middle Row: Outstanding Amount + Due Date */}
                    <View style={styles.cardMiddle}>
                      <View>
                        <Text style={styles.outstandingLabel}>Outstanding Balance</Text>
                        <Text
                          style={[
                            styles.outstandingAmount,
                            item.outstandingBalance > 0 ? styles.dueText : styles.paidText,
                          ]}>
                          ₹{item.outstandingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.dueLabel}>Due Date</Text>
                        <Text
                          style={[
                            styles.dueValue,
                            item.isOverdue && styles.dueOverdueText,
                          ]}>
                          {item.isOverdue ? `Overdue (${dueFormatted})` : `Due: ${dueFormatted}`}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar / Payment Breakdown */}
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${Math.min(100, Math.max(0, (item.paidAmount / (item.total || 1)) * 100))}%`,
                              backgroundColor: item.outstandingBalance === 0 ? Colors.light.success : Colors.light.primary,
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.progressTextRow}>
                        <Text style={styles.progressText}>
                          Paid: ₹{item.paidAmount.toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.progressText}>
                          Total: ₹{item.total.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Bottom Action Buttons: Record Payment, Remind, View */}
                    <View style={styles.cardActions}>
                      <Button
                        title="View"
                        variant="outline"
                        size="small"
                        icon={<Ionicons name="eye-outline" size={14} color={Colors.light.primary} />}
                        onPress={() => handleOpenDetail(item)}
                        style={styles.actionBtn}
                      />

                      {item.outstandingBalance > 0 && (
                        <Button
                          title="Remind"
                          variant="outline"
                          size="small"
                          icon={<Ionicons name="logo-whatsapp" size={14} color="#16A34A" />}
                          onPress={() => handleSendReminder(item)}
                          style={styles.actionBtn}
                        />
                      )}

                      {item.outstandingBalance > 0 && (
                        <Button
                          title="Record Payment"
                          variant="primary"
                          size="small"
                          icon={<Ionicons name="card-outline" size={14} color="#FFFFFF" />}
                          onPress={() => handleOpenRecordPayment(item)}
                          style={styles.actionBtn}
                        />
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        visible={recordPaymentVisible}
        invoice={invoiceToPay}
        onClose={() => {
          setRecordPaymentVisible(false);
          setInvoiceToPay(null);
        }}
        onPaymentRecorded={handlePaymentRecorded}
      />

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        visible={detailModalVisible}
        invoice={selectedInvoice}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedInvoice(null);
        }}
        onUpdated={() => loadData(activeFilter, searchQuery)}
      />

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        visible={reminderModalVisible}
        invoice={reminderItem}
        customerPhone={reminderItem?.customerPhone}
        customerName={reminderItem?.customerName}
        onClose={() => {
          setReminderModalVisible(false);
          setReminderItem(null);
        }}
        onReminderSent={() => loadData(activeFilter, searchQuery)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 12,
  },
  kpiCardOutstanding: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  kpiCardOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  kpiCardPartial: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiCardPaid: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  kpiCount: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: Colors.light.text,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  activeFilterTab: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
  },
  invoiceCard: {
    padding: 14,
    marginVertical: 6,
  },
  overdueCardBorder: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.danger,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginTop: 1,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  badgePending: {
    backgroundColor: '#DBEAFE',
  },
  badgePaid: {
    backgroundColor: '#DCFCE7',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  outstandingLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  outstandingAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  dueText: {
    color: Colors.light.danger,
  },
  paidText: {
    color: Colors.light.success,
  },
  dueLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginBottom: 2,
  },
  dueValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  dueOverdueText: {
    color: Colors.light.danger,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionBtn: {
    marginLeft: 0,
  },
});
