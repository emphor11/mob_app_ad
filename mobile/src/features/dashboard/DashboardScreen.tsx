import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import {
  MOCK_BUSINESS,
  MOCK_METRICS,
  MOCK_QUOTATIONS,
  MOCK_INVOICES,
} from '@/constants/mockData';

export function DashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Business Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.businessName}>{MOCK_BUSINESS.name}</Text>
            <Text style={styles.ownerSubtitle}>Welcome back, {MOCK_BUSINESS.ownerName}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/(tabs)/profile')}
            activeOpacity={0.7}>
            <Ionicons name="person-circle" size={32} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>

        {/* Overdue Alert Banner */}
        {MOCK_METRICS.overdueAmount > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="alert-circle" size={20} color={Colors.light.danger} />
            <Text style={styles.alertText}>
              ₹{MOCK_METRICS.overdueAmount.toLocaleString('en-IN')} in invoices is currently overdue.
            </Text>
          </View>
        )}

        {/* Financial KPI Summary Grid */}
        <View style={styles.kpiGrid}>
          <Card style={[styles.kpiCard, styles.kpiCardSales]}>
            <Text style={styles.kpiLabel}>Total Sales</Text>
            <Text style={styles.kpiValue}>
              ₹{MOCK_METRICS.totalSales.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>All issued invoices</Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardCollected]}>
            <Text style={styles.kpiLabel}>Total Collected</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.success }]}>
              ₹{MOCK_METRICS.totalCollected.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>Cleared payments</Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardOutstanding]}>
            <Text style={styles.kpiLabel}>Outstanding</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.warning }]}>
              ₹{MOCK_METRICS.outstandingBalance.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>Pending collection</Text>
          </Card>

          <Card style={[styles.kpiCard, styles.kpiCardOverdue]}>
            <Text style={styles.kpiLabel}>Overdue</Text>
            <Text style={[styles.kpiValue, { color: Colors.light.danger }]}>
              ₹{MOCK_METRICS.overdueAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.kpiSub}>Action required</Text>
          </Card>
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

        {MOCK_QUOTATIONS.slice(0, 2).map((quote) => (
          <Card key={quote.id} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemNumber}>{quote.quotationNumber}</Text>
              <StatusBadge status={quote.status} />
            </View>
            <Text style={styles.customerName}>{quote.customerName}</Text>
            <View style={styles.itemCardFooter}>
              <Text style={styles.itemDate}>Valid till: {quote.validUntil}</Text>
              <Text style={styles.itemAmount}>₹{quote.total.toLocaleString('en-IN')}</Text>
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

        {MOCK_INVOICES.slice(0, 2).map((inv) => (
          <Card key={inv.id} style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
              <Text style={styles.itemNumber}>{inv.invoiceNumber}</Text>
              <StatusBadge status={inv.status} />
            </View>
            <Text style={styles.customerName}>{inv.customerName}</Text>
            <View style={styles.itemCardFooter}>
              <Text style={styles.itemDate}>Due: {inv.dueDate}</Text>
              <View style={styles.amountCol}>
                <Text style={styles.itemAmount}>₹{inv.total.toLocaleString('en-IN')}</Text>
                {inv.paidAmount < inv.total && (
                  <Text style={styles.pendingAmount}>
                    Pending: ₹{(inv.total - inv.paidAmount).toLocaleString('en-IN')}
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
    fontWeight: '700',
    color: Colors.light.text,
  },
  ownerSubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  profileBtn: {
    padding: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.dangerBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertText: {
    fontSize: 13,
    color: Colors.light.danger,
    marginLeft: 8,
    fontWeight: '600',
    flex: 1,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    padding: 14,
    marginVertical: 4,
  },
  kpiCardSales: {},
  kpiCardCollected: {},
  kpiCardOutstanding: {},
  kpiCardOverdue: {},
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 6,
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginVertical: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 6,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickActionBtn: {
    alignItems: 'center',
    width: '23%',
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
  },
  itemCard: {
    padding: 14,
    marginVertical: 5,
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemNumber: {
    fontSize: 14,
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
    color: Colors.light.danger,
    fontWeight: '600',
    marginTop: 2,
  },
});
