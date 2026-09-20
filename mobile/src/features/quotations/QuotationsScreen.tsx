import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { Quotation, QuotationStatus } from '@/types';
import { QuotationService } from '@/services/quotation';
import { CreateQuotationModal } from './CreateQuotationModal';
import { MOCK_QUOTATIONS } from '@/constants/mockData';

const FILTER_TABS: (QuotationStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
];

export function QuotationsScreen() {
  const [activeFilter, setActiveFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadQuotations = useCallback((filter: QuotationStatus | 'ALL') => {
    QuotationService.getQuotations(filter === 'ALL' ? undefined : filter)
      .then((data) => {
        setQuotations(data);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(() => {
        setQuotations((prev) => (prev.length === 0 ? MOCK_QUOTATIONS : prev));
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    loadQuotations(activeFilter);
  }, [activeFilter, loadQuotations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQuotations(activeFilter);
  };

  const handleShare = (quoteNumber: string) => {
    Alert.alert(
      'Share Quotation',
      `PDF generation & native share sheet for ${quoteNumber} will be integrated in Phase 13/14.`
    );
  };

  const handleConvertToInvoice = (quoteNumber: string) => {
    Alert.alert(
      'Convert to Invoice',
      `Atomic conversion from ${quoteNumber} to Invoice will be implemented in Phase 15/16.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Quotations"
        subtitle={`${quotations.length} total quotations`}
        rightAction={{
          icon: 'add',
          onPress: () => setModalVisible(true),
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading quotations...</Text>
          </View>
        ) : (
          <FlatList
            data={quotations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>No Quotations Found</Text>
                <Text style={styles.emptySubtitle}>
                  Tap "+" at the top right to create your first commercial quote.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Card style={styles.quoteCard}>
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.quoteNumber}>{item.quotationNumber}</Text>
                    <Text style={styles.customerName}>{item.customerName}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                {item.items && item.items.length > 0 && (
                  <View style={styles.itemPreview}>
                    <Text style={styles.itemDescription} numberOfLines={1}>
                      {item.items[0]?.description} ({item.items[0]?.quantity} qty)
                    </Text>
                    {item.items.length > 1 && (
                      <Text style={styles.extraItems}>
                        +{item.items.length - 1} more items
                      </Text>
                    )}
                  </View>
                )}

                <View style={styles.cardBottom}>
                  <View>
                    <Text style={styles.totalLabel}>Total (inc. GST)</Text>
                    <Text style={styles.totalValue}>
                      ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.actionLink}
                      onPress={() => handleShare(item.quotationNumber)}>
                      <Text style={styles.actionLinkText}>Share</Text>
                    </TouchableOpacity>
                    {item.status === 'ACCEPTED' && (
                      <TouchableOpacity
                        style={[styles.actionLink, styles.convertLink]}
                        onPress={() => handleConvertToInvoice(item.quotationNumber)}>
                        <Text style={[styles.actionLinkText, styles.convertLinkText]}>
                          Convert
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            )}
          />
        )}
      </View>

      {/* Create Quotation Modal */}
      <CreateQuotationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => loadQuotations(activeFilter)}
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
    paddingTop: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundElement,
    marginRight: 8,
  },
  activeFilterTab: {
    backgroundColor: Colors.light.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  quoteCard: {
    padding: 14,
    marginVertical: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  quoteNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  customerName: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  itemPreview: {
    backgroundColor: Colors.light.backgroundElement,
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.light.text,
  },
  extraItems: {
    fontSize: 11,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.light.text,
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundElement,
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  convertLink: {
    backgroundColor: Colors.light.primary,
  },
  convertLinkText: {
    color: '#FFFFFF',
  },
});
