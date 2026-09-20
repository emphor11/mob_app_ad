import React, { useState, useEffect } from 'react';
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
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Customer } from '@/types';
import { CustomerService } from '@/services/customer';
import { MOCK_CUSTOMERS } from '@/constants/mockData';

export function CustomersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Customer Details View Modal
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Load customers with debounce on searchQuery
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      CustomerService.getCustomers(searchQuery)
        .then((data) => {
          if (isMounted) {
            setCustomers(data);
            setLoading(false);
            setRefreshing(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            setCustomers((prev) => (prev.length === 0 ? MOCK_CUSTOMERS : prev));
            setLoading(false);
            setRefreshing(false);
          }
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);


  const onRefresh = () => {
    setRefreshing(true);
    CustomerService.getCustomers(searchQuery)
      .then((data) => setCustomers(data))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  };


  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormEmail('');
    setFormAddress('');
    setFormGstin('');
    setFormNotes('');
    setModalVisible(true);
  };

  const handleOpenEdit = (customer: Customer) => {
    setDetailModalVisible(false);
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormEmail(customer.email || '');
    setFormAddress(customer.address || '');
    setFormGstin(customer.gstin || '');
    setFormNotes(customer.notes || '');
    setModalVisible(true);
  };

  const handleOpenDetail = (customer: Customer) => {
    setDetailCustomer(customer);
    setDetailModalVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!formName.trim() || !formPhone.trim()) {
      Alert.alert('Required Fields', 'Please provide at least a Client Name and Phone number.');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        const updated = await CustomerService.updateCustomer(editingCustomer.id, {
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          address: formAddress.trim() || undefined,
          gstin: formGstin.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
        setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        if (detailCustomer?.id === updated.id) {
          setDetailCustomer(updated);
        }
        Alert.alert('Success', 'Customer updated successfully.');
      } else {
        const created = await CustomerService.createCustomer({
          name: formName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          address: formAddress.trim() || undefined,
          gstin: formGstin.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });
        setCustomers((prev) => [created, ...prev]);
        Alert.alert('Success', 'Customer added successfully.');
      }
      setModalVisible(false);
    } catch (err: unknown) {
      let msg = 'Failed to save customer.';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const resp = err as { response?: { data?: { detail?: string } } };
        if (resp.response?.data?.detail) {
          msg = resp.response.data.detail;
        }
      }
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await CustomerService.deleteCustomer(customer.id);
              setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
              setDetailModalVisible(false);
            } catch {
              Alert.alert('Error', 'Unable to delete customer.');
            }
          },
        },
      ]
    );
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone dialer');
    });
  };

  const handleWhatsApp = (phone: string) => {
    Linking.openURL(`whatsapp://send?phone=${phone.replace(/[^0-9]/g, '')}`).catch(() => {
      Alert.alert('Error', 'WhatsApp is not installed');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Customers"
        subtitle={`${customers.length} registered clients`}
        rightAction={{
          icon: 'person-add',
          onPress: handleOpenAdd,
        }}
      />

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={Colors.light.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by client name, phone, or email..."
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={Colors.light.textMuted} />
                <Text style={styles.emptyTitle}>No Customers Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : 'Add your first contractor or client to get started.'}
                </Text>
                {!searchQuery && (
                  <Button
                    title="Add Customer"
                    variant="primary"
                    size="small"
                    style={{ marginTop: 12 }}
                    onPress={handleOpenAdd}
                  />
                )}
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.8} onPress={() => handleOpenDetail(item)}>
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

                  {item.address ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color={Colors.light.textSecondary} />
                      <Text style={styles.infoText} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                  ) : null}

                  {item.email ? (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={14} color={Colors.light.textSecondary} />
                      <Text style={styles.infoText}>{item.email}</Text>
                    </View>
                  ) : null}

                  <View style={styles.cardFooter}>
                    <View style={styles.billingCol}>
                      <Text style={styles.billingLabel}>Phone</Text>
                      <Text style={styles.billingValue}>{item.phone}</Text>
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
                        onPress={() => handleWhatsApp(item.phone)}
                        activeOpacity={0.7}>
                        <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Customer Details Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            {detailCustomer && (
              <ScrollView contentContainerStyle={styles.detailScroll}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailCustomerName}>{detailCustomer.name}</Text>
                  {detailCustomer.gstin && (
                    <View style={styles.gstinBadge}>
                      <Text style={styles.gstinText}>GSTIN: {detailCustomer.gstin}</Text>
                    </View>
                  )}
                </View>

                {/* Direct Action Bar */}
                <View style={styles.detailActionRow}>
                  <TouchableOpacity
                    style={styles.actionChip}
                    onPress={() => handleCall(detailCustomer.phone)}>
                    <Ionicons name="call" size={16} color={Colors.light.primary} />
                    <Text style={styles.actionChipText}>Call</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionChip, { borderColor: '#16A34A' }]}
                    onPress={() => handleWhatsApp(detailCustomer.phone)}>
                    <Ionicons name="logo-whatsapp" size={16} color="#16A34A" />
                    <Text style={[styles.actionChipText, { color: '#16A34A' }]}>WhatsApp</Text>
                  </TouchableOpacity>
                  {detailCustomer.email ? (
                    <TouchableOpacity
                      style={styles.actionChip}
                      onPress={() => Linking.openURL(`mailto:${detailCustomer.email}`)}>
                      <Ionicons name="mail" size={16} color={Colors.light.primary} />
                      <Text style={styles.actionChipText}>Email</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{detailCustomer.phone}</Text>

                  {detailCustomer.email ? (
                    <>
                      <Text style={styles.detailLabel}>Email</Text>
                      <Text style={styles.detailValue}>{detailCustomer.email}</Text>
                    </>
                  ) : null}

                  {detailCustomer.address ? (
                    <>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue}>{detailCustomer.address}</Text>
                    </>
                  ) : null}

                  {detailCustomer.notes ? (
                    <>
                      <Text style={styles.detailLabel}>Notes / Trade Terms</Text>
                      <Text style={styles.detailValue}>{detailCustomer.notes}</Text>
                    </>
                  ) : null}
                </View>

                <View style={styles.detailBtnRow}>
                  <Button
                    title="Edit Customer"
                    variant="primary"
                    size="medium"
                    icon={<Ionicons name="pencil" size={16} color="#FFFFFF" />}
                    onPress={() => handleOpenEdit(detailCustomer)}
                    style={{ flex: 2 }}
                  />
                  <Button
                    title="Delete"
                    variant="danger"
                    size="medium"
                    icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
                    onPress={() => handleDeleteCustomer(detailCustomer)}
                    style={{ flex: 1 }}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Add / Edit Customer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.inputLabel}>Client / Company Name *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Raj Traders & Hardware"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="e.g. +91 98111 22334"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder="client@company.in"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Billing / Site Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="Shop 14, Main Market, Sector 7..."
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formGstin}
                onChangeText={setFormGstin}
                placeholder="07BBBBB1111B1Z2"
                autoCapitalize="characters"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Notes / Trade Preferences</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formNotes}
                onChangeText={setFormNotes}
                placeholder="Bulk buyer of PVC pipes; prefers UPI payments..."
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.light.textMuted}
              />

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={{ flex: 1 }}
                />
                <Button
                  title={saving ? 'Saving...' : editingCustomer ? 'Save Changes' : 'Add Client'}
                  variant="primary"
                  loading={saving}
                  onPress={handleSaveCustomer}
                  style={{ flex: 2 }}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.light.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
  },
  listContent: {
    paddingBottom: 24,
  },
  customerCard: {
    padding: 14,
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
    borderRadius: 4,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.light.danger,
  },
  settledBadge: {
    backgroundColor: Colors.light.successBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  settledBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.success,
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
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 10,
    marginTop: 8,
  },
  billingCol: {
    flex: 1,
  },
  billingLabel: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  billingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  circleActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappBtn: {
    backgroundColor: '#DCFCE7',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  formScroll: {
    padding: 18,
  },
  detailScroll: {
    padding: 18,
  },
  detailTitleRow: {
    marginBottom: 12,
  },
  detailCustomerName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  gstinBadge: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  gstinText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  detailActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  actionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  detailSection: {
    marginVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.textMuted,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: Colors.light.text,
    marginTop: 2,
    lineHeight: 20,
  },
  detailBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.light.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.light.text,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  modalBtnRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
});
