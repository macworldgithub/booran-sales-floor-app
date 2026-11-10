import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { leadApi } from '../../services/api';
import { workflows } from '../../services/workflows';
import { oversightApi, type DailyOversight as DailyData, type IntakeSource } from '../../services/oversight';
import type { Lead } from '../../types';
import { WorkflowButton, WorkflowField, workflowStyles } from './WorkflowControls';
import { LeadAssignment } from '../customer/LeadAssignment';
import { LeadProcess } from '../customer/LeadProcess';
import { colors } from '../../theme/theme';

const when = (date: string) => new Date(date).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'short', timeStyle: 'short' });
function Signal({ value, label }: { value: string; label: string }) {
  return <View style={styles.signal}><View accessibilityElementsHidden style={[styles.dot, { backgroundColor: value === 'green' ? colors.emerald : colors.danger }]} /><Text style={styles.text} accessibilityLabel={`${value === 'green' ? 'Complete' : 'Needs attention'}: ${label}`}>{label}</Text></View>;
}
export function DailyOversight({ onOpenLead, refreshKey = false }: { onOpenLead: (lead: Lead) => void; refreshKey?: boolean }) {
  const { selectedRooftop, user } = useAuth();
  const manager = Boolean(user?.canAllocate);
  const [stored, setStored] = useState<{ site: string; data: DailyData } | null>(null);
  const data = stored?.site === selectedRooftop ? stored.data : null;
  const [revision, setRevision] = useState(0); const [expanded, setExpanded] = useState(manager ? '' : user?.id || '');
  const [queueOpen, setQueueOpen] = useState(false); const [lossesOpen, setLossesOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false); const [queuePage, setQueuePage] = useState(0);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true, pending = false;
    const controller = new AbortController();
    const load = async () => {
      if (pending) return;
      pending = true;
      try { const result = await oversightApi.daily(selectedRooftop, controller.signal); if (active && result.data) { setStored({ site: selectedRooftop, data: result.data }); setError(''); } }
      catch (reason) { if (active) setError((reason as Error).message); }
      finally { pending = false; }
    };
    void load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 20000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { active = false; controller.abort(); clearInterval(timer); subscription.remove(); };
  }, [selectedRooftop, revision, refreshKey]);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); refresh(); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  const open = (id: string) => run(async () => { const result = await leadApi.getLead(id); if (result.data) onOpenLead(result.data); });
  const pages = Math.max(1, Math.ceil((data?.unassigned.length || 0) / 5)); const page = Math.min(queuePage, pages - 1);
  return <View style={styles.card}>
    <Text style={styles.title}>{manager ? 'Daily manager overview' : 'My daily overview'}</Text>
    <Text style={styles.text}>{data?.date} · Melbourne time · Updates every 20 seconds{data ? ` · ${when(data.refreshedAt)}` : ''}</Text>
    <WorkflowButton label="Refresh daily overview" onPress={refresh} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}{data ? ' · Showing the last successful update.' : ''}</Text>}
    {!data && !error && <Text style={styles.text}>Loading daily activity…</Text>}
    {data && <>
      <View style={styles.metrics}>{[[`${data.summary.tasksCompleted}/${data.summary.tasksTotal}`, 'Tasks complete'], [data.summary.tasksRemaining, 'Tasks remaining'], [data.summary.overdueTasks, 'Overdue tasks'], [data.summary.overdueProspects, 'Untouched prospects'], [data.summary.mtdSales, 'MTD sales'], [data.summary.carryOvers, 'Prior-day carry-overs']].map(([value, label]) => <View style={styles.metric} key={label}><Text style={styles.value}>{value}</Text><Text style={styles.text}>{label}</Text></View>)}</View>
      <Text style={[styles.banner, { backgroundColor: data.summary.allGreen ? '#ecfdf5' : '#fef2f2', color: data.summary.allGreen ? '#047857' : '#b91c1c' }]} accessibilityLiveRegion="polite">{data.summary.allGreen ? 'All green — zero outstanding daily actions.' : `${data.summary.unactioned} unactioned leads · ${data.summary.videosRemaining} videos remaining · ${data.summary.tasksRemaining} tasks remaining · ${data.summary.pendingLosses} loss reviews · ${data.summary.unassigned} unassigned`}</Text>
      {!data.members.length && <Text style={styles.text}>No salespeople or activity in this dealership scope.</Text>}
      {data.members.map(person => <View key={person.id} style={styles.group}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: expanded === person.id }} onPress={() => setExpanded(expanded === person.id ? '' : person.id)} style={styles.person}><Text style={styles.name}>{person.name}</Text><Text style={styles.text}>{person.allGreen ? 'All green' : 'Needs attention'} · {person.mtdSales} MTD sales · {expanded === person.id ? 'Hide detail' : 'View day'}</Text></TouchableOpacity>
        <View style={styles.signals}>
          <Signal value={person.signals.activity} label={`${person.logged} CRM logs / updates`} />
          <Signal value={person.signals.videos} label={`${person.videosDone}/${person.expected} videos · ${person.videoSent} sent`} />
          <Signal value={person.signals.nextActions} label={`${person.nextActions} next actions · ${person.unactioned} red`} />
          <Signal value={person.signals.tasks} label={`${person.tasksCompleted}/${person.tasksTotal} tasks done · ${person.tasksRemaining} remaining`} />
        </View><Text style={styles.text}>{person.overdueTasks} overdue tasks · {person.overdueProspects} overdue prospects</Text>
        {expanded === person.id && <View style={styles.group}>
          <Text style={styles.label}>Customers, videos & notes · {data.date}</Text>
          {!person.leads.length && <Text style={styles.text}>No customers logged or requiring action today.</Text>}
          {person.leads.map(lead => <View key={lead._id} style={styles.customer}>
            <WorkflowButton label={lead.name} disabled={busy} onPress={() => open(lead._id)} />
            <Text style={styles.text}>{lead.kind === 'walk_in' ? 'Walk-in' : 'Internet / external'} · {lead.source} · {lead.status.replaceAll('_', ' ')}</Text>
            <Signal value={lead.actioned ? 'green' : 'red'} label={lead.actioned ? 'Action recorded' : 'Needs video sent or next action'} />
            {lead.overdue && <Text style={styles.error}>Untouched / overdue</Text>}
            <Text style={styles.text}>{lead.next_action ? `${lead.next_action.title} · ${when(lead.next_action.due_at)}` : 'No next action set'}</Text>
            {lead.videos.map(video => <Text key={video.id} style={styles.text}>{video.name} · {video.status && video.status !== 'ready' ? 'Adding end card…' : `${video.views} views · ${video.reviews} reviews`}</Text>)}
            {lead.diary_entries?.slice(-2).map((entry, index) => <Text key={index} style={styles.text}>{entry.author}: {entry.note}</Text>)}
          </View>)}
          <Text style={styles.label}>Today’s tasks & carry-overs</Text>{!person.tasks.length && <Text style={styles.text}>No tasks due today.</Text>}
          {person.tasks.map(task => <View key={task._id} style={styles.customer}><Text style={styles.label}>{task.title} · {task.status}{task.overdue ? ' · Overdue' : ''}</Text><Text style={styles.text}>{when(task.due_at)}{task.notes ? ` · ${task.notes}` : ''}</Text><View style={styles.row}><WorkflowButton label="Open customer" disabled={busy} onPress={() => open(task.lead_id)} />{task.status === 'open' && <WorkflowButton label="Mark done" disabled={busy} onPress={() => run(async () => { await workflows.completeTask(task._id); })} />}</View></View>)}
        </View>}
      </View>)}
      <Text style={styles.text}>Soft North Star: approximately 20 new + used sales per person per month. No enforced target. Untouched prospects and unfinished tasks carry forward automatically.</Text>
      {manager && <View style={styles.group}>
        <WorkflowButton label={`Unassigned / new leads (${data.unassigned.length})${queueOpen ? ' · Hide' : ''}`} onPress={() => setQueueOpen(!queueOpen)} />
        {queueOpen && <>{!data.unassigned.length && <Text style={styles.text}>No leads awaiting allocation.</Text>}{data.unassigned.slice(page * 5, page * 5 + 5).map(lead => <View style={styles.customer} key={lead._id}><WorkflowButton label={lead.name} onPress={() => onOpenLead(lead)} /><Text style={styles.text}>{lead.source} · {lead.dealership}</Text><Signal value="red" label={lead.overdue ? 'Overdue · awaiting allocation' : 'Awaiting allocation'} />{lead.quick_walk_in && <Text style={styles.text}>{lead.diary_entries?.[0]?.note}</Text>}<LeadAssignment lead={lead} onUpdated={refresh} quick /></View>)}{pages > 1 && <View style={styles.row}><WorkflowButton label="Previous leads" disabled={page === 0} onPress={() => setQueuePage(page - 1)} /><Text>{page + 1}/{pages}</Text><WorkflowButton label="Next leads" disabled={page + 1 === pages} onPress={() => setQueuePage(page + 1)} /></View>}</>}
        <WorkflowButton label={`Lost-lead review (${data.losses.length} pending · ${data.summary.lossesApprovedToday} approved today)${lossesOpen ? ' · Hide' : ''}`} onPress={() => setLossesOpen(!lossesOpen)} />
        {lossesOpen && <>{!data.losses.length && <Text style={styles.text}>No losses awaiting approval.</Text>}{data.losses.map(lead => <View style={styles.customer} key={lead._id}><WorkflowButton label={`${lead.name} · ${lead.owner_name}`} onPress={() => onOpenLead(lead)} /><LeadProcess lead={lead} onUpdated={refresh} /></View>)}</>}
        <LeadIntake key={selectedRooftop} onImported={lead => { refresh(); onOpenLead(lead); }} />
      </View>}
      <WorkflowButton disabled={!data.report.available} label={`Daily summary${data.report.available ? ' · 6:30 pm report available' : ' · from 6:30 pm'}${reportOpen ? ' · Hide' : ''}`} onPress={() => setReportOpen(!reportOpen)} />
      {data.report.available && reportOpen && <View style={styles.group}><Text style={styles.label}>{data.date} · In-app report · Melbourne time</Text><Text style={styles.text}>{data.summary.tasksCompleted} of {data.summary.tasksTotal} tasks complete; {data.summary.tasksRemaining} outstanding; {data.summary.carryOvers} prior-day carry-overs; {data.summary.overdueProspects} untouched prospects; {data.summary.pendingLosses} loss reviews. Team sales this month: {data.summary.mtdSales}.</Text>{data.members.map(person => <Text key={person.id} style={styles.text}>{person.name}: {person.allGreen ? 'all green' : 'attention needed'} · {person.tasksRemaining} tasks remaining · {person.overdueProspects} overdue prospects · {person.mtdSales} MTD sales</Text>)}</View>}
    </>}
  </View>;
}
function LeadIntake({ onImported }: { onImported: (lead: Lead) => void }) {
  const { selectedRooftop, locations } = useAuth();
  const [open, setOpen] = useState(false); const [source, setSource] = useState<IntakeSource>('connex');
  const [form, setForm] = useState({ externalId: '', dealership: selectedRooftop === 'All Locations' ? '' : selectedRooftop, name: '', phone: '', email: '', vehicle: '', opportunityStatus: '', notes: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <View style={styles.group}><WorkflowButton label={open ? 'Hide external lead intake' : 'Connex / external lead intake'} onPress={() => setOpen(!open)} />{open && <>
    <Text style={styles.text}>Connex: log in, open lead, assign and change opportunity status to reveal contact details. Add available details now and reuse the same reference once the phone is revealed. Automation requires the Connex recording, credentials and provider access.</Text>
    <View style={styles.row}>{([['connex', 'Connex'], ['drive', 'Drive'], ['socket', 'Socket'], ['website', 'Website'], ['sms', 'SMS campaign']] as const).map(([id, label]) => <WorkflowButton key={id} label={label} selected={source === id} onPress={() => setSource(id)} />)}</View>
    <Text style={styles.label}>Dealership</Text><View style={styles.row}>{locations.filter(site => site.toLowerCase() !== 'south morang').map(site => <WorkflowButton key={site} label={site} selected={form.dealership === site} onPress={() => setForm({ ...form, dealership: site })} />)}</View>
    {([['externalId', 'Source lead reference (required)'], ['name', 'Customer name (if known)'], ['phone', 'Phone (once revealed)'], ['email', 'Email'], ['vehicle', 'Vehicle interest'], ['opportunityStatus', 'Opportunity status'], ['notes', 'Source notes']] as const).map(([key, label]) => <WorkflowField key={key} label={label} value={form[key]} onChangeText={value => setForm({ ...form, [key]: value })} />)}
    <WorkflowButton label={busy ? 'Saving…' : 'Create / update unassigned lead'} disabled={busy || !form.externalId.trim() || !form.dealership} onPress={async () => { setBusy(true); setError(''); try { const result = await oversightApi.intake(source, form); if (result.data) onImported(result.data); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } }} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </>}</View>;
}
const styles = { ...workflowStyles, ...StyleSheet.create({
  card: { ...workflowStyles.card, marginVertical: 0 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1, minWidth: 0 },
  signals: { gap: 5 }, dot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { flexGrow: 1, flexBasis: '44%', minWidth: 0, padding: 10, borderRadius: 10, backgroundColor: colors.cardAlt },
  value: { color: colors.textPrimary, fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  banner: { padding: 10, borderRadius: 10, fontSize: 12, lineHeight: 19, fontWeight: '700' },
  person: { paddingVertical: 8, minHeight: 44, gap: 3 }, name: { color: '#17437a', fontSize: 15, fontWeight: '800', textDecorationLine: 'underline' },
  customer: { gap: 7, padding: 12, backgroundColor: colors.cardAlt, borderRadius: 10 },
}) };
