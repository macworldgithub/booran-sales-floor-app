import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { leadApi } from '../../services/api';
import { Pulse, Task, workflows } from '../../services/workflows';
import { Lead } from '../../types';
import { WorkflowButton, WorkflowField, workflowStyles } from './WorkflowControls';
import { colors } from '../../theme/theme';

const periods = [['today', 'Today'], ['week', 'Weekly'], ['month', 'Month to date']];
const metrics: { field: keyof Pulse; label: string; suffix?: string }[] = [
  { field: 'currentActive', label: 'Active leads' }, { field: 'unactioned', label: 'Unactioned leads' },
  { field: 'appointments', label: 'Appointments and test drives' }, { field: 'overdue', label: 'Overdue SLA' },
  { field: 'completed', label: 'Completed deals' }, { field: 'conversion', label: 'Lead-to-sale conversion', suffix: '%' },
  { field: 'videos', label: 'Videos sent' }, { field: 'monthlyTarget', label: 'Monthly target' },
  { field: 'periodLeads', label: 'Leads captured this period' }, { field: 'walkIns', label: 'Walk-in prospects' },
  { field: 'periodSold', label: 'Sold leads from this period' },
];

export async function currentLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) throw new Error('Allow location access to check your dealership geofence.');
  return (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).coords;
}

