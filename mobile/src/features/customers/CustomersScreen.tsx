import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Customer } from '@/types';
import { MOCK_CUSTOMERS } from '@/constants/mockData';

export function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Unable to open phone dialer');
    });
  };

  const handleAddCustomer = () => {
    Alert.alert('Phase 3 Prototype', 'Customer creation form will connect to API in Phase 9/10.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Customers"
        subtitle={`${customers.length} registered clients`}
        rightAction={{
          icon: 'person-add',
          onPress: handleAddCustomer,
        }}
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client name or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Customer List */}
        <FlatList
          data={filteredCustomers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card style={styles.customerCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>{item.name}</Text>
                {item.outstandingBalance > 0 ? (
                  <View style={styles.dueBadge}>
                    <Text style={styles.dueBadgeText}>
                      ₹{item.outstandingBalance.toLocaleString('en-IN')} Due
                    </Text>
                  </View>
                ) : (
                  <View style={styles.settledBadge}>
                    <Text style={styles.settledBadgeText}>Clear</Text>
                  </View>
                )}
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.infoText} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.infoText}>{item.email}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.billingCol}>
                  <Text style={styles.billingLabel}>Total Billed</Text>
                  <Text style={styles.billingValue}>
                    ₹{item.totalBilled.toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.circleActionBtn}
                    onPress={() => handleCall(item.phone)}
                    activeOpacity={0.7}>
                    <Ionicons name="call" size={18} color={Colors.light.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.circleActionBtn, styles.whatsappBtn]}
                    onPress={() =>
                      Linking.openURL(
                        `whatsapp://send?phone=${item.phone.replace(/[^0-9]/g, '')}`
                      ).catch(() => Alert.alert('WhatsApp not installed'))
                    }
                    activeOpacity={0.7}>
                    <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                  </TouchableOpacity>
                </View>
              </View>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  listContent: {
    paddingBottom: 24,
  },
  customerCard: {
    padding: 16,
    marginVertical: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    flex: 1,
  },
  dueBadge: {
    backgroundColor: Colors.light.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dueBadgeText: {
    color: Colors.light.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  settledBadge: {
    backgroundColor: Colors.light.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  settledBadgeText: {
    color: Colors.light.success,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  billingCol: {
    justifyContent: 'center',
  },
  billingLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  billingValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  whatsappBtn: {
    backgroundColor: '#DCFCE7',
  },
});
