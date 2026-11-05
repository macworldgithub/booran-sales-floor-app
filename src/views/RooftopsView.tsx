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
  MapPin,
  Building,
  User,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  Tag,
} from 'lucide-react-native';
import { Rooftop } from '../types';
import { inventoryApi } from '../services/api';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

interface RooftopsViewProps {
  onSelectRooftopFilter: (rooftop: string) => void;
}

export function RooftopsView({ onSelectRooftopFilter }: RooftopsViewProps) {
  const { selectedRooftop } = useAuth();
  const [rooftops, setRooftops] = useState<Rooftop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRooftops = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.getInventoryRooftops(selectedRooftop);
      if (res.success && res.data) {
        setRooftops(res.data);
      } else {
        throw new Error(res.error || 'Failed to fetch rooftops.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load dealership locations.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRooftop]);

  useEffect(() => {
    fetchRooftops();
  }, [fetchRooftops]);

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerTagRow}>
          <Text style={styles.bannerTag}>BOORAN MOTORS NETWORK</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{rooftops.length} Rooftops</Text>
          </View>
        </View>
        <Text style={styles.bannerTitle}>Locations & Dealerships</Text>
        <Text style={styles.bannerSubtitle}>
          Holding cost rates, dealer principals, and DMS integration branch codes.
        </Text>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchRooftops} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Rooftops List */}
      <ScrollView
        style={styles.rooftopsList}
        contentContainerStyle={styles.rooftopsListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && rooftops.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Loading authorized dealerships...</Text>
          </View>
        ) : rooftops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MapPin size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No rooftops found</Text>
            <Text style={styles.emptySubtitle}>No locations match current scope filter.</Text>
          </View>
        ) : (
          rooftops.map((roof) => (
            <View key={roof.id || roof._id || roof.name} style={styles.rooftopCard}>
              <View style={styles.cardHeader}>
                <View style={styles.brandIcon}>
                  <Building size={18} color="#ffffff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rooftopName}>{roof.name}</Text>
                  <Text style={styles.rooftopLocation}>
                    {roof.location || 'Victoria, Australia'}
                  </Text>
                </View>
                {roof.brand && (
                  <View style={styles.brandBadge}>
                    <Text style={styles.brandBadgeText}>{roof.brand}</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailsGrid}>
                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>GENERAL MANAGER</Text>
                  <Text style={styles.detailVal}>{roof.generalManager || 'Executive GM'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>DEALER PRINCIPAL</Text>
                  <Text style={styles.detailVal}>{roof.dealerPrincipal || 'Executive DP'}</Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>HOLDING COST RATE</Text>
                  <Text style={[styles.detailVal, { color: colors.amber }]}>
                    ${(roof.dailyHoldingCostRate || 25).toFixed(2)} / day
                  </Text>
                </View>

                <View style={styles.detailBox}>
                  <Text style={styles.detailLabel}>PENTANA BRANCH</Text>
                  <Text style={styles.detailVal}>
                    {roof.pentanaBranchCodes?.join(', ') || 'Connected'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => onSelectRooftopFilter(roof.name)}
                style={styles.filterStockBtn}
              >
                <Text style={styles.filterStockText}>Filter Stock at this Location</Text>
                <ChevronRight size={14} color={colors.signalRed} />
              </TouchableOpacity>
            </View>
          ))
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
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    color: colors.signalRed,
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
  rooftopsList: {
    flex: 1,
  },
  rooftopsListContent: {
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
  rooftopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.graphite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rooftopName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  rooftopLocation: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  brandBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  brandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
  },
  detailBox: {
    width: '48%',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  detailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  filterStockBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  filterStockText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.signalRed,
  },
});

