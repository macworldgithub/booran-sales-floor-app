import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Bell,
  Menu,
  Plus,
  X,
  Users,
  Car,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { BooranLogo } from './BooranLogo';
import { colors, shadows } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { unifiedApi } from '../../services/api';
import { Lead, Vehicle, ActionItem } from '../../types';

interface HeaderProps {
  onOpenMobileNav: () => void;
  onOpenNotifications: () => void;
  onOpenAddProspect: () => void;
  onSelectLead: (lead: Lead) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onSelectAction: (action: ActionItem) => void;
  unreadNotifications?: boolean;
}

export function Header({
  onOpenMobileNav,
  onOpenNotifications,
  onOpenAddProspect,
  onSelectLead,
  onSelectVehicle,
  onSelectAction,
  unreadNotifications = false,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, selectedRooftop } = useAuth();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    leads: Lead[];
    vehicles: Vehicle[];
    actionItems: ActionItem[];
  } | null>(null);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await unifiedApi.search(searchQuery.trim(), selectedRooftop);
        if (res.success && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.warn('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, selectedRooftop]);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 10),
            paddingLeft: Math.max(insets.left, 12),
            paddingRight: Math.max(insets.right, 12),
          },
        ]}
      >
        <View style={styles.topRow}>
          {/* Logo & Dealership pill */}
          <View style={styles.leftSection}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open navigation" onPress={onOpenMobileNav} style={styles.menuButton}>
              <Menu size={22} color="#ffffff" />
            </TouchableOpacity>
            <BooranLogo height={width < 360 ? 18 : 24} />
          </View>

          {/* Right Action Icons */}
          <View style={styles.rightSection}>
            <TouchableOpacity
              testID="header-search"
              accessibilityRole="button"
              accessibilityLabel="Search the sales floor"
              onPress={() => setIsSearchModalOpen(true)}
              style={styles.actionIcon}
            >
              <Search size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              testID="header-add-prospect"
              accessibilityRole="button"
              accessibilityLabel="Add prospect"
              onPress={onOpenAddProspect}
              style={[styles.actionIcon, styles.plusButton]}
            >
              <Plus size={18} color="#ffffff" />
            </TouchableOpacity>

            <TouchableOpacity
              testID="header-notifications"
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={onOpenNotifications}
              style={styles.actionIcon}
            >
              <Bell size={18} color="#cbd5e1" />
              {unreadNotifications && <View style={styles.notificationDot} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-bar showing active rooftop */}
        <View style={styles.subBar}>
          <View style={styles.dealershipBadge}>
            <Text style={styles.dealershipText} numberOfLines={1}>
              {selectedRooftop}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role === 'super_admin' ? 'SUPER ADMIN' : 'MANAGER'}
            </Text>
          </View>
        </View>
      </View>

      {/* Global Unified Search Modal */}
      <Modal
        visible={isSearchModalOpen}
        animationType="slide"
        onRequestClose={() => setIsSearchModalOpen(false)}
      >
        <View style={[styles.searchModalContainer, { paddingTop: insets.top }]}>
          <View style={styles.searchHeader}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search leads, stock, VIN, actions..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                autoCapitalize="none"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setIsSearchModalOpen(false)}
              style={styles.cancelSearchButton}
            >
              <Text style={styles.cancelSearchText}>Close</Text>
            </TouchableOpacity>
          </View>

          {isSearching && (
            <View style={styles.searchLoading}>
              <ActivityIndicator size="small" color={colors.signalRed} />
              <Text style={styles.searchLoadingText}>Searching showroom database...</Text>
            </View>
          )}

          <ScrollView style={styles.searchResultsScroll} keyboardShouldPersistTaps="handled">
            {searchResults ? (
              <View style={styles.resultsContent}>
                {/* Leads Results */}
                {searchResults.leads && searchResults.leads.length > 0 && (
                  <View style={styles.resultGroup}>
                    <View style={styles.groupHeader}>
                      <Users size={14} color={colors.blue} />
                      <Text style={styles.groupHeaderText}>
                        Leads ({searchResults.leads.length})
                      </Text>
                    </View>
                    {searchResults.leads.map((lead) => (
                      <TouchableOpacity
                        key={lead._id}
                        onPress={() => {
                          setIsSearchModalOpen(false);
                          onSelectLead(lead);
                        }}
                        style={styles.resultItem}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultTitle}>{lead.name || lead.customer_name}</Text>
                          <Text style={styles.resultSubtitle}>
                            {lead.vehicle || `${lead.make || ''} ${lead.model || ''}`} · {lead.dealership}
                          </Text>
                        </View>
                        <ChevronRight size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Vehicles Results */}
                {searchResults.vehicles && searchResults.vehicles.length > 0 && (
                  <View style={styles.resultGroup}>
                    <View style={styles.groupHeader}>
                      <Car size={14} color={colors.emerald} />
                      <Text style={styles.groupHeaderText}>
                        Stock Vehicles ({searchResults.vehicles.length})
                      </Text>
                    </View>
                    {searchResults.vehicles.map((v) => (
                      <TouchableOpacity
                        key={v._id}
                        onPress={() => {
                          setIsSearchModalOpen(false);
                          onSelectVehicle(v);
                        }}
                        style={styles.resultItem}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultTitle}>
                            {v.year} {v.make} {v.model} {v.variant || ''}
                          </Text>
                          <Text style={styles.resultSubtitle}>
                            Stock #{v.stockNumber} · VIN: {v.vin?.slice(-6)} · {v.rooftopName}
                          </Text>
                        </View>
                        <ChevronRight size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Action Items Results */}
                {searchResults.actionItems && searchResults.actionItems.length > 0 && (
                  <View style={styles.resultGroup}>
                    <View style={styles.groupHeader}>
                      <AlertTriangle size={14} color={colors.amber} />
                      <Text style={styles.groupHeaderText}>
                        Capital Radar ({searchResults.actionItems.length})
                      </Text>
                    </View>
                    {searchResults.actionItems.map((item) => (
                      <TouchableOpacity
                        key={item._id}
                        onPress={() => {
                          setIsSearchModalOpen(false);
                          onSelectAction(item);
                        }}
                        style={styles.resultItem}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultTitle}>
                            [{item.actionType}] {item.vehicleTitle}
                          </Text>
                          <Text style={styles.resultSubtitle}>
                            Stock #{item.stockNumber} · {item.reason}
                          </Text>
                        </View>
                        <ChevronRight size={16} color="#94a3b8" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {searchResults.leads.length === 0 &&
                  searchResults.vehicles.length === 0 &&
                  searchResults.actionItems.length === 0 && (
                    <View style={styles.noResults}>
                      <Text style={styles.noResultsText}>
                        {`No records found matching “${searchQuery}”.`}
                      </Text>
                    </View>
                  )}
              </View>
            ) : (
              !isSearching && (
                <View style={styles.searchPrompt}>
                  <Text style={styles.searchPromptText}>
                    Type a prospect name, phone, VIN, stock number, or vehicle model to search across the sales floor.
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#171b22',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingBottom: 8,
    ...shadows.sm,
  },
  topRow: {
    gap: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  leftSection: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  plusButton: {
    backgroundColor: colors.signalRed,
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.signalRed,
    borderWidth: 1.5,
    borderColor: '#171b22',
  },
  subBar: {
    gap: 8,
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  dealershipBadge: {
    flexShrink: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    maxWidth: '70%',
  },
  dealershipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: 'rgba(230, 0, 18, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  roleText: {
    color: colors.signalRed,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Modal styles
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    gap: 10,
  },
  searchInputWrapper: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
    gap: 8,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 44,
  },
  cancelSearchButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelSearchText: {
    color: colors.signalRed,
    fontSize: 14,
    fontWeight: '700',
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  searchResultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    gap: 16,
  },
  resultGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  groupHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resultSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchPrompt: {
    padding: 32,
    alignItems: 'center',
  },
  searchPromptText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  noResults: {
    padding: 32,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
