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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { Invoice, InvoiceStatus } from '@/types';
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
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES);

  const filteredInvoices = invoices.filter((inv) =>
    activeFilter === 'ALL' ? true : inv.status === activeFilter
  );

  const handleCreateInvoice = () => {
    Alert.alert('Phase 3 Prototype', 'Invoice creation form will connect to backend in Phase 16/17.');
  };

  const handleRecordPayment = (invoiceNumber: string) => {
    Alert.alert('Record Payment', `Payment modal for ${invoiceNumber} will be integrated in Phase 17/18.`);
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
        <FlatList
          data={filteredInvoices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
