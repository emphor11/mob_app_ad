export const Colors = {
  light: {
    primary: '#1E40AF',          // Deep corporate blue
    primaryLight: '#3B82F6',     // Interactive blue
    primaryMuted: '#EFF6FF',     // Subtle blue background
    secondary: '#0F172A',        // Slate header
    accent: '#2563EB',
    background: '#F8FAFC',       // Clean slate light background
    backgroundElement: '#F1F5F9', // Muted card/element fill
    backgroundSelected: '#E2E8F0',// Selected item fill
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    text: '#0F172A',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    border: '#E2E8F0',
    
    // Status colors
    success: '#10B981',
    successBg: '#ECFDF5',
    warning: '#F59E0B',
    warningBg: '#FFFBEB',
    danger: '#EF4444',
    dangerBg: '#FEF2F2',
    info: '#3B82F6',
    infoBg: '#EFF6FF',
    neutral: '#6B7280',
    neutralBg: '#F3F4F6',
  },
  dark: {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryMuted: '#1E293B',
    secondary: '#F8FAFC',
    accent: '#60A5FA',
    background: '#0F172A',
    backgroundElement: '#1E293B',
    backgroundSelected: '#334155',
    card: '#1E293B',
    cardBorder: '#334155',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    
    // Status colors
    success: '#34D399',
    successBg: '#064E3B',
    warning: '#FBBF24',
    warningBg: '#78350F',
    danger: '#F87171',
    dangerBg: '#7F1D1D',
    info: '#60A5FA',
    infoBg: '#1E3A8A',
    neutral: '#9CA3AF',
    neutralBg: '#374151',
  },
} as const;

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Typography = {
  titleLarge: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  titleMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
} as const;
