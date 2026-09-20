import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { Invoice, InvoiceStatus } from '@/types';
import { InvoiceService } from '@/services/invoice';
import { MOCK_INVOICES } from '@/constants/mockData';

const FILTER_TABS: (InvoiceStatus | 'ALL')[] = [
  'ALL',
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
];

export function InvoicesScreen() {
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus | 'ALL'>('ALL');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = React.useCallback((filter: InvoiceStatus | 'ALL') => {
    InvoiceService.getInvoices(filter)
      .then((data) => {
        setInvoices(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setInvoices((prev) => (prev.length === 0 ? MOCK_INVOICES : prev));
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  React.useEffect(() => {
    loadInvoices(activeFilter);
  }, [activeFilter, loadInvoices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvoices(activeFilter);
  };

  const filteredInvoices = invoices.filter((inv) =>
    activeFilter === 'ALL' ? true : inv.status === activeFilter
  );

  const handleCreateInvoice = () => {
    Alert.alert('Invoice Creation', 'Create invoices from accepted quotations via the Quotations tab or create standalone invoices.');
  };

  const handleRecordPayment = (invoiceNumber: string) => {
    Alert.alert('Record Payment', `Payment recording for ${invoiceNumber} will be integrated in Phase 17/18.`);
  };



  const handleSendReminder = (inv: Invoice) => {
    const remaining = inv.total - inv.paidAmount;
    const message = `Hi ${inv.customerName}, this is a reminder regarding invoice ${inv.invoiceNumber} for ₹${remaining.toLocaleString('en-IN')}, which is pending. Please let us know once the payment is completed.`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    Linking.openURL(whatsappUrl).catch(() => {
      Alert.alert(
        'Payment Reminder Template',
        `${message}\n\n(WhatsApp not installed, template copied)`
      );
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Invoices"
        subtitle={`${invoices.length} total invoices`}
        rightAction={{
          icon: 'add',
          onPress: handleCreateInvoice,
        }}
      />

      <View style={styles.container}>
        {/* Horizontal Filter Tabs */}
        <View style={styles.filterScroll}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                activeFilter === tab && styles.activeFilterTab,
              ]}
              onPress={() => setActiveFilter(tab)}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === tab && styles.activeFilterTabText,
                ]}>
                {tab === 'ALL'
                  ? 'All'
                  : tab === 'PARTIALLY_PAID'
                  ? 'Partial'
                  : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Invoice List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredInvoices}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="receipt-outline" size={48} color={Colors.light.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.textSecondary, marginTop: 12 }}>
                  No Invoices Found
                </Text>
                <Text style={{ fontSize: 13, color: Colors.light.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 24 }}>
                  Invoices converted from accepted quotations will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const remaining = item.total - item.paidAmount;

            return (
              <Card style={styles.invoiceCard}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.invoiceNumber}>{item.invoiceNumber}</Text>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.balanceSection}>
                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>Total Invoice</Text>
                    <Text style={styles.balanceTotal}>
                      ₹{item.total.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>Paid Amount</Text>
                    <Text style={styles.balancePaid}>
                      ₹{item.paidAmount.toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={styles.balanceCol}>
                    <Text style={styles.balanceLabel}>Remaining</Text>
                    <Text
                      style={[
                        styles.balanceRemaining,
                        remaining > 0 ? styles.dueText : styles.paidText,
                      ]}>
                      ₹{remaining.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <Text style={styles.dateText}>Issued: {item.issueDate}</Text>
                  <Text
                    style={[
                      styles.dateText,
                      item.status === 'OVERDUE' && styles.overdueDateText,
                    ]}>
                    Due: {item.dueDate}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  {remaining > 0 && (
                    <Button
                      title="Remind"
                      variant="outline"
                      size="small"
                      icon={<Ionicons name="notifications-outline" size={15} color={Colors.light.primary} />}
                      onPress={() => handleSendReminder(item)}
                      style={styles.actionBtn}
                    />
                  )}
                  {remaining > 0 && (
                    <Button
                      title="Record Payment"
                      variant="primary"
                      size="small"
                      icon={<Ionicons name="card-outline" size={15} color="#FFFFFF" />}
                      onPress={() => handleRecordPayment(item.invoiceNumber)}
                      style={styles.actionBtn}
                    />
                  )}
                  {remaining === 0 && (
                    <View style={styles.settledRow}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.light.success} />
                      <Text style={styles.settledText}>Fully Settled</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          }}
        />
        )}
      </View>
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
  filterScroll: {
    flexDirection: 'row',
    marginVertical: 10,
  },
  filterTab: {
    paddingHorizontal: 14,
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
    padding: 16,
    marginVertical: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 2,
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
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
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  overdueDateText: {
    color: Colors.light.danger,
    fontWeight: '700',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionBtn: {
    marginLeft: 8,
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  settledText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.success,
  },
});
