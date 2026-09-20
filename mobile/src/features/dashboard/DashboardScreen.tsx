import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import {
  DashboardData,
  DashboardOverdueInvoice,
  Invoice,
  PaymentMethod,
} from '@/types';
import { DashboardService } from '@/services/dashboard';
import { PaymentReminderModal } from '@/features/reminders/PaymentReminderModal';

function formatINR(amount: number): string {
  return amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });
}

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

function getPaymentMethodIcon(method: PaymentMethod): string {
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
      return 'wallet-outline';
  }
}

export function DashboardScreen() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reminders Modal
  const [reminderInvoice, setReminderInvoice] = useState<DashboardOverdueInvoice | Invoice | null>(null);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);

  const loadData = useCallback(() => {
    DashboardService.getDashboardData()
      .then((res) => {
        setData(res);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleRemindOverdue = (item: DashboardOverdueInvoice) => {
    setReminderInvoice(item as any);
    setReminderModalVisible(true);
  };

  const metrics = data?.metrics || {
    totalSales: 0,
    totalCollected: 0,
    outstanding: 0,
    overdue: 0,
    customersCount: 0,
    quotationsCount: 0,
    invoicesCount: 0,
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        {/* Top Business Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{data?.businessName || 'SmartQuote'}</Text>
            <Text style={styles.ownerSubtitle}>
              Welcome back, {data?.ownerName || 'Business Owner'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}>
            <Ionicons name="person-circle" size={34} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        {loading && !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading business dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Primary Financial KPI Summary Grid */}
            <View style={styles.kpiGrid}>
              {/* Total Sales */}
              <Card style={[styles.kpiCard, styles.kpiCardSales]}>
                <Text style={styles.kpiValue}>₹{formatINR(metrics.totalSales)}</Text>
                <Text style={styles.kpiLabel}>Total Sales</Text>
                <Text style={styles.kpiSub}>All issued invoices</Text>
              </Card>

              {/* Total Collected */}
              <Card style={[styles.kpiCard, styles.kpiCardCollected]}>
                <Text style={[styles.kpiValue, { color: Colors.light.success }]}>
                  ₹{formatINR(metrics.totalCollected)}
                </Text>
                <Text style={styles.kpiLabel}>Collected</Text>
                <Text style={styles.kpiSub}>Cleared payments</Text>
              </Card>

              {/* Outstanding */}
              <TouchableOpacity
                style={styles.kpiCol}
                activeOpacity={0.8}
                onPress={() => router.push('/payments')}>
                <Card style={[styles.kpiCard, styles.kpiCardOutstanding]}>
                  <Text style={[styles.kpiValue, { color: '#B45309' }]}>
                    ₹{formatINR(metrics.outstanding)}
                  </Text>
                  <Text style={styles.kpiLabel}>Outstanding</Text>
                  <Text style={[styles.kpiSub, { color: '#B45309' }]}>Pending balance →</Text>
                </Card>
              </TouchableOpacity>

              {/* Overdue */}
              <TouchableOpacity
                style={styles.kpiCol}
                activeOpacity={0.8}
                onPress={() => router.push('/payments')}>
                <Card style={[styles.kpiCard, styles.kpiCardOverdue]}>
                  <Text style={[styles.kpiValue, { color: Colors.light.danger }]}>
                    ₹{formatINR(metrics.overdue)}
                  </Text>
                  <Text style={styles.kpiLabel}>Overdue</Text>
                  <Text style={[styles.kpiSub, { color: Colors.light.danger }]}>Needs follow-up →</Text>
                </Card>
              </TouchableOpacity>
            </View>

            {/* Business Counters Row */}
            <View style={styles.counterPillsRow}>
              <TouchableOpacity
                style={styles.counterPill}
                onPress={() => router.push('/(tabs)/customers')}
                activeOpacity={0.7}>
                <Ionicons name="people-outline" size={16} color={Colors.light.primary} />
                <Text style={styles.counterCount}>{metrics.customersCount}</Text>
                <Text style={styles.counterLabel}>Customers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.counterPill}
                onPress={() => router.push('/(tabs)/quotations')}
                activeOpacity={0.7}>
                <Ionicons name="document-text-outline" size={16} color={Colors.light.primary} />
                <Text style={styles.counterCount}>{metrics.quotationsCount}</Text>
                <Text style={styles.counterLabel}>Quotations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.counterPill}
                onPress={() => router.push('/(tabs)/invoices')}
                activeOpacity={0.7}>
                <Ionicons name="receipt-outline" size={16} color={Colors.light.primary} />
                <Text style={styles.counterCount}>{metrics.invoicesCount}</Text>
                <Text style={styles.counterLabel}>Invoices</Text>
              </TouchableOpacity>
            </View>

            {/* Overdue Invoices Alert Section */}
            {data && data.overdueInvoices && data.overdueInvoices.length > 0 && (
              <View style={styles.sectionContainer}>
                <View style={styles.overdueSectionHeader}>
                  <View style={styles.overdueTitleGroup}>
                    <Ionicons name="alert-circle" size={18} color={Colors.light.danger} />
                    <Text style={styles.overdueSectionTitle}>Overdue Invoices</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/payments')}>
                    <Text style={styles.viewAllText}>View All ({data.overdueInvoices.length})</Text>
                  </TouchableOpacity>
                </View>

                {data.overdueInvoices.slice(0, 3).map((item) => (
                  <Card key={item.id} style={styles.overdueCard}>
                    <View style={styles.overdueCardTop}>
                      <View>
                        <Text style={styles.overdueInvNum}>{item.invoiceNumber}</Text>
                        <Text style={styles.overdueCustomerName}>{item.customerName}</Text>
                      </View>
                      <View style={styles.daysOverdueBadge}>
                        <Text style={styles.daysOverdueText}>{item.daysOverdue}d overdue</Text>
                      </View>
                    </View>

                    <View style={styles.overdueCardBottom}>
                      <View>
                        <Text style={styles.overdueDueLabel}>Due: {formatDisplayDate(item.dueDate)}</Text>
                        <Text style={styles.overdueBalanceText}>
                          ₹{formatINR(item.remainingAmount)} pending
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.remindOverdueBtn}
                        onPress={() => handleRemindOverdue(item)}
                        activeOpacity={0.8}>
                        <Ionicons name="notifications-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.remindOverdueBtnText}>Remind</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}

            {/* Recent Quotations */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Quotations</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/quotations')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {data && data.recentQuotations && data.recentQuotations.length > 0 ? (
                data.recentQuotations.slice(0, 3).map((q) => (
                  <Card key={q.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={styles.itemNumber}>{q.quotationNumber}</Text>
                      <StatusBadge status={q.status} />
                    </View>
                    <Text style={styles.customerName}>{q.customerName}</Text>
                    <View style={styles.itemCardFooter}>
                      <Text style={styles.itemDate}>Valid till: {formatDisplayDate(q.validUntil)}</Text>
                      <Text style={styles.itemAmount}>
                        ₹{q.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyFeedBox}>
                  <Text style={styles.emptyFeedText}>No quotations created yet.</Text>
                </View>
              )}
            </View>

            {/* Recent Invoices */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Invoices</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/invoices')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {data && data.recentInvoices && data.recentInvoices.length > 0 ? (
                data.recentInvoices.slice(0, 3).map((inv) => (
                  <Card key={inv.id} style={styles.itemCard}>
                    <View style={styles.itemCardHeader}>
                      <Text style={styles.itemNumber}>{inv.invoiceNumber}</Text>
                      <StatusBadge status={inv.status} />
                    </View>
                    <Text style={styles.customerName}>{inv.customerName}</Text>
                    <View style={styles.itemCardFooter}>
                      <Text style={styles.itemDate}>Due: {formatDisplayDate(inv.dueDate)}</Text>
                      <View style={styles.amountCol}>
                        <Text style={styles.itemAmount}>
                          ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                        {inv.remainingAmount > 0 && (
                          <Text style={styles.pendingAmount}>
                            Pending: ₹{inv.remainingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyFeedBox}>
                  <Text style={styles.emptyFeedText}>No invoices issued yet.</Text>
                </View>
              )}
            </View>

            {/* Recent Payments */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Payments</Text>
                <TouchableOpacity onPress={() => router.push('/payments')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {data && data.recentPayments && data.recentPayments.length > 0 ? (
                data.recentPayments.slice(0, 3).map((p) => (
                  <Card key={p.id} style={styles.paymentCard}>
                    <View style={styles.paymentCardLeft}>
                      <View style={styles.paymentIconBox}>
                        <Ionicons
                          name={getPaymentMethodIcon(p.method) as any}
                          size={18}
                          color={Colors.light.primary}
                        />
                      </View>
                      <View>
                        <Text style={styles.paymentCustomerName}>{p.customerName}</Text>
                        <Text style={styles.paymentSubtext}>
                          Inv: {p.invoiceNumber} • {formatDisplayDate(p.paymentDate)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.paymentCardRight}>
                      <Text style={styles.paymentAmount}>
                        +₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </Text>
                      <View style={styles.paymentMethodTag}>
                        <Text style={styles.paymentMethodText}>{p.method.replace('_', ' ')}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              ) : (
                <View style={styles.emptyFeedBox}>
                  <Text style={styles.emptyFeedText}>No payments recorded yet.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        visible={reminderModalVisible}
        invoice={reminderInvoice}
        customerPhone={
          reminderInvoice && 'customerPhone' in reminderInvoice
            ? reminderInvoice.customerPhone
            : undefined
        }
        customerName={reminderInvoice?.customerName}
        onClose={() => {
          setReminderModalVisible(false);
          setReminderInvoice(null);
        }}
        onReminderSent={loadData}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  ownerSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  profileBtn: {
    padding: 2,
  },
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCol: {
    flex: 1,
    minWidth: '47%',
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 14,
    borderRadius: 12,
  },
  kpiCardSales: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  kpiCardCollected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  kpiCardOutstanding: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  kpiCardOverdue: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.light.text,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  counterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  counterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  counterCount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  counterLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  overdueSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  overdueTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  overdueSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.danger,
  },
  overdueCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  overdueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  overdueInvNum: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  overdueCustomerName: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  daysOverdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  daysOverdueText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.danger,
  },
  overdueCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    paddingTop: 8,
  },
  overdueDueLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
  },
  overdueBalanceText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.light.danger,
    marginTop: 1,
  },
  remindOverdueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  remindOverdueBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemCard: {
    padding: 14,
    marginBottom: 8,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  customerName: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginBottom: 8,
  },
  itemCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 8,
  },
  itemDate: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  pendingAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.danger,
    marginTop: 2,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  paymentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  paymentSubtext: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  paymentCardRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.light.success,
  },
  paymentMethodTag: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  paymentMethodText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  emptyFeedBox: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  emptyFeedText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
