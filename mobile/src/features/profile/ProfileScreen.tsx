import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { MOCK_BUSINESS } from '@/constants/mockData';

export function ProfileScreen() {
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => router.replace('/(auth)/welcome'),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="Business Profile" subtitle="Account details & preferences" />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Business Identity Card */}
        <Card style={styles.businessCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              <Ionicons name="business" size={32} color={Colors.light.primary} />
            </View>
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{MOCK_BUSINESS.name}</Text>
              <Text style={styles.ownerName}>Prop: {MOCK_BUSINESS.ownerName}</Text>
              {MOCK_BUSINESS.gstin && (
                <View style={styles.gstinBadge}>
                  <Text style={styles.gstinText}>GSTIN: {MOCK_BUSINESS.gstin}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Ionicons name="call-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{MOCK_BUSINESS.phone}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{MOCK_BUSINESS.email}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.detailText}>{MOCK_BUSINESS.address}</Text>
            </View>
          </View>

          <Button
            title="Edit Business Details"
            variant="outline"
            size="small"
            style={styles.editBtn}
            onPress={() =>
              Alert.alert('Profile Management', 'Business profile editing will be connected in Phase 8.')
            }
          />
        </Card>

        {/* Configuration & Preferences */}
        <Text style={styles.sectionHeader}>Preferences & Document Format</Text>
        <Card style={styles.settingsCard}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() =>
              Alert.alert('Document Numbering', 'Configurable prefixes (QT-, INV-) will be added in Phase 21.')
            }
            activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="barcode-outline" size={20} color={Colors.light.primary} />
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Document Numbering</Text>
                <Text style={styles.settingSubtitle}>Format: QT-2026-XXXX, INV-2026-XXXX</Text>
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
              Alert.alert('Currency & Taxes', 'Default GST tax brackets (18%, 12%, 5%) configuration.')
            }
            activeOpacity={0.7}>
            <View style={styles.settingLeft}>
              <Ionicons name="calculator-outline" size={20} color={Colors.light.primary} />
              <View style={styles.settingTextCol}>
                <Text style={styles.settingTitle}>Default Tax & Currency</Text>
                <Text style={styles.settingSubtitle}>Currency: ₹ INR | Default GST: 18%</Text>
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
            <Text style={styles.versionValue}>1.0.0 (Phase 3 Shell)</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Architecture</Text>
            <Text style={styles.versionValue}>React Native + Expo Router</Text>
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
});
