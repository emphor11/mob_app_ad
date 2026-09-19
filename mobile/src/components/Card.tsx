import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Colors } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'elevated' | 'outlined' | 'flat';
}

export function Card({ children, style, variant = 'elevated' }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'elevated' && styles.elevated,
        variant === 'outlined' && styles.outlined,
        variant === 'flat' && styles.flat,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 16,
    marginVertical: 6,
  },
  elevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      default: {
        borderWidth: 1,
        borderColor: Colors.light.cardBorder,
      },
    }),
    borderWidth: Platform.OS === 'android' ? 0 : 1,
    borderColor: Colors.light.cardBorder,
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  flat: {
    backgroundColor: Colors.light.backgroundElement,
  },
});
