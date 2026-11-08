import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Bell,
  Users,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react-native';
import { Lead, UnifiedSummary } from '../../types';
import { colors, shadows } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { fetchApi, leadApi } from '../../services/api';
import { disablePush, enablePush, readPushRegistration } from '../../services/devicePush';
import { WorkflowButton, workflowStyles } from '../common/WorkflowControls';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: UnifiedSummary | null;
  onNavigateTab: (tab: string) => void;
  onOpenLead: (lead: Lead) => void;
}

const categories = [['high_buyer', 'High buyer'], ['price_objection', 'Price objection'], ['high_risk', 'High risk']];

export function NotificationCenterModal({
  isOpen,
  onClose,
  summary,
  onNavigateTab,
  onOpenLead,
}: NotificationCenterModalProps) {
  const insets = useSafeAreaInsets();
  const { selectedRooftop, user } = useAuth();
  const [alerts, setAlerts] = useState<{ _id: string; title: string; dealership: string; lead_id: string; createdAt: string }[]>([]);
  const [enabled, setEnabled] = useState<string[] | null>(null);
  const [push, setPush] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const site = selectedRooftop !== 'All Locations' && user?.canAllocate ? selectedRooftop : '';

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setEnabled(null); setAlerts([]); setError('');
    const load = () => fetchApi<typeof alerts>(`/lead-alerts?limit=20&rooftop=${encodeURIComponent(selectedRooftop)}`).then(result => {
      if (active) setAlerts(result.data || []);
    }).catch(reason => { if (active) setError(reason.message); });
    void load();
    void readPushRegistration().then(token => { if (active) setPush(Boolean(token)); }).catch(() => {});
    if (site) fetchApi<{ enabled: string[] }>(`/lead-alerts/settings?rooftop=${encodeURIComponent(site)}`).then(result => {
      if (active) setEnabled(result.data?.enabled || []);
    }).catch(reason => { if (active) setError(reason.message); });
    const timer = setInterval(load, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [isOpen, selectedRooftop, site]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };

  if (!isOpen) return null;

  const newLeads = summary?.crm?.newLeads ?? 0;
  const openActions = summary?.inventory?.openActionItems ?? 0;
  const agingUnits = summary?.inventory?.agingOver90Days ?? 0;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.bellIcon}>
                <Bell size={18} color="#ffffff" />
              </View>
              <View style={styles.headerDetails}>
                <Text style={styles.title}>Showroom Command Alerts</Text>
                <Text style={styles.subtitle}>Executive Notifications & Tasks</Text>
              </View>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close notifications" onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
            <View style={workflowStyles.card}>
              <Text style={workflowStyles.title}>Lead activity</Text>
              <WorkflowButton label={push ? 'Disable push alerts on this device' : 'Enable push alerts on this device'} disabled={busy} onPress={() => run(async () => {
                if (push) await disablePush(); else await enablePush();
                setPush(!push);
              })} />
              {enabled && <View style={workflowStyles.row}>
                {categories.map(([id, label]) => <WorkflowButton key={id} label={`${label} ${enabled.includes(id) ? 'on' : 'off'}`} disabled={busy} onPress={() => run(async () => {
                  const next = enabled.includes(id) ? enabled.filter(item => item !== id) : [...enabled, id];
                  await fetchApi('/lead-alerts/settings', { method: 'PATCH', body: JSON.stringify({ dealership: site, enabled: next }) });
                  setEnabled(next);
                })} />)}
              </View>}
              {alerts.map(alert => <WorkflowButton key={alert._id} label={`${alert.title} · ${alert.dealership}`} disabled={busy} onPress={() => run(async () => {
                const result = await leadApi.getLead(alert.lead_id);
                if (result.data) { onClose(); onOpenLead(result.data); }
              })} />)}
              {!alerts.length && <Text style={workflowStyles.text}>No high-signal alerts in this view.</Text>}
              {!!error && <Text accessibilityRole="alert" style={workflowStyles.error}>{error}</Text>}
            </View>
            {/* New Leads Notification */}
            {newLeads > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateTab('leads');
                }}
                style={[styles.alertCard, styles.alertBlue]}
              >
                <View style={styles.alertIconWrapper}>
                  <Users size={20} color={colors.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {newLeads} Urgent New Leads
                  </Text>
                  <Text style={styles.alertDesc}>
                    First contact SLA requires outreach within 15 minutes of inquiry.
                  </Text>
                  <View style={styles.alertActionRow}>
                    <Text style={[styles.alertActionText, { color: colors.blue }]}>
                      Review Leads Pipeline
                    </Text>
                    <ChevronRight size={14} color={colors.blue} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Capital Radar Action Items */}
            {openActions > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateTab('action-items');
                }}
                style={[styles.alertCard, styles.alertAmber]}
              >
                <View style={styles.alertIconWrapper}>
                  <AlertTriangle size={20} color={colors.amber} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {openActions} Capital Radar Actions Open
                  </Text>
                  <Text style={styles.alertDesc}>
                    Price adjustments, wholesale conversions, or inter-dealership transfers pending manager review.
                  </Text>
                  <View style={styles.alertActionRow}>
                    <Text style={[styles.alertActionText, { color: colors.amber }]}>
                      Open Capital Radar
                    </Text>
                    <ChevronRight size={14} color={colors.amber} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* Stock Over 90 Days */}
            {agingUnits > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateTab('inventory');
                }}
                style={[styles.alertCard, styles.alertRed]}
              >
                <View style={styles.alertIconWrapper}>
                  <AlertTriangle size={20} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>
                    {agingUnits} Critical Aging Units (90+ Days)
                  </Text>
                  <Text style={styles.alertDesc}>
                    Accumulated holding cost rate exceeding threshold. Recommended wholesale or pricing action.
                  </Text>
                  <View style={styles.alertActionRow}>
                    <Text style={[styles.alertActionText, { color: colors.danger }]}>
                      Filter 90+ Aging Stock
                    </Text>
                    <ChevronRight size={14} color={colors.danger} />
                  </View>
                </View>
              </TouchableOpacity>
            )}

            {/* System Sync Health */}
            <View style={styles.syncCard}>
              <View style={styles.syncHeader}>
                <RefreshCw size={16} color={colors.emerald} />
                <Text style={styles.syncTitle}>Integration & Telemetry Health</Text>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>flwup_crm sync</Text>
                <View style={styles.healthTag}>
                  <CheckCircle2 size={12} color={colors.emerald} />
                  <Text style={styles.healthText}>Connected</Text>
                </View>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>booran_inventory_tracker</Text>
                <View style={styles.healthTag}>
                  <CheckCircle2 size={12} color={colors.emerald} />
                  <Text style={styles.healthText}>Operational</Text>
                </View>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>Active Rooftops</Text>
                <Text style={styles.syncVal}>
                  {summary?.system?.activeRooftops || 4} Locations
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 16,
  },
  sheetHeader: {
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIcon: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.signalRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerDetails: { flex: 1, minWidth: 0 },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  contentScroll: {
    paddingVertical: 14,
  },
  alertCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
    ...shadows.sm,
  },
  alertBlue: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  alertAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  alertRed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  alertIconWrapper: {
    marginTop: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  alertDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  alertActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  syncHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  syncTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  syncLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  healthTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  healthText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.emerald,
  },
  syncVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

