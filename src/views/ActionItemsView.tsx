import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Car,
  ChevronRight,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  X,
} from 'lucide-react-native';
import { ActionItem } from '../types';
import { inventoryApi } from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

interface ActionItemsViewProps {
  initialSearch?: string;
  initialStatus?: string;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function ActionItemsView({
  initialSearch = '',
  initialStatus = 'open',
  onShowToast,
}: ActionItemsViewProps) {
  const { selectedRooftop } = useAuth();

  const [actions, setActions] = useState<ActionItem[]>([]);
  const [totalActions, setTotalActions] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolution modal state
  const [selectedAction, setSelectedAction] = useState<ActionItem | null>(null);
  const [resolutionStatus, setResolutionStatus] = useState<ActionItem['status']>('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const typeOptions = ['all', 'PRICE', 'WHOLESALE', 'TRANSFER'];
  const statusOptions = [
    { id: 'open', label: 'Open' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'all', label: 'All Status' },
  ];

  const fetchActions = useCallback(async () => {
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
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.actionType = typeFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await inventoryApi.getActionItems(params);
      if (res.success && res.data) {
        setActions(res.data);
        if (res.pagination) {
          setTotalActions(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        } else {
          setTotalActions(res.data.length);
          setTotalPages(1);
        }
      } else {
        throw new Error(res.error || 'Failed to fetch action items.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load capital radar actions.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedRooftop, statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRooftop, statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleUpdateAction = async () => {
    if (!selectedAction || isUpdating) return;
    setIsUpdating(true);
    try {
      const res = await inventoryApi.updateActionItem(selectedAction._id, {
        status: resolutionStatus,
        resolvedNotes: resolutionNotes.trim(),
      });
      if (res.success) {
        setActions((prev) =>
          prev.map((a) =>
            a._id === selectedAction._id
              ? { ...a, status: resolutionStatus, resolvedNotes: resolutionNotes.trim() }
              : a
          )
        );
        onShowToast?.(`Action item marked ${resolutionStatus}`);
        setSelectedAction(null);
      } else {
        throw new Error(res.error || 'Unable to update action item.');
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'Failed to update action item', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'PRICE':
        return { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
      case 'WHOLESALE':
        return { text: '#d97706', bg: '#fffbeb', border: '#fde68a' };
      case 'TRANSFER':
        return { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' };
      default:
        return { text: '#475569', bg: '#f1f5f9', border: '#cbd5e1' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Capital Radar Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <View style={styles.bannerTagRow}>
            <Text style={styles.bannerTag}>CAPITAL RADAR OS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalActions.toLocaleString()} Active</Text>
            </View>
          </View>
          <Text style={styles.bannerTitle}>Inventory Capital & Holds</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search stock #, vehicle title, reason..."
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

      {/* Type & Status Filters */}
      <View style={styles.filtersWrapper}>
        <ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {typeOptions.map((type) => {
            const isSelected = typeFilter === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setTypeFilter(type)}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                  {type === 'all' ? 'All Types' : type}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.filterDivider} />

          {statusOptions.map((opt) => {
            const isSelected = statusFilter === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setStatusFilter(opt.id)}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchActions} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Items List */}
      <ScrollView
        style={styles.actionsList}
        contentContainerStyle={styles.actionsListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && actions.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Analyzing inventory capital radar...</Text>
          </View>
        ) : actions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={36} color={colors.emerald} />
            <Text style={styles.emptyTitle}>All Capital Items Clear</Text>
            <Text style={styles.emptySubtitle}>
              No pending action items for current filters.
            </Text>
          </View>
        ) : (
          actions.map((item) => {
            const typeStyle = getTypeColor(item.actionType);
            const isResolved = item.status === 'resolved';

            return (
              <TouchableOpacity
                key={item._id}
                onPress={() => {
                  setSelectedAction(item);
                  setResolutionStatus(item.status);
                  setResolutionNotes(item.resolvedNotes || '');
                }}
                style={styles.actionCard}
                activeOpacity={0.8}
              >
                <View style={styles.actionCardTop}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: typeStyle.bg,
                        borderColor: typeStyle.border,
                      },
                    ]}
                  >
                    <Text style={[styles.typeBadgeText, { color: typeStyle.text }]}>
                      {item.actionType}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusTag,
                      {
                        backgroundColor:
                          item.status === 'open'
                            ? '#fee2e2'
                            : item.status === 'in_progress'
                            ? '#fef3c7'
                            : '#ecfdf5',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        {
                          color:
                            item.status === 'open'
                              ? colors.danger
                              : item.status === 'in_progress'
                              ? colors.amber
                              : colors.emerald,
                        },
                      ]}
                    >
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.vehicleTitle}>{item.vehicleTitle}</Text>
                <Text style={styles.locationText}>
                  Stock #{item.stockNumber} · {item.rooftopName}
                  {item.targetRooftopName ? ` ➔ ${item.targetRooftopName}` : ''}
                </Text>

                {/* Reason & Impact */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>{item.reason}</Text>
                  {item.impactMetric ? (
                    <Text style={styles.impactText}>Impact: {item.impactMetric}</Text>
                  ) : null}
                </View>

                {item.resolvedNotes ? (
                  <Text style={styles.resolvedNotesText}>
                    Resolution: {item.resolvedNotes}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <Text style={styles.footerDate}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </Text>
                  <Text style={styles.manageBtnText}>Update Action</Text>
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
        totalItems={totalActions}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="actions"
        isLoading={isLoading}
      />

      {/* Update Resolution Modal */}
      {selectedAction && (
        <Modal
          visible={Boolean(selectedAction)}
          animationType="fade"
          transparent
          onRequestClose={() => setSelectedAction(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.resolutionSheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Update Action Item</Text>
                <TouchableOpacity onPress={() => setSelectedAction(null)}>
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>

              <Text style={styles.sheetVehicle} numberOfLines={1}>
                {selectedAction.vehicleTitle}
              </Text>
              <Text style={styles.sheetSub}>Stock #{selectedAction.stockNumber}</Text>

              <Text style={styles.modalLabel}>STATUS</Text>
              <View style={styles.statusButtonsRow}>
                {(['open', 'in_progress', 'resolved'] as ActionItem['status'][]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setResolutionStatus(s)}
                    style={[
                      styles.statusBtn,
                      resolutionStatus === s && styles.statusBtnSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBtnText,
                        resolutionStatus === s && styles.statusBtnTextSelected,
                      ]}
                    >
                      {s.replace('_', ' ').toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { marginTop: 12 }]}>
                RESOLUTION / MANAGER NOTES
              </Text>
              <TextInput
                style={styles.notesInput}
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                placeholder="Details of price adjustment, wholesale trade, or transfer..."
                placeholderTextColor="#94a3b8"
                multiline
              />

              <TouchableOpacity
                onPress={handleUpdateAction}
                disabled={isUpdating}
                style={[styles.saveActionBtn, isUpdating && { opacity: 0.6 }]}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveActionBtnText}>Save Resolution</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  bannerLeft: {
    flex: 1,
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
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    color: '#b45309',
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
    minHeight: 44,
    gap: 8,
  },
  searchInput: {
    minWidth: 0,
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
    flexShrink: 0,
  },
  filtersRow: {
    paddingVertical: 4,
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
  actionsList: {
    flex: 1,
  },
  actionsListContent: {
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
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    ...shadows.sm,
  },
  actionCardTop: {
    flexWrap: 'wrap',
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  locationText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reasonBox: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.signalRed,
  },
  reasonText: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amber,
    marginTop: 4,
  },
  resolvedNotesText: {
    fontSize: 11,
    color: colors.emerald,
    marginTop: 6,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.signalRed,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  resolutionSheet: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    ...shadows.lg,
  },
  sheetHeader: {
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sheetVehicle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sheetSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statusButtonsRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    flexBasis: 100,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  statusBtnSelected: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphite,
  },
  statusBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusBtnTextSelected: {
    color: '#ffffff',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: '#f8fafc',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveActionBtn: {
    backgroundColor: colors.signalRed,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  saveActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
