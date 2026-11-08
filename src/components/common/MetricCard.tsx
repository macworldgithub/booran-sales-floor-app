import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { colors, shadows } from '../../theme/theme';

interface MetricCardProps {
  label: string;
  value: string | number;
  change: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tone?: 'neutral' | 'red' | 'cyan' | 'green' | 'amber';
  onPress?: () => void;
}

export function MetricCard({
  label,
  value,
  change,
  icon: Icon,
  tone = 'neutral',
  onPress,
}: MetricCardProps) {
  const { fontScale } = useWindowDimensions();
  const getToneColors = () => {
    switch (tone) {
      case 'red':
        return {
          bg: '#fff5f5',
          border: '#fed7d7',
          iconColor: colors.signalRed,
          iconBg: '#fee2e2',
          badgeText: colors.signalRed,
        };
      case 'cyan':
        return {
          bg: '#f0fdfa',
          border: '#ccfbf1',
          iconColor: '#0d9488',
          iconBg: '#ccfbf1',
          badgeText: '#0f766e',
        };
      case 'green':
        return {
          bg: '#f0fdf4',
          border: '#bbf7d0',
          iconColor: '#16a34a',
          iconBg: '#dcfce7',
          badgeText: '#15803d',
        };
      case 'amber':
        return {
          bg: '#fffbeb',
          border: '#fde68a',
          iconColor: '#d97706',
          iconBg: '#fef3c7',
          badgeText: '#b45309',
        };
      default:
        return {
          bg: '#ffffff',
          border: colors.cardBorder,
          iconColor: colors.graphite,
          iconBg: '#f1f5f9',
          badgeText: colors.textSecondary,
        };
    }
  };

  const toneConfig = getToneColors();

  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.card,
        {
          backgroundColor: toneConfig.bg,
          borderColor: toneConfig.border,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.textContainer}>
          <Text style={[styles.label, { minHeight: 32 * fontScale }]}>
            {label}
          </Text>
          <Text style={styles.value} numberOfLines={1}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Text>
        </View>
        <View style={[styles.iconWrapper, { backgroundColor: toneConfig.iconBg }]}>
          <Icon size={16} color={toneConfig.iconColor} />
        </View>
      </View>
      <Text style={styles.change}>
        {change}
      </Text>
    </CardWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    minHeight: 32,
    lineHeight: 16,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  change: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
});

