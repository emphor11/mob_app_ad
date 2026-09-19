import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { Quotation, QuotationStatus } from '@/types';
import { MOCK_QUOTATIONS } from '@/constants/mockData';

const FILTER_TABS: (QuotationStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
];

export function QuotationsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [quotations] = useState<Quotation[]>(MOCK_QUOTATIONS);

  const filteredQuotes = quotations.filter((q) =>
    activeFilter === 'ALL' ? true : q.status === activeFilter
  );

  const handleCreateQuotation = () => {
    Alert.alert('Phase 3 Prototype', 'Quotation creation workflow will be connected in Phase 11/12.');
  };

  const handleShare = (quoteNumber: string) => {
    Alert.alert('Share Quotation', `PDF generation & native share sheet for ${quoteNumber} will be integrated in Phase 13/14.`);
  };

  const handleConvertToInvoice = (quoteNumber: string) => {
    Alert.alert('Convert to Invoice', `Atomic conversion from ${quoteNumber} to Invoice will be implemented in Phase 15/16.`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Quotations"
        subtitle={`${quotations.length} total quotations`}
        rightAction={{
          icon: 'add',
          onPress: handleCreateQuotation,
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
                {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quotation List */}
        <FlatList
          data={filteredQuotes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Card style={styles.quoteCard}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.quoteNumber}>{item.quotationNumber}</Text>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View style={styles.itemPreview}>
                <Text style={styles.itemDescription} numberOfLines={1}>
                  {item.items[0]?.description} ({item.items[0]?.quantity} qty)
                </Text>
                {item.items.length > 1 && (
                  <Text style={styles.moreItemsText}>
                    +{item.items.length - 1} more item(s)
                  </Text>
                )}
              </View>

              <View style={styles.totalsRow}>
                <View>
                  <Text style={styles.metaText}>Valid: {item.validUntil}</Text>
                  <Text style={styles.taxText}>Inc. GST: ₹{item.tax.toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.totalAmount}>
                  ₹{item.total.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <Button
                  title="Share PDF"
                  variant="outline"
                  size="small"
                  icon={<Ionicons name="share-social-outline" size={16} color={Colors.light.primary} />}
                  onPress={() => handleShare(item.quotationNumber)}
                  style={styles.actionBtn}
                />
                {item.status === 'ACCEPTED' && (
                  <Button
                    title="Convert to Invoice"
                    variant="primary"
                    size="small"
                    icon={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
                    onPress={() => handleConvertToInvoice(item.quotationNumber)}
                    style={styles.actionBtn}
                  />
                )}
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
  quoteCard: {
    padding: 16,
    marginVertical: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  quoteNumber: {
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
  itemPreview: {
    marginVertical: 8,
    backgroundColor: Colors.light.backgroundElement,
    padding: 8,
    borderRadius: 8,
  },
  itemDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  moreItemsText: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  taxText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  actionBtn: {
    marginLeft: 8,
  },
});
