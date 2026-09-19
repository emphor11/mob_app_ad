import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Payment } from '@/types';
import { MOCK_PAYMENTS } from '@/constants/mockData';

export function PaymentsScreen() {
  const [payments] = useState<Payment[]>(MOCK_PAYMENTS);

  const totalCollected = payments.reduce((acc, curr) => acc + curr.amount, 0);

  const handleNewPayment = () => {
    Alert.alert('Record Payment', 'Payment recording form will be connected in Phase 17/18.');
  };

  const getMethodIcon = (method: Payment['method']) => {
    switch (method) {
      case 'UPI':
        return 'phone-portrait-outline';
      case 'BANK_TRANSFER':
        return 'business-outline';
      case 'CASH':
        return 'cash-outline';
      default:
        return 'card-outline';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Payments"
        subtitle={`${payments.length} transactions logged`}
        canGoBack
        rightAction={{
          icon: 'add',
          onPress: handleNewPayment,
        }}
      />

      <View style={styles.container}>
        {/* Total Collected Banner */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Payments Tracked</Text>
          <Text style={styles.summaryAmount}>
            ₹{totalCollected.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.summaryNote}>Verified against issued customer invoices</Text>
        </Card>

        {/* Payments List */}
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
                  +₹{item.amount.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.paymentBottom}>
                <View style={styles.methodPill}>
                  <Text style={styles.methodText}>{item.method.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.dateText}>{item.paymentDate}</Text>
              </View>

              {item.reference && (
                <Text style={styles.refText}>Ref: {item.reference}</Text>
              )}
            </Card>
          )}
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
});