export function PulseCard({ onOpenLead }: { onOpenLead: (lead: Lead) => void }) {
  const { user, selectedRooftop, locations } = useAuth();
  const { width, fontScale } = useWindowDimensions();
  const metricBasis = fontScale > 1.5 ? '100%' : width / fontScale >= 768 ? '22%' : '46%';
  const [period, setPeriod] = useState('today');
  const [staff, setStaff] = useState('');
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [team, setTeam] = useState<Pulse['team']>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [presence, setPresence] = useState<{ _id: string; name: string; dealership: string; on_site: boolean }[]>([]);
  const [configOpen, setConfigOpen] = useState(false);
  const [followUpHours, setFollowUpHours] = useState('72');
  const [conversionTarget, setConversionTarget] = useState('15');
  const [monthlyTarget, setMonthlyTarget] = useState('10');
  const [radius, setRadius] = useState('150');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const site = selectedRooftop === 'All Locations' ? '' : selectedRooftop;

  const load = useCallback(async () => {
    const [summary, pending, attendance] = await Promise.all([
      workflows.pulse(selectedRooftop, period, staff), workflows.tasks(selectedRooftop), workflows.presence(selectedRooftop),
    ]);
    return { summary, pending, attendance };
  }, [selectedRooftop, period, staff]);

  useEffect(() => {
    let active = true;
    let pending = false;
    setPulse(null);
    setTasks([]);
    setPresence([]);
    const refresh = async () => {
      if (pending) return;
      pending = true;
      try {
        const { summary, pending: items, attendance } = await load();
        if (!active) return;
        if (summary.data) {
          setPulse(summary.data);
          if (!staff) setTeam(summary.data.team);
        }
        setTasks(items.data || []);
        setPresence(attendance.data || []);
        setError('');
      } catch (reason) {
        if (active) setError((reason as Error).message);
      } finally {
        pending = false;
      }
    };
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 20000);
    return () => { active = false; clearInterval(timer); };
  }, [load, staff]);

  useEffect(() => { setStaff(''); setTeam([]); }, [selectedRooftop]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  const openLead = (id: string) => run(async () => {
    const result = await leadApi.getLead(id);
    if (result.data) onOpenLead(result.data);
  });
  const exportPulse = () => run(async () => {
    const csvCell = (value: string) => `"${(/^[=+@-]/.test(value) ? "'" : '') + value.replace(/"/g, '""')}"`;
    const values = metrics.map(({ field, label, suffix }) => [label, `${pulse?.[field] ?? ''}${suffix || ''}`]);
    const rows = [['Period', period], ['Dealership', selectedRooftop], ...values, [], ['Staff', 'Leads', 'Sales'],
      ...(pulse?.team || []).map(member => [member.name, String(member.leads), String(member.sales)]),
      [], ['Site', 'Leads', 'Sales'], ...(pulse?.sites || []).map(item => [item.name, String(item.leads), String(item.sales)]),
      [], ['Vehicle', 'Sales'], ...(pulse?.models || []).map(item => [item.name, String(item.sales)])];
    await Share.share({ title: 'Booran PULSE report', message: rows.map(row => row.map(csvCell).join(',')).join('\n') });
  });

  return <View style={styles.card}>
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>PERFORMANCE OVERVIEW</Text>
      <Text style={styles.title}>{user?.canAllocate ? 'PULSE sales summary' : 'My sales summary'}</Text>
    </View>
    <View style={styles.row}>{periods.map(([id, label]) => <WorkflowButton key={id} label={label} selected={period === id} disabled={period === id} onPress={() => setPeriod(id)} />)}</View>
    {user?.canAllocate && !!team.length && <View style={styles.row}>
      <WorkflowButton label="Whole team" selected={!staff} disabled={!staff} onPress={() => setStaff('')} />
      {team.map(person => <WorkflowButton key={person.id} label={person.name} selected={staff === person.id} disabled={staff === person.id} onPress={() => setStaff(person.id)} />)}
    </View>}
    {pulse ? <>
      <View style={styles.metricGrid}>
        {metrics.map(({ field, label, suffix }) => <View key={field} style={[styles.metricTile, { flexBasis: metricBasis }]}>
          <Text style={[styles.metricLabel, { minHeight: 34 * fontScale }]}>{label}</Text>
          <Text style={styles.metricValue}>{typeof pulse[field] === 'number' ? pulse[field].toLocaleString() : String(pulse[field] ?? '—')}{suffix || ''}</Text>
        </View>)}
      </View>
      {user?.canAllocate && <>
        <View style={styles.row}>
          <Text style={styles.signal}>Follow-up · {pulse.signals.followUp}</Text>
          <Text style={styles.signal}>Conversion · {pulse.signals.conversion}</Text>
        </View>
        {pulse.sites?.length > 1 && <View style={styles.group}>
          <Text style={styles.label}>Dealership comparison</Text>
          {pulse.sites.map(item => <View key={item.name} style={styles.comparisonRow}>
            <Text style={styles.comparisonName}>{item.name}</Text>
            <Text style={styles.comparisonValue}>{item.leads.toLocaleString()} leads · {item.sales.toLocaleString()} sold</Text>
          </View>)}
        </View>}
        {!!pulse.models?.length && <Text style={styles.text}>Model mix · {pulse.models.map(item => `${item.name} (${item.sales})`).join(', ')}</Text>}
        <WorkflowButton label="Share CSV report" disabled={busy} onPress={exportPulse} />
      </>}
      {!!pulse.attention.length && <View style={styles.group}>
        <Text style={styles.label}>Follow-up attention ({pulse.attention.length})</Text>
        {pulse.attention.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" disabled={busy} onPress={() => openLead(item.id)} style={[styles.attentionRow, busy && styles.busy]}>
          <View style={styles.attentionContent}>
            <Text style={styles.attentionName}>{item.name}</Text>
            <Text style={styles.attentionOwner}>{item.owner || 'Unassigned'}</Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>)}
      </View>}
    </> : <Text style={styles.text}>Loading sales summary…</Text>}
    {!!tasks.length && <Text style={styles.label}>Follow-up tasks</Text>}
    {tasks.map(task => <View key={task._id} style={styles.group}>
      <Text style={styles.text}>{task.title} · {task.assignee_name} · {new Date(task.due_at).toLocaleString()}</Text>
      <View style={styles.row}>
        <WorkflowButton label="Open customer" disabled={busy} onPress={() => openLead(task.lead_id)} />
        <WorkflowButton label="Complete" disabled={busy} onPress={() => run(async () => {
          await workflows.completeTask(task._id);
          setTasks(previous => previous.filter(item => item._id !== task._id));
        })} />
      </View>
    </View>)}
    {locations.length > 0 && <View style={styles.group}>
      <Text style={styles.label}>Site presence</Text>
      {!site && <Text style={styles.text}>Select a dealership to check in.</Text>}
      <WorkflowButton label="Check site presence" disabled={busy || !site} onPress={() => run(async () => {
        const response = await workflows.checkIn(site, await currentLocation());
        setNotice(response.data?.on_site ? 'On-site check-in recorded.' : 'Off-site check-in recorded.');
        setPresence((await workflows.presence(selectedRooftop)).data || []);
      })} />
      {presence.map(item => <Text key={item._id} style={styles.text}>{item.name} · {item.dealership} · {item.on_site ? 'On site' : 'Off site'}</Text>)}
    </View>}
    {user?.canAllocate && site && <View style={styles.group}>
      <WorkflowButton label={configOpen ? 'Hide site settings' : 'Configure site metrics and geofence'} disabled={busy} onPress={() => setConfigOpen(!configOpen)} />
      {configOpen && <>
        <WorkflowField label="Follow-up SLA (hours)" value={followUpHours} onChangeText={setFollowUpHours} numeric />
        <WorkflowField label="Conversion target (%)" value={conversionTarget} onChangeText={setConversionTarget} numeric />
        <WorkflowField label="Monthly sales target" value={monthlyTarget} onChangeText={setMonthlyTarget} numeric />
        <WorkflowButton label="Save PULSE targets" disabled={busy} onPress={() => run(async () => {
          await workflows.pulseSettings({ dealership: site, followUpHours: Number(followUpHours), conversionTarget: Number(conversionTarget), monthlyTarget: Number(monthlyTarget) });
          setPulse((await load()).summary.data || null);
          setNotice('PULSE targets saved.');
        })} />
        <WorkflowField label="Geofence radius (metres)" value={radius} onChangeText={setRadius} numeric />
        <WorkflowButton label="Set current location as geofence centre" disabled={busy} onPress={() => run(async () => {
          const { latitude, longitude } = await currentLocation();
          await workflows.saveFence({ dealership: site, latitude, longitude, radius: Number(radius) });
          setNotice('Dealership geofence saved.');
        })} />
      </>}
    </View>}
    {!!notice && <Text style={styles.text}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}

const styles = {
  ...workflowStyles,
  ...StyleSheet.create({
    card: { ...workflowStyles.card, marginVertical: 0, gap: 14 },
    heading: { gap: 4 },
    eyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    metricTile: { flexGrow: 1, minWidth: 0, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: '#edf1f5', borderRadius: 12, padding: 12, gap: 6 },
    metricLabel: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, minHeight: 34 },
    metricValue: { color: colors.textPrimary, fontSize: 23, fontWeight: '800', fontVariant: ['tabular-nums'], flexShrink: 1 },
    signal: { color: colors.textSecondary, backgroundColor: colors.slateLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 12, flexShrink: 1, textTransform: 'capitalize' },
    comparisonRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, paddingVertical: 6 },
    comparisonName: { flexGrow: 1, flexBasis: 150, flexShrink: 1, fontSize: 13, lineHeight: 19, color: colors.textPrimary },
    comparisonValue: { fontSize: 12, lineHeight: 18, color: colors.textSecondary, flexShrink: 1 },
    attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.slateLight, minHeight: 48 },
    attentionContent: { flex: 1, minWidth: 0, gap: 3 },
    attentionName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
    attentionOwner: { fontSize: 12, color: colors.textSecondary },
    busy: { opacity: 0.5 },
  }),
};
