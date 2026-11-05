import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Users, Car, Calendar, Menu } from 'lucide-react-native';
import { colors, shadows } from '../../theme/theme';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenMore: () => void;
  leadsCount?: number;
  inventoryCount?: number;
}

export function BottomNav({
  activeTab,
  setActiveTab,
  onOpenMore,
  leadsCount = 0,
  inventoryCount = 0,
}: BottomNavProps) {
  const insets = useSafeAreaInsets();

  const formatBadge = (count: number) => {
    if (!count) return null;
    return count > 999 ? `${(count / 1000).toFixed(1)}k` : String(count);
  };

  const tabs = [
    {
      id: 'today',
      label: 'Today',
      icon: LayoutDashboard,
    },
    {
      id: 'leads',
      label: 'Leads',
      icon: Users,
      badge: formatBadge(leadsCount),
    },
    {
      id: 'inventory',
      label: 'Stock',
      icon: Car,
      badge: formatBadge(inventoryCount),
    },
    {
      id: 'calendar',
      label: 'Showroom',
      icon: Calendar,
    },
  ];

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View style={styles.navRow}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              {isActive && <View style={styles.activeIndicator} />}
              <View style={styles.iconContainer}>
                <Icon
                  size={20}
                  color={isActive ? colors.signalRed : '#94a3b8'}
                />
                {tab.badge && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={onOpenMore}
          activeOpacity={0.7}
          style={styles.tabButton}
        >
          <View style={styles.iconContainer}>
            <Menu size={20} color="#94a3b8" />
          </View>
          <Text style={styles.tabLabel}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#171b22',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
    ...shadows.darkNav,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    position: 'relative',
    minWidth: 56,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.signalRed,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: colors.signalRed,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#171b22',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});

