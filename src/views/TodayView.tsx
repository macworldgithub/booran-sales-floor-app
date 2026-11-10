import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  Car,
  Calendar,
  AlertTriangle,
  Clock,
  Plus,
  ChevronRight,
  TrendingDown,
} from 'lucide-react-native';
import { Lead, Vehicle, ActionItem, Appointment, UnifiedSummary } from '../types';
import { MetricCard } from '../components/common/MetricCard';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { DailyOversight } from '../components/common/DailyOversight';
import { PulseCard } from '../components/common/PulseCard';
import { DeliveryCentre } from '../components/common/DeliveryCentre';

interface TodayViewProps {
  leads: Lead[];
  vehicles: Vehicle[];
  actionItems: ActionItem[];
  appointments: Appointment[];
  summary: UnifiedSummary | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectLead: (lead: Lead) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenBookDrive: (lead?: Lead) => void;
  onOpenAddProspect: () => void;
  onNavigateTab: (tab: string) => void;
}

export function TodayView({
  leads,
  vehicles,
  actionItems,
  appointments,
  summary,
  isLoading,
  onRefresh,
  onSelectLead,
  onSelectVehicle,
  onOpenBookDrive,
  onOpenAddProspect,
  onNavigateTab,
}: TodayViewProps) {
  const { user, selectedRooftop } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const availableWidth = (Math.min(width, 1120) - 32) / fontScale;
  const metricBasis = availableWidth >= 720 ? '22%' : availableWidth >= 320 ? '46%' : '100%';

  const totalLeadsCount = summary?.crm?.totalLeads ?? leads.length;
  const followUpCount = summary?.crm?.followingUp ?? 0;
  const stockCount = summary?.inventory?.totalVehicles ?? vehicles.length;
  const agingCount = summary?.inventory?.agingOver90Days ?? 0;
  const openActionsCount = summary?.inventory?.openActionItems ?? actionItems.length;

  const urgentLeads = leads
    .filter((l) => l.status === 'new_lead' || l.status === 'following_up' || l.priority)
    .slice(0, 5);

  const criticalAgingVehicles = vehicles
    .filter((v) => v.daysInStock >= 60 || v.agingBucket === '90+')
    .slice(0, 4);

  const urgentActions = actionItems
    .filter((a) => a.status === 'open')
    .slice(0, 3);

  const scopeLabel =
    selectedRooftop === 'All Locations'
      ? user?.role === 'super_admin'
        ? 'Booran Group Network (Victoria)'
        : `${user?.site} Group Dealerships`
      : selectedRooftop;

  return (
    <ScrollView
      testID="today-scroll"
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={onRefresh}
          tintColor={colors.signalRed}
          colors={[colors.signalRed]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Executive Command Banner */}
      <LinearGradient
        colors={['#171b22', '#232b38', '#12161c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerBadgeRow}>
          <View style={styles.liveTag}>
            <Text style={styles.liveTagText}>LIVE SALES FLOOR OS</Text>
          </View>
          <Text style={styles.scopeText}>
            {scopeLabel}
          </Text>
        </View>

        <Text style={styles.bannerTitle}>Sales Floor Command</Text>
        <Text style={styles.bannerSubtitle}>
          Your live overview of leads, showroom stock and dealership activity.
        </Text>

        <View style={styles.quickActionRow}>
          <TouchableOpacity
            onPress={onOpenAddProspect}
            style={styles.quickActionButton}
            activeOpacity={0.8}
          >
            <Plus size={14} color="#ffffff" />
            <Text style={styles.quickActionText}>Add Prospect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onOpenBookDrive()}
            style={[styles.quickActionButton, styles.quickActionOutline]}
            activeOpacity={0.8}
          >
            <Calendar size={14} color="#ffffff" />
            <Text style={styles.quickActionText}>Book Test Drive</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* KPI Metric Cards */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricSlot, { flexBasis: metricBasis }]}>
          <MetricCard
            label="Active Pipeline"
            value={totalLeadsCount}
            change={`${followUpCount} following up`}
            icon={Users}
            tone="cyan"
            onPress={() => onNavigateTab('leads')}
          />
        </View>
        <View style={[styles.metricSlot, { flexBasis: metricBasis }]}>
          <MetricCard
            label="Showroom Stock"
            value={stockCount}
            change="Live inventory units"
            icon={Car}
            tone="green"
            onPress={() => onNavigateTab('inventory')}
          />
        </View>
        <View style={[styles.metricSlot, { flexBasis: metricBasis }]}>
          <MetricCard
            label="Capital Radar"
            value={openActionsCount}
            change="Action items open"
            icon={AlertTriangle}
            tone="amber"
            onPress={() => onNavigateTab('action-items')}
          />
        </View>
        <View style={[styles.metricSlot, { flexBasis: metricBasis }]}>
          <MetricCard
            label="Aging Over 90d"
            value={agingCount}
            change="Requires manager review"
            icon={TrendingDown}
            tone="red"
            onPress={() => onNavigateTab('inventory')}
          />
        </View>
      </View>

      {(user?.canAllocate || user?.role === 'sales_consultant') && <DailyOversight key={selectedRooftop} onOpenLead={onSelectLead} refreshKey={isLoading} />}
      <PulseCard onOpenLead={onSelectLead} />
      <DeliveryCentre onOpenLead={onSelectLead} />

      {/* Today's Appointments Section */}
      <View style={styles.cardSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Calendar size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Today’s Appointments</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateTab('calendar')}>
            <Text style={styles.viewAllLink}>View All</Text>
          </TouchableOpacity>
        </View>

        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No appointments scheduled today.</Text>
            <TouchableOpacity onPress={() => onOpenBookDrive()} style={styles.emptyActionBtn}>
              <Text style={styles.emptyActionText}>Schedule Test Drive</Text>
            </TouchableOpacity>
          </View>
        ) : (
          appointments.slice(0, 4).map((appt) => (
            <View key={appt._id} style={styles.appointmentRow}>
              <View style={styles.timeBadge}>
                <Clock size={12} color={colors.signalRed} />
                <Text style={styles.timeText}>
                  {appt.when ? new Date(appt.when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00'}
                </Text>
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.apptProspect}>{appt.prospectName}</Text>
                <Text style={styles.apptVehicle}>
                  {appt.vehicle || 'Vehicle Consultation'} · {appt.consultantName || 'Staff'}
                </Text>
              </View>

              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{appt.type}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Urgent Leads Attention Section */}
      <View style={styles.cardSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Users size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Urgent Leads Needing Contact</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateTab('leads')}>
            <Text style={styles.viewAllLink}>Pipeline ({totalLeadsCount.toLocaleString()})</Text>
          </TouchableOpacity>
        </View>

        {urgentLeads.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>All leads are currently contacted and updated.</Text>
          </View>
        ) : (
          urgentLeads.map((lead) => {
            const initials =
              lead.initials ||
              (lead.name || lead.customer_name || 'PR')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

            const isNew = lead.status === 'new_lead';

            return (
              <TouchableOpacity
                key={lead._id}
                onPress={() => onSelectLead(lead)}
                style={styles.leadRow}
                activeOpacity={0.7}
              >
                <View style={[styles.leadAvatar, isNew && styles.leadAvatarNew]}>
                  <Text style={styles.leadAvatarText}>{initials}</Text>
                </View>

                <View style={styles.leadContent}>
                  <View style={styles.leadTopLine}>
                    <Text style={styles.leadName}>{lead.name || lead.customer_name}</Text>
                    <View
                      style={[
                        styles.leadStatusTag,
                        {
                          backgroundColor: isNew ? '#eff6ff' : '#fffbeb',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.leadStatusText,
                          {
                            color: isNew ? colors.blue : colors.amber,
                          },
                        ]}
                      >
                        {isNew ? 'NEW INTAKE' : 'FOLLOW UP'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.leadDetails}>
                    {lead.vehicle || `${lead.make || ''} ${lead.model || ''}`.trim() || 'Vehicle interest'} · {lead.dealership}
                  </Text>
                </View>

                <ChevronRight size={16} color="#94a3b8" />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Critical Aging Stock Section */}
      <View style={styles.cardSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Car size={16} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>High Holding Cost Vehicles</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateTab('inventory')}>
            <Text style={styles.viewAllLink}>Stock ({stockCount.toLocaleString()})</Text>
          </TouchableOpacity>
        </View>

        {criticalAgingVehicles.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No critical aging vehicles in current dealership filter.</Text>
          </View>
        ) : (
          criticalAgingVehicles.map((v) => (
            <TouchableOpacity
              key={v._id}
              onPress={() => onSelectVehicle(v)}
              style={styles.vehicleRow}
              activeOpacity={0.7}
            >
              <View style={styles.rowContent}>
                <View style={styles.vehicleTitleRow}>
                  <Text style={styles.vehicleTitle}>
                    {v.year} {v.make} {v.model} {v.variant || ''}
                  </Text>
                </View>

                <Text style={styles.vehicleSub}>
                  Stock #{v.stockNumber} · {v.rooftopName}
                </Text>

                <View style={styles.vehicleTagsRow}>
                  <View style={styles.agingPill}>
                    <Text style={styles.agingPillText}>{v.daysInStock} Days in Stock</Text>
                  </View>

                  <View style={styles.holdingPill}>
                    <Text style={styles.holdingPillText}>
                      ${(v.accumulatedHoldingCost || (v.daysInStock * 25)).toLocaleString()} holding
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.vehiclePriceCol}>
                <Text style={styles.vehiclePrice}>
                  ${(v.advertisedPrice || 0).toLocaleString()}
                </Text>
                <Text style={styles.vehicleGross}>
                  +${(v.potentialGross || 0).toLocaleString()} gross
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Urgent Capital Radar Actions */}
      {urgentActions.length > 0 && (
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <AlertTriangle size={16} color={colors.amber} />
              <Text style={styles.sectionTitle}>Capital Radar Recommendations</Text>
            </View>
            <TouchableOpacity onPress={() => onNavigateTab('action-items')}>
              <Text style={styles.viewAllLink}>All Actions</Text>
            </TouchableOpacity>
          </View>

          {urgentActions.map((item) => (
            <TouchableOpacity
              key={item._id}
              onPress={() => onNavigateTab('action-items')}
              style={styles.actionRow}
              activeOpacity={0.7}
            >
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>{item.actionType}</Text>
              </View>

              <View style={styles.rowContent}>
                <Text style={styles.actionTitle}>{item.vehicleTitle}</Text>
                <Text style={styles.actionReason}>{item.reason}</Text>
              </View>

              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
  },
  banner: {
    backgroundColor: colors.graphite,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.md,
  },
  bannerBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  liveTag: {
    maxWidth: '100%',
    backgroundColor: colors.signalRed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveTagText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scopeText: {
    color: '#94a3b8',
    fontSize: 11,
    flexGrow: 1,
    flexBasis: 170,
    flexShrink: 1,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
    marginTop: 4,
  },
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  quickActionButton: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.signalRed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  quickActionOutline: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  quickActionText: {
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricSlot: {
    flexGrow: 1,
    minWidth: 0,
  },
  rowContent: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  leadContent: {
    flex: 1,
    minWidth: 0,
  },
  cardSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeaderLeft: {
    flexGrow: 1,
    flexBasis: 200,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAllLink: {
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: colors.signalRed,
  },
  emptyState: {
    paddingVertical: 18,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  emptyActionBtn: {
    marginTop: 6,
  },
  emptyActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.signalRed,
  },
  appointmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.signalRed,
  },
  apptProspect: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  apptVehicle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  typeBadge: {
    maxWidth: '100%',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  leadAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.graphite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadAvatarNew: {
    backgroundColor: colors.signalRed,
  },
  leadAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  leadTopLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadName: {
    flexGrow: 1,
    flexBasis: 120,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  leadStatusTag: {
    maxWidth: '100%',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leadStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  leadDetails: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vehicleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  vehicleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  vehicleTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  agingPill: {
    maxWidth: '100%',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  agingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.danger,
  },
  holdingPill: {
    maxWidth: '100%',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  holdingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.amber,
  },
  vehiclePriceCol: {
    flexGrow: 1,
    alignItems: 'flex-end',
  },
  vehiclePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleGross: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.emerald,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionBadge: {
    maxWidth: '100%',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.amber,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionReason: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

