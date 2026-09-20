import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { InvoiceStatus, QuotationStatus } from '@/types';

interface StatusBadgeProps {
  status: QuotationStatus | InvoiceStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'ACCEPTED':
      case 'PAID':
        return {
          bg: Colors.light.successBg,
          text: Colors.light.success,
          label: status === 'ACCEPTED' ? 'Accepted' : 'Paid',
        };
      case 'SENT':
      case 'PARTIALLY_PAID':
        return {
          bg: Colors.light.warningBg,
          text: Colors.light.warning,
          label: status === 'SENT' ? 'Sent' : 'Partially Paid',
        };
      case 'OVERDUE':
      case 'REJECTED':
        return {
          bg: Colors.light.dangerBg,
          text: Colors.light.danger,
          label: status === 'OVERDUE' ? 'Overdue' : 'Rejected',
        };
      case 'EXPIRED':
        return {
          bg: '#F3E8FF',
          text: '#7E22CE',
          label: 'Expired',
        };
      case 'DRAFT':
        return {
          bg: Colors.light.neutralBg,
          text: Colors.light.neutral,
          label: 'Draft',
        };

      case 'UNPAID':
        return {
          bg: Colors.light.dangerBg,
          text: Colors.light.danger,
          label: 'Unpaid',
        };
      case 'CONVERTED':
        return {
          bg: Colors.light.infoBg,
          text: Colors.light.info,
          label: 'Converted',
        };
      default:
        return {
          bg: Colors.light.neutralBg,
          text: Colors.light.textSecondary,
          label: status,
        };
    }
  };

  const badge = getBadgeStyle();

  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.label, { color: badge.text }]}>{badge.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
