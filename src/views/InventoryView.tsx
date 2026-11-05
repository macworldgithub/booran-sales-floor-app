import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Search,
  Car,
  Filter,
  DollarSign,
  Clock,
  Lock,
  ChevronRight,
  ShieldCheck,
  Globe,
  Tag,
} from 'lucide-react-native';
import { Vehicle } from '../types';
import { inventoryApi } from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

interface InventoryViewProps {
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export function InventoryView({ onSelectVehicle }: InventoryViewProps) {
  const { selectedRooftop } = useAuth();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = ['all', 'New', 'Used', 'Demo'];
  const agingOptions = [
    { id: 'all', label: 'All Aging' },
    { id: '0-30', label: '0–30d' },
    { id: '31-45', label: '31–45d' },
    { id: '46-60', label: '46–60d' },
    { id: '61-90', label: '61–90d' },
    { id: '90+', label: '90+ Days', highlight: true },
  ];

  const fetchVehicles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: pageSize,
      };

      if (selectedRooftop !== 'All Locations') {
        params.rooftop = selectedRooftop;
      }
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (agingFilter !== 'all') {
        params.agingBucket = agingFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await inventoryApi.getVehicles(params);
      if (res.success && res.data) {
        setVehicles(res.data);
        if (res.pagination) {
          setTotalVehicles(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        } else {
          setTotalVehicles(res.data.length);
          setTotalPages(1);
        }
      } else {
        throw new Error(res.error || 'Failed to fetch inventory.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load vehicle stock.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedRooftop, categoryFilter, agingFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRooftop, categoryFilter, agingFilter, searchQuery]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return (
    <View style={styles.container}>
      {/* Intro Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerTagRow}>
          <Text style={styles.bannerTag}>BOORAN_INVENTORY_TRACKER</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{totalVehicles.toLocaleString()} Units</Text>
          </View>
        </View>
        <Text style={styles.bannerTitle}>Live Showroom Inventory</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search make, model, VIN, stock #..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearch}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category & Aging Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {categoryOptions.map((cat) => {
            const isSelected = categoryFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategoryFilter(cat)}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                  {cat === 'all' ? 'All Stock' : cat}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.filterDivider} />

          {agingOptions.map((opt) => {
            const isSelected = agingFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setAgingFilter(opt.id)}
                style={[
                  styles.filterPill,
                  isSelected && styles.filterPillSelected,
                  opt.highlight && !isSelected && styles.filterPillHighlight,
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.filterPillTextSelected,
                    opt.highlight && !isSelected && { color: colors.danger, fontWeight: '700' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error Alert */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchVehicles} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vehicles List */}
      <ScrollView
        style={styles.vehiclesList}
        contentContainerStyle={styles.vehiclesListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && vehicles.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Fetching showroom stock...</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Car size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No stock vehicles found</Text>
            <Text style={styles.emptySubtitle}>
              Adjust your search keywords, category filters, or selected dealership.
            </Text>
          </View>
        ) : (
          vehicles.map((v) => {
            const isHeld = v.status === 'Soft Hold' || Boolean(v.softHold?.held);
            const isAging90 = v.daysInStock >= 90 || v.agingBucket === '90+';

            return (
              <TouchableOpacity
                key={v._id}
                onPress={() => onSelectVehicle(v)}
                style={styles.vehicleCard}
                activeOpacity={0.8}
              >
                {/* Header row: Year Make Model & Price */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleTitle} numberOfLines={1}>
                      {v.year} {v.make} {v.model} {v.variant || ''}
                    </Text>
                    <Text style={styles.vehicleLocation} numberOfLines={1}>
                      {v.rooftopName} · Stock #{v.stockNumber}
                    </Text>
                  </View>

                  <View style={styles.priceColumn}>
                    <Text style={styles.priceText}>
                      ${(v.advertisedPrice || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.grossText}>
                      +${(v.potentialGross || 0).toLocaleString()} gross
                    </Text>
                  </View>
                </View>

                {/* Badges Row */}
                <View style={styles.badgesRow}>
                  {/* Status Badge */}
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          v.status === 'In Stock'
                            ? '#ecfdf5'
                            : isHeld
                            ? '#fffbeb'
                            : '#f1f5f9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        {
                          color:
                            v.status === 'In Stock'
                              ? colors.emerald
                              : isHeld
                              ? colors.amber
                              : colors.slate,
                        },
                      ]}
                    >
                      {v.status || 'IN STOCK'}
                    </Text>
                  </View>

                  {/* Category */}
                  <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                      {v.category || 'Used'}
                    </Text>
                  </View>

                  {/* Aging Days Badge */}
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: isAging90 ? '#fee2e2' : '#f8fafc' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isAging90 ? colors.danger : colors.textSecondary },
                      ]}
                    >
                      {v.daysInStock}d in stock
                    </Text>
                  </View>

                  {/* Holding cost badge */}
                  <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                    <Text style={[styles.badgeText, { color: '#b45309' }]}>
                      ${(v.accumulatedHoldingCost || (v.daysInStock * 25)).toLocaleString()} hold
                    </Text>
                  </View>
                </View>

                {/* Soft Hold banner if held */}
                {isHeld && (
                  <View style={styles.softHoldBanner}>
                    <Lock size={12} color={colors.amber} />
                    <Text style={styles.softHoldText}>
                      Soft Hold: {v.softHold?.prospectName || 'Customer Reservation'}
                    </Text>
                  </View>
                )}

                {/* Bottom specs & chevron */}
                <View style={styles.cardFooter}>
                  <Text style={styles.specsText} numberOfLines={1}>
                    VIN: {v.vin?.slice(-6)} · {v.fuel || 'Petrol'} · {v.transmission || 'Auto'} · {v.odometer ? `${v.odometer.toLocaleString()}km` : 'New'}
                  </Text>
                  <ChevronRight size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Pagination Footer */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalVehicles}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="vehicles"
        isLoading={isLoading}
      />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  clearSearch: {
    fontSize: 12,
    color: colors.signalRed,
    fontWeight: '600',
  },
  filtersWrapper: {
    marginTop: 8,
    maxHeight: 38,
  },
  filtersRow: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterPillSelected: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphite,
  },
  filterPillHighlight: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 4,
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
  vehiclesList: {
    flex: 1,
  },
  vehiclesListContent: {
    padding: 12,
    gap: 10,
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
  vehicleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleLocation: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  grossText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.emerald,
    marginTop: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  softHoldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  softHoldText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  specsText: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
});

