import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { MOCK_BUSINESS } from '@/constants/mockData';
import { AuthService } from '@/services/auth';
import { BusinessService } from '@/services/business';
import { StorageService } from '@/lib/storage';
import { Business, User } from '@/types';

export function ProfileScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal edit state
  const [modalVisible, setModalVisible] = useState(false);
  const [formName, setFormName] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState('');
  const [formCurrency, setFormCurrency] = useState('₹');
  const [formInvoicePrefix, setFormInvoicePrefix] = useState('INV');
  const [formQuotationPrefix, setFormQuotationPrefix] = useState('QT');
  const [formDefaultTerms, setFormDefaultTerms] = useState('');
  const [formPaymentInstructions, setFormPaymentInstructions] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      StorageService.getUser(),
      BusinessService.getMyBusiness().catch(() => null),
    ]).then(([user, biz]) => {
      if (isMounted) {
        if (user) setCurrentUser(user);
        if (biz) setBusiness(biz);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);


  const openEditModal = () => {
    if (business) {
      setFormName(business.name);
      setFormOwnerName(business.ownerName);
      setFormPhone(business.phone);
      setFormEmail(business.email);
      setFormAddress(business.address);
      setFormGstin(business.gstin || '');
      setFormLogoUrl(business.logoUrl || '');
      setFormCurrency(business.currency || '₹');
      setFormInvoicePrefix(business.invoicePrefix || 'INV');
      setFormQuotationPrefix(business.quotationPrefix || 'QT');
      setFormDefaultTerms(business.defaultTerms || '');
      setFormPaymentInstructions(business.paymentInstructions || '');
    } else {
      // Pre-fill defaults from user profile
      setFormName(currentUser?.fullName ? `${currentUser.fullName}'s Enterprises` : 'My Trade Enterprises');
      setFormOwnerName(currentUser?.fullName || 'Business Owner');
      setFormPhone('+91 98765 43210');
      setFormEmail(currentUser?.email || 'business@smartquote.in');
      setFormAddress('Shop 1, Main Road, Market Area');
      setFormGstin('');
      setFormLogoUrl('');
      setFormCurrency('₹');
      setFormInvoicePrefix('INV');
      setFormQuotationPrefix('QT');
      setFormDefaultTerms('');
      setFormPaymentInstructions('');
    }
    setModalVisible(true);
  };

  const handleSaveBusiness = async () => {
    if (!formName.trim() || !formOwnerName.trim() || !formPhone.trim() || !formEmail.trim() || !formAddress.trim()) {
      Alert.alert('Missing Required Fields', 'Please fill in Business Name, Owner Name, Phone, Email, and Address.');
      return;
    }

    setSaving(true);
    try {
      if (business) {
        const updated = await BusinessService.updateBusiness({
          name: formName.trim(),
          owner_name: formOwnerName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          gstin: formGstin.trim() || undefined,
          logo_url: formLogoUrl.trim() || undefined,
          currency: formCurrency.trim() || '₹',
          invoice_prefix: formInvoicePrefix.trim().toUpperCase() || 'INV',
          quotation_prefix: formQuotationPrefix.trim().toUpperCase() || 'QT',
          default_terms: formDefaultTerms.trim() || undefined,
          payment_instructions: formPaymentInstructions.trim() || undefined,
        });
        setBusiness(updated);
      } else {
        const created = await BusinessService.createBusiness({
          name: formName.trim(),
          owner_name: formOwnerName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          address: formAddress.trim(),
          gstin: formGstin.trim() || undefined,
          logo_url: formLogoUrl.trim() || undefined,
          currency: formCurrency.trim() || '₹',
          invoice_prefix: formInvoicePrefix.trim().toUpperCase() || 'INV',
          quotation_prefix: formQuotationPrefix.trim().toUpperCase() || 'QT',
          default_terms: formDefaultTerms.trim() || undefined,
          payment_instructions: formPaymentInstructions.trim() || undefined,
        });
        setBusiness(created);
      }
      setModalVisible(false);
      Alert.alert('Success', 'Business profile saved successfully.');
    } catch (err: unknown) {
      let msg = 'Failed to save business profile.';
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

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const activeBusiness = business || MOCK_BUSINESS;
  const displayName = business?.ownerName || currentUser?.fullName || MOCK_BUSINESS.ownerName;
  const displayEmail = business?.email || currentUser?.email || MOCK_BUSINESS.email;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Business Profile" subtitle="Account details & preferences" />

      <ScrollView contentContainerStyle={styles.container}>
        {loading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={Colors.light.primary} />
            <Text style={styles.loadingText}>Syncing business profile...</Text>
          </View>
        )}

        {/* Business Identity Card */}
        <Card style={styles.businessCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="business" size={32} color={Colors.light.primary} />
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{activeBusiness.name}</Text>
              <Text style={styles.ownerName}>Prop: {displayName}</Text>
              {activeBusiness.gstin ? (
                <View style={styles.gstinBadge}>
                  <Text style={styles.gstinText}>GSTIN: {activeBusiness.gstin}</Text>
                </View>
              ) : (
                <View style={styles.unregisteredBadge}>
                  <Text style={styles.unregisteredText}>Unregistered / Composite</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{activeBusiness.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{displayEmail}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{activeBusiness.address}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="cash-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>Default Currency: {activeBusiness.currency}</Text>
            </View>
          </View>

          <Button
            title={business ? 'Edit Business Details' : 'Set Up Business Details'}
            variant="outline"
            size="small"
            style={styles.editBtn}
            onPress={openEditModal}
          />
        </Card>

        {/* Configuration & Preferences */}
        <Text style={styles.sectionHeader}>Preferences & Document Format</Text>
        <Card style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={openEditModal}
            activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="barcode-outline" size={20} color={Colors.light.primary} />
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Document Numbering</Text>
                <Text style={styles.settingSubtitle}>
                  Quote: {activeBusiness.quotationPrefix || 'QT'}-{new Date().getFullYear()}-XXXX | Inv: {activeBusiness.invoicePrefix || 'INV'}-{new Date().getFullYear()}-XXXX
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert('Reminder Template', 'Custom WhatsApp message templates will be added in Phase 19/20.')
            }
            activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubbles-outline" size={20} color={Colors.light.primary} />
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Reminder Message Template</Text>
                <Text style={styles.settingSubtitle}>Default WhatsApp reminder text</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert('Currency & Taxes', `Active Currency: ${activeBusiness.currency} | Default GST: 18%`)
            }
            activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="calculator-outline" size={20} color={Colors.light.primary} />
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Default Tax & Currency</Text>
                <Text style={styles.settingSubtitle}>Currency: {activeBusiness.currency} | Default GST: 18%</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* System & Session */}
        <Text style={styles.sectionHeader}>Session</Text>
        <Card style={styles.settingsCard}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>SmartQuote Version</Text>
            <Text style={styles.versionValue}>1.0.0 (Phase 8 Business)</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Active Session</Text>
            <Text style={styles.versionValue}>{currentUser ? 'Authenticated (JWT)' : 'Guest Demo'}</Text>
          </View>
          <Button
            title="Sign Out"
            variant="danger"
            size="medium"
            icon={<Ionicons name="log-out-outline" size={18} color="#FFFFFF" />}
            onPress={handleSignOut}
            style={styles.signOutBtn}
          />
        </Card>
      </ScrollView>

      {/* Edit Business Details Modal */}
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
                {business ? 'Edit Business Details' : 'Set Up Business Profile'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={Colors.light.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll}>
              <Text style={styles.inputLabel}>Business Name *</Text>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="e.g. Apex Electricals & Hardware"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Proprietor / Owner Name *</Text>
              <TextInput
                style={styles.input}
                value={formOwnerName}
                onChangeText={setFormOwnerName}
                placeholder="e.g. Vikram Sharma"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Phone *</Text>
              <TextInput
                style={styles.input}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="+91 98765 43210"
                keyboardType="phone-pad"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={formEmail}
                onChangeText={setFormEmail}
                placeholder="billing@yourdomain.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Shop / Office Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formAddress}
                onChangeText={setFormAddress}
                placeholder="Plot 42, Industrial Area, Sector 5..."
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>GSTIN (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formGstin}
                onChangeText={setFormGstin}
                placeholder="07AAAAA0000A1Z5"
                autoCapitalize="characters"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Logo URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formLogoUrl}
                onChangeText={setFormLogoUrl}
                placeholder="https://example.com/logo.png"
                autoCapitalize="none"
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Currency Symbol</Text>
              <TextInput
                style={styles.input}
                value={formCurrency}
                onChangeText={setFormCurrency}
                placeholder="₹"
                placeholderTextColor={Colors.light.textMuted}
              />

              <View style={styles.sectionDivider} />
              <Text style={styles.subSectionTitle}>Document Numbering & Customization</Text>

              <Text style={styles.inputLabel}>Quotation Prefix</Text>
              <TextInput
                style={styles.input}
                value={formQuotationPrefix}
                onChangeText={setFormQuotationPrefix}
                placeholder="QT"
                autoCapitalize="characters"
                placeholderTextColor={Colors.light.textMuted}
              />
              <Text style={styles.helperText}>
                Preview: {formQuotationPrefix.trim().toUpperCase() || 'QT'}-{new Date().getFullYear()}-0001
              </Text>

              <Text style={styles.inputLabel}>Invoice Prefix</Text>
              <TextInput
                style={styles.input}
                value={formInvoicePrefix}
                onChangeText={setFormInvoicePrefix}
                placeholder="INV"
                autoCapitalize="characters"
                placeholderTextColor={Colors.light.textMuted}
              />
              <Text style={styles.helperText}>
                Preview: {formInvoicePrefix.trim().toUpperCase() || 'INV'}-{new Date().getFullYear()}-0001
              </Text>

              <Text style={styles.inputLabel}>Standard Terms & Conditions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formDefaultTerms}
                onChangeText={setFormDefaultTerms}
                placeholder="e.g. 100% payment due within 15 days of invoice date. 18% p.a. interest chargeable thereafter."
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.light.textMuted}
              />

              <Text style={styles.inputLabel}>Payment Instructions & Bank Details</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formPaymentInstructions}
                onChangeText={setFormPaymentInstructions}
                placeholder="e.g. UPI: 9876543210@upi | Bank: HDFC Bank, A/C: 1234567890, IFSC: HDFC0001234"
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.light.textMuted}
              />

              <View style={styles.modalBtnRow}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCancelBtn}
                />
                <Button
                  title={saving ? 'Saving...' : 'Save Profile'}
                  variant="primary"
                  loading={saving}
                  onPress={handleSaveBusiness}
                  style={styles.modalSaveBtn}
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  businessCard: {
    padding: 16,
    marginVertical: 8,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  ownerName: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  gstinBadge: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  gstinText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  unregisteredBadge: {
    backgroundColor: Colors.light.backgroundElement,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  unregisteredText: {
    fontSize: 11,
    color: Colors.light.textMuted,
  },
  detailsList: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    paddingTop: 10,
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  detailText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  editBtn: {
    marginTop: 12,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 6,
    marginLeft: 4,
  },
  settingsCard: {
    padding: 12,
    marginVertical: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextCol: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  settingSubtitle: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  versionLabel: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
  },
  signOutBtn: {
    marginTop: 16,
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
  modalCancelBtn: {
    flex: 1,
  },
  modalSaveBtn: {
    flex: 2,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 16,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 11,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
  },
});
