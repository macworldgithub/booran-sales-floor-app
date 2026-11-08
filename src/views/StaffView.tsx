import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  UserCheck,
  Award,
} from 'lucide-react-native';
import { StaffMember } from '../types';
import { staffApi } from '../services/api';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { StaffAccountsModal } from '../components/modals/StaffAccountsModal';

export function StaffView() {
  const { selectedRooftop, user } = useAuth();
  const [manageAccounts, setManageAccounts] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await staffApi.getStaff(selectedRooftop);
      if (res.success && res.data) {
        setStaff(res.data);
      } else {
        throw new Error(res.error || 'Failed to fetch staff members.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load staff directory.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRooftop]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerTagRow}>
          <Text style={styles.bannerTag}>SALES FLOOR PERFORMANCE</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{staff.length} Consultants</Text>
          </View>
        </View>
        <Text style={styles.bannerTitle}>Staff & Lead Allocation</Text>
        <Text style={styles.bannerSubtitle}>
          Conversion rates, assigned lead volume, and current floor workload capacity.
        </Text>
        {user?.role === 'super_admin' && (
          <TouchableOpacity accessibilityRole="button" onPress={() => setManageAccounts(true)} style={styles.manageButton}>
            <Text style={styles.manageButtonText}>Manage staff accounts</Text>
          </TouchableOpacity>
        )}
      </View>

      {user?.role === 'super_admin' && manageAccounts && <StaffAccountsModal onClose={() => setManageAccounts(false)} />}

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchStaff} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Staff List */}
      <ScrollView
        style={styles.staffList}
        contentContainerStyle={styles.staffListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && staff.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Loading staff directory & allocations...</Text>
          </View>
        ) : staff.length === 0 ? (
          <View style={styles.emptyContainer}>
            <UserCheck size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No consultants found</Text>
            <Text style={styles.emptySubtitle}>No staff registered for current dealership scope.</Text>
          </View>
        ) : (
          staff.map((member) => {
            const capacity = Math.min(Math.max(member.loadCapacity || 60, 10), 100);

            return (
              <View key={member._id} style={styles.staffCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.initials || 'SC'}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{member.name}</Text>
                    <Text style={styles.role}>
                      {member.position || member.role || 'Sales Consultant'} · {member.site}
                    </Text>
                  </View>

                  <View style={styles.conversionBadge}>
                    <Award size={12} color={colors.emerald} />
                    <Text style={styles.conversionText}>{member.conversionRate || '18%'}</Text>
                  </View>
                </View>

                {/* Performance stats row */}
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>TOTAL LEADS</Text>
                    <Text style={styles.statVal}>{member.totalLeads ?? 0}</Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>SOLD DELIVERIES</Text>
                    <Text style={[styles.statVal, { color: colors.emerald }]}>
                      {member.soldCount ?? 0}
                    </Text>
                  </View>

                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>FOLLOWING UP</Text>
                    <Text style={[styles.statVal, { color: colors.amber }]}>
                      {member.followingUpCount ?? 0}
                    </Text>
                  </View>
                </View>

                {/* Capacity Progress Bar */}
                <View style={styles.capacitySection}>
                  <View style={styles.capacityLabels}>
                    <Text style={styles.capacityTitle}>Lead Allocation Capacity</Text>
                    <Text style={styles.capacityVal}>{capacity}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${capacity}%`,
                          backgroundColor:
                            capacity > 85 ? colors.danger : capacity > 65 ? colors.amber : colors.emerald,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  bannerTagRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  bannerTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    color: colors.emerald,
    fontSize: 10,
    fontWeight: '800',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  manageButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.graphite,
  },
  manageButtonText: { color: colors.textLight, fontWeight: '700' },
  errorBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    margin: 12,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 12,
  },
  staffList: {
    flex: 1,
  },
  staffListContent: {
    padding: 12,
    gap: 12,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  staffCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    ...shadows.sm,
  },
  cardTop: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.graphite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  role: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  conversionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conversionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  statsRow: {
    flexWrap: 'wrap',
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  statBox: {
    minWidth: 70,
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  capacitySection: {
    marginTop: 12,
  },
  capacityLabels: {
    flexWrap: 'wrap',
    gap: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  capacityTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  capacityVal: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});

