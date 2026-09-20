import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Payment, PaymentMethod } from '@/types';
import { PaymentService } from '@/services/payment';
import { MOCK_PAYMENTS } from '@/constants/mockData';

const METHOD_FILTERS: (PaymentMethod | 'ALL')[] = [
  'ALL',
  'UPI',
  'CASH',
  'BANK_TRANSFER',
  'CARD',
];

export function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | 'ALL'>('ALL');

  const loadPayments = useCallback((method?: PaymentMethod | 'ALL') => {
    const filterMethod = method && method !== 'ALL' ? method : undefined;
    PaymentService.getAllPayments(filterMethod)
      .then((data) => {
        setPayments(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setPayments((prev) => (prev.length === 0 ? MOCK_PAYMENTS : prev));
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadPayments(activeMethod);
  }, [activeMethod, loadPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments(activeMethod);
  };

  const totalCollected = payments.reduce((acc, curr) => acc + curr.amount, 0);

  const getMethodIcon = (method: Payment['method']) => {
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
        return 'ellipsis-horizontal-circle-outline';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Payments"
        subtitle={`${payments.length} transactions recorded`}
        canGoBack
      />

      <View style={styles.container}>
        {/* Total Collected Banner */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Payments Tracked</Text>
          <Text style={styles.summaryAmount}>
            ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.summaryNote}>Verified collections against issued tax invoices</Text>
        </Card>

        {/* Method Filter Pills */}
        <View style={styles.filterScroll}>
          {METHOD_FILTERS.map((m) => {
            const isSelected = activeMethod === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.filterTab, isSelected && styles.activeFilterTab]}
                onPress={() => setActiveMethod(m)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.filterTabText,
                    isSelected && styles.activeFilterTabText,
                  ]}>
                  {m === 'ALL'
                    ? 'All'
                    : m === 'BANK_TRANSFER'
                    ? 'Bank Transfer'
                    : m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Payments List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="cash-outline" size={48} color={Colors.light.textMuted} />
                <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.light.textSecondary, marginTop: 12 }}>
                  No Payment Records Found
                </Text>
                <Text style={{ fontSize: 13, color: Colors.light.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 24 }}>
                  Payments recorded against customer invoices will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.paymentCard}>
                <View style={styles.paymentTop}>
                  <View style={styles.methodRow}>
                    <View style={styles.methodIconBox}>
                      <Ionicons
                        name={getMethodIcon(item.method) as any}
                        size={18}
                        color={Colors.light.primary}
                      />
                    </View>
                    <View>
                      <Text style={styles.customerName}>{item.customerName}</Text>
                      <Text style={styles.invoiceRef}>Invoice: {item.invoiceNumber}</Text>
                    </View>
                  </View>
                  <Text style={styles.amountText}>
                    +₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.paymentBottom}>
                  <View style={styles.methodPill}>
                    <Text style={styles.methodText}>{item.method.replace('_', ' ')}</Text>
                  </View>
                  <Text style={styles.dateText}>{item.paymentDate}</Text>
                </View>

                {item.reference ? (
                  <Text style={styles.refText}>Ref: {item.reference}</Text>
                ) : null}

                {item.notes ? (
                  <Text style={styles.noteText}>Note: {item.notes}</Text>
                ) : null}
              </Card>
            )}
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
  summaryCard: {
    backgroundColor: Colors.light.primaryMuted,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 16,
    marginVertical: 10,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.light.primary,
    marginVertical: 4,
  },
  summaryNote: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 10,
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
  paymentCard: {
    padding: 14,
    marginVertical: 6,
  },
  paymentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  invoiceRef: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.success,
  },
  paymentBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  methodPill: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: Colors.light.textMuted,
  },
  refText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 4,
  },
  noteText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
