import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Hero Visual */}
        <View style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="document-text" size={48} color={Colors.light.primary} />
          </View>
          <Text style={styles.brandTitle}>SmartQuote</Text>
          <Text style={styles.tagline}>
            Professional quotations, invoices & payment reminders for trades and freelancers.
          </Text>
        </View>

        {/* Value Highlights */}
        <View style={styles.featuresList}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
            <Text style={styles.featureText}>Create GST-compliant quotations in seconds</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
            <Text style={styles.featureText}>Convert accepted quotes to invoices in one tap</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.light.success} />
            <Text style={styles.featureText}>Track payments & send instant WhatsApp reminders</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button
            title="Create Business Account"
            size="large"
            onPress={() => router.push('/(auth)/register')}
          />
          <View style={styles.spacer} />
          <Button
            title="Sign In with Existing Account"
            variant="outline"
            size="large"
            onPress={() => router.push('/(auth)/login')}
          />
          <View style={styles.spacer} />
          <Button
            title="Explore Demo Dashboard"
            variant="secondary"
            size="medium"
            onPress={() => router.replace('/(tabs)/dashboard')}
          />
        </View>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  featuresList: {
    marginVertical: 24,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  featureText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 10,
    fontWeight: '500',
  },
  actionSection: {
    marginBottom: 16,
  },
  spacer: {
    height: 12,
  },
});
