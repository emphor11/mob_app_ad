import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Quotation, Invoice, Business } from '@/types';
import { BusinessService } from '@/services/business';
import { QuotationService } from '@/services/quotation';
import { InvoiceService } from '@/services/invoice';
import { PaymentService } from '@/services/payment';
import {
  MOCK_BUSINESS,
  MOCK_METRICS,
  MOCK_QUOTATIONS,
  MOCK_INVOICES,
} from '@/constants/mockData';

export function DashboardScreen() {
  const router = useRouter();
  const [business, setBusiness] = useState<Business>(MOCK_BUSINESS);
  const [quotations, setQuotations] = useState<Quotation[]>(MOCK_QUOTATIONS);
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [metrics, setMetrics] = useState({
    totalSales: MOCK_METRICS.totalSales,
    totalCollected: MOCK_METRICS.totalCollected,
    outstandingBalance: MOCK_METRICS.outstandingBalance,
    overdueAmount: MOCK_METRICS.overdueAmount,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(() => {
    BusinessService.getMyBusiness()
      .then((b) => {
        if (b) setBusiness(b);
      })
      .catch(() => {});

    PaymentService.getOutstandingPayments()
      .then((res) => {
        setMetrics({
          totalSales: res.metrics.totalPaid + res.metrics.totalOutstanding,
          totalCollected: res.metrics.totalPaid,
          outstandingBalance: res.metrics.totalOutstanding,
          overdueAmount: res.metrics.totalOverdue,
        });
      })
      .catch(() => {});

    QuotationService.getQuotations()
      .then((data) => {
        if (data.length > 0) setQuotations(data);
      })
      .catch(() => {});

    InvoiceService.getInvoices()
      .then((data) => {
        if (data.length > 0) setInvoices(data);
        setRefreshing(false);
      })
      .catch(() => {
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Top Business Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{business.name}</Text>
            <Text style={styles.ownerSubtitle}>Welcome back, {business.ownerName}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}>
            <Ionicons name="person-circle" size={32} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        {/* Overdue Alert Banner */}
        {metrics.overdueAmount > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/payments')}
            style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.light.danger} />
            <Text style={styles.alertText}>
              ₹{metrics.overdueAmount.toLocaleString('en-IN')} in invoices is currently overdue. Tap to view.
            </Text>
          </TouchableOpacity>
        )}

        {/* Financial KPI Summary Grid */}
        <View style={styles.kpiGrid}>
          <Card style={[styles.kpiCard, styles.kpiCardSales]}>
            <Text style={styles.kpiLabel}>Total Sales</Text>
            <Text style={styles.kpiValue}>
              ₹{metrics.totalSales.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiSub}>All issued invoices</Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardCollected]}>
            <Text style={styles.kpiLabel}>Total Collected</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.success }]}>
              ₹{metrics.totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </Text>
            <Text style={styles.kpiSub}>Cleared payments</Text>
          </Card>

          <TouchableOpacity
            style={{ flex: 1, minWidth: '47%' }}
            activeOpacity={0.8}
            onPress={() => router.push('/payments')}>
            <Card style={[styles.kpiCard, styles.kpiCardOutstanding]}>
              <Text style={styles.kpiLabel}>Outstanding</Text>
              <Text style={[styles.kpiValue, { color: Colors.light.warning }]}>
                ₹{metrics.outstandingBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiSub}>Pending collection →</Text>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, minWidth: '47%' }}
            activeOpacity={0.8}
            onPress={() => router.push('/payments')}>
            <Card style={[styles.kpiCard, styles.kpiCardOverdue]}>
              <Text style={styles.kpiLabel}>Overdue</Text>
              <Text style={[styles.kpiValue, { color: Colors.light.danger }]}>
                ₹{metrics.overdueAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </Text>
              <Text style={styles.kpiSub}>Action required →</Text>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Quick Action Shortcuts */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/quotations')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="document-text" size={22} color={Colors.light.primary} />
            </View>
            <Text style={styles.actionText}>Quotations</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/invoices')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconBg, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="receipt" size={22} color={Colors.light.success} />
            </View>
            <Text style={styles.actionText}>Invoices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/(tabs)/customers')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconBg, { backgroundColor: '#FFFBEB' }]}>
              <Ionicons name="people" size={22} color={Colors.light.warning} />
            </View>
            <Text style={styles.actionText}>Customers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionBtn}
            onPress={() => router.push('/payments')}
            activeOpacity={0.7}>
            <View style={[styles.actionIconBg, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="cash" size={22} color="#9333EA" />
            </View>
            <Text style={styles.actionText}>Payments</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Quotations */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Quotations</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/quotations')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {quotations.slice(0, 2).map((quote) => (
          <Card key={quote.id} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemNumber}>{quote.quotationNumber}</Text>
              <StatusBadge status={quote.status} />
            </View>
            <Text style={styles.customerName}>{quote.customerName}</Text>
            <View style={styles.itemCardFooter}>
              <Text style={styles.itemDate}>Valid till: {quote.validUntil}</Text>
              <Text style={styles.itemAmount}>
                ₹{quote.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </Card>
        ))}

        {/* Recent Invoices */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/invoices')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {invoices.slice(0, 2).map((inv) => (
          <Card key={inv.id} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemNumber}>{inv.invoiceNumber}</Text>
              <StatusBadge status={inv.status} />
            </View>
            <Text style={styles.customerName}>{inv.customerName}</Text>
            <View style={styles.itemCardFooter}>
              <Text style={styles.itemDate}>Due: {inv.dueDate}</Text>
              <View style={styles.amountCol}>
                <Text style={styles.itemAmount}>
                  ₹{inv.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
                {inv.paidAmount < inv.total && (
                  <Text style={styles.pendingAmount}>
                    Pending: ₹{(inv.total - inv.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
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
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessName: {
    fontSize: 20,
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  alertText: {
    fontSize: 13,
    color: Colors.light.danger,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '47%',
    padding: 14,
  },
  kpiCardSales: {
    backgroundColor: Colors.light.card,
  },
  kpiCardCollected: {
    backgroundColor: Colors.light.card,
  },
  kpiCardOutstanding: {
    backgroundColor: Colors.light.card,
  },
  kpiCardOverdue: {
    backgroundColor: Colors.light.card,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.light.text,
    marginVertical: 4,
  },
  kpiSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickActionBtn: {
    alignItems: 'center',
    flex: 1,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  itemCard: {
    padding: 14,
    marginBottom: 10,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
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
    color: Colors.light.textMuted,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.text,
  },
  pendingAmount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.danger,
    marginTop: 2,
  },
});
