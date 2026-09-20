import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { StatusBadge } from '@/components/StatusBadge';
import { Quotation, QuotationStatus } from '@/types';
import { QuotationService } from '@/services/quotation';
import { InvoiceService } from '@/services/invoice';
import { CreateQuotationModal } from './CreateQuotationModal';

import { QuotationDetailModal } from './QuotationDetailModal';
import { MOCK_QUOTATIONS } from '@/constants/mockData';

const FILTER_TABS: (QuotationStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
];


export function QuotationsScreen() {
  const [activeFilter, setActiveFilter] = useState<QuotationStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadQuotations = useCallback(
    (filter: QuotationStatus | 'ALL', search?: string) => {
      QuotationService.getQuotations(filter, search)
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
    },
    []
  );

  // Debounced search and filter watcher
  useEffect(() => {
    const timer = setTimeout(() => {
      loadQuotations(activeFilter, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [activeFilter, searchQuery, loadQuotations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadQuotations(activeFilter, searchQuery);
  };

  const handleOpenDetail = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setDetailModalVisible(true);
  };

  const handleQuotationUpdated = (updated: Quotation) => {
    setSelectedQuotation(updated);
    setQuotations((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleShare = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setDetailModalVisible(true);
  };


  const handleConvertToInvoice = (quote: Quotation) => {
    Alert.alert(
      'Convert to Official Invoice',
      `Generate Tax Invoice from ${quote.quotationNumber}? Items and totals will be copied into an official invoice record.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert Now',
          onPress: async () => {
            try {
              const invoice = await InvoiceService.convertQuotationToInvoice(quote.id);
              Alert.alert('Invoice Created!', `Invoice ${invoice.invoiceNumber} has been generated.`);
              handleQuotationUpdated({
                ...quote,
                status: 'CONVERTED',
              });
            } catch {
              Alert.alert('Conversion Failed', 'Could not convert quotation to invoice.');
            }
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Quotations"
        subtitle={`${quotations.length} total quotations`}
        rightAction={{
          icon: 'add',
          onPress: () => setCreateModalVisible(true),
        }}
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by quote number (e.g. QT-2026-0012) or client..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.light.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.light.textMuted} />
            </TouchableOpacity>
          )}
        </View>

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
                <Ionicons name="document-text-outline" size={44} color={Colors.light.textMuted} />
                <Text style={styles.emptyTitle}>No Quotations Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try searching with a different quote number or client name.'
                    : 'Tap "+" at the top right to create your first commercial quote.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenDetail(item)}>
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
                          +{item.items.length - 1} more item{item.items.length > 2 ? 's' : ''}
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
                        onPress={() => handleShare(item)}>
                        <Text style={styles.actionLinkText}>Share</Text>
                      </TouchableOpacity>

                      {item.status === 'ACCEPTED' && (
                        <TouchableOpacity
                          style={[styles.actionLink, styles.convertLink]}
                          onPress={() => handleConvertToInvoice(item)}>
                          <Text style={[styles.actionLinkText, styles.convertLinkText]}>
                            Convert
                          </Text>
                        </TouchableOpacity>
                      )}

                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Create Quotation Modal */}
      <CreateQuotationModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onSuccess={() => loadQuotations(activeFilter, searchQuery)}
      />

      {/* Quotation Detail Modal */}
      <QuotationDetailModal
        visible={detailModalVisible}
        quotation={selectedQuotation}
        onClose={() => setDetailModalVisible(false)}
        onUpdated={handleQuotationUpdated}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.light.text,
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
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 260,
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
