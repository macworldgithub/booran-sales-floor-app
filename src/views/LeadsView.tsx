import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  Search,
  Users,
  Filter,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { Lead } from '../types';
import { leadApi } from '../services/api';
import { Pagination } from '../components/common/Pagination';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

interface LeadsViewProps {
  onSelectLead: (lead: Lead) => void;
  onOpenBookDrive: (lead?: Lead) => void;
  onOpenAddProspect: () => void;
}

export function LeadsView({
  onSelectLead,
  onOpenBookDrive,
  onOpenAddProspect,
}: LeadsViewProps) {
  const { selectedRooftop } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { id: 'all', label: 'All Status' },
    { id: 'new_lead', label: 'New Leads', color: colors.blue },
    { id: 'following_up', label: 'Following Up', color: colors.amber },
    { id: 'sold', label: 'Sold', color: colors.emerald },
    { id: 'lost', label: 'Lost', color: colors.slate },
  ];

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: pageSize,
      };

      if (selectedRooftop !== 'All Locations') {
        params.dealership = selectedRooftop;
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const res = await leadApi.getLeads(params);
      if (res.success && res.data) {
        setLeads(res.data);
        if (res.pagination) {
          setTotalLeads(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        } else {
          setTotalLeads(res.data.length);
          setTotalPages(1);
        }
      } else {
        throw new Error(res.error || 'Failed to fetch leads.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load leads.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, selectedRooftop, statusFilter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRooftop, statusFilter, searchQuery]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    }
  };

  const handleEmail = (email?: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Intro Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <View style={styles.bannerTagRow}>
            <Text style={styles.bannerTag}>FLWUP_CRM DATABASE</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalLeads.toLocaleString()} Records</Text>
            </View>
          </View>
          <Text style={styles.bannerTitle}>Leads & Pipeline Management</Text>
        </View>

        <TouchableOpacity onPress={onOpenAddProspect} style={styles.addBtn}>
          <Plus size={16} color="#ffffff" />
          <Text style={styles.addBtnText}>Prospect</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Search size={16} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, phone, email, vehicle..."
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

      {/* Filter Status Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {statusOptions.map((opt) => {
          const isSelected = statusFilter === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              onPress={() => setStatusFilter(opt.id)}
              style={[
                styles.filterPill,
                isSelected && styles.filterPillSelected,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isSelected && styles.filterPillTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchLeads} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leads List */}
      <ScrollView
        style={styles.leadsList}
        contentContainerStyle={styles.leadsListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && leads.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Loading prospects from CRM...</Text>
          </View>
        ) : leads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No leads found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search query, status filter, or active dealership.
            </Text>
          </View>
        ) : (
          leads.map((lead) => {
            const initials =
              lead.initials ||
              (lead.name || lead.customer_name || 'PR')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

            const isNew = lead.status === 'new_lead';
            const phone = lead.phone || lead.customer_phone;
            const email = lead.email || lead.customer_email;

            return (
              <TouchableOpacity
                key={lead._id}
                onPress={() => onSelectLead(lead)}
                style={styles.leadCard}
                activeOpacity={0.8}
              >
                <View style={styles.leadCardTop}>
                  <View style={styles.leadInfoLeft}>
                    <View style={[styles.avatar, isNew && styles.avatarNew]}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName} numberOfLines={1}>
                        {lead.name || lead.customer_name}
                      </Text>
                      <Text style={styles.dealershipText} numberOfLines={1}>
                        {lead.dealership}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          lead.status === 'new_lead'
                            ? '#eff6ff'
                            : lead.status === 'following_up'
                            ? '#fffbeb'
                            : lead.status === 'sold'
                            ? '#ecfdf5'
                            : '#f1f5f9',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color:
                            lead.status === 'new_lead'
                              ? colors.blue
                              : lead.status === 'following_up'
                              ? colors.amber
                              : lead.status === 'sold'
                              ? colors.emerald
                              : colors.slate,
                        },
                      ]}
                    >
                      {lead.status?.toUpperCase() || 'NEW'}
                    </Text>
                  </View>
                </View>

                {/* Vehicle of Interest */}
                <View style={styles.vehicleRow}>
                  <Text style={styles.vehicleLabel}>Interest:</Text>
                  <Text style={styles.vehicleVal} numberOfLines={1}>
                    {lead.vehicle || `${lead.make || ''} ${lead.model || ''}`.trim() || 'General Inquiry'}
                  </Text>
                </View>

                {/* Consultant & Timing */}
                <View style={styles.metaRow}>
                  <Text style={styles.consultantText}>
                    Staff: {lead.owner_name || lead.assignedTo || 'Unassigned'}
                  </Text>
                  {lead.created_at && (
                    <Text style={styles.timeText}>
                      {new Date(lead.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionsRow}>
                  {phone ? (
                    <TouchableOpacity
                      onPress={() => handleCall(phone)}
                      style={styles.actionChip}
                    >
                      <Phone size={12} color={colors.textPrimary} />
                      <Text style={styles.actionChipText}>Call</Text>
                    </TouchableOpacity>
                  ) : null}

                  {email ? (
                    <TouchableOpacity
                      onPress={() => handleEmail(email)}
                      style={styles.actionChip}
                    >
                      <Mail size={12} color={colors.textPrimary} />
                      <Text style={styles.actionChipText}>Email</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    onPress={() => onOpenBookDrive(lead)}
                    style={[styles.actionChip, styles.actionChipPrimary]}
                  >
                    <Calendar size={12} color="#ffffff" />
                    <Text style={styles.actionChipTextPrimary}>Test Drive</Text>
                  </TouchableOpacity>

                  <View style={{ flex: 1 }} />
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
        totalItems={totalLeads}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        itemName="leads"
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addBtn: {
    backgroundColor: colors.signalRed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
  filtersScroll: {
    marginTop: 8,
    maxHeight: 38,
  },
  filtersContent: {
    paddingHorizontal: 12,
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
  leadsList: {
    flex: 1,
  },
  leadsListContent: {
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
  leadCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    ...shadows.sm,
  },
  leadCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.graphite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarNew: {
    backgroundColor: colors.signalRed,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  dealershipText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  vehicleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  vehicleVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  consultantText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionChipPrimary: {
    backgroundColor: colors.signalRed,
  },
  actionChipTextPrimary: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
});

