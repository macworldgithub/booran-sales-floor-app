import React, { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import type { Lead } from '../../types';
import { leadApi } from '../../services/api';
import { oversightApi, melbourneDateTime, type FollowupPolicy, type LossAction } from '../../services/oversight';
import { useAuth } from '../../context/AuthContext';
import { WorkflowButton, WorkflowField, workflowStyles as styles } from '../common/WorkflowControls';

export function LeadProcess({ lead, onUpdated }: { lead: Lead; onUpdated: (lead: Lead) => void }) {
  const { user } = useAuth();
  const [title, setTitle] = useState(''); const [note, setNote] = useState('');
  const [date, setDate] = useState(''); const [time, setTime] = useState('16:00');
  const [reason, setReason] = useState(''); const [managerNotes, setManagerNotes] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [policy, setPolicy] = useState<FollowupPolicy | null>(null);
  const [open, setOpen] = useState(false); const [lossOpen, setLossOpen] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const pending = lead.loss_review?.status === 'pending';
  useEffect(() => {
    let active = true;
    oversightApi.policy(lead._id).then(result => { if (active && result.data) { setPolicy(result.data.afterContact); setDate(value => value || result.data!.today); } })
      .catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [lead._id, lead.last_activity_at, revision]);
  useEffect(() => {
    if (!pending || !user?.canAllocate) return;
    let active = true;
    leadApi.getAssignees(lead._id).then(result => { if (active) setPeople(result.data || []); }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [lead._id, pending, user?.canAllocate]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  const review = (action: LossAction, assigneeId?: string) => run(async () => {
    if (!lead.loss_review) return;
    const result = await oversightApi.reviewLoss(lead._id, { reviewId: lead.loss_review.id, action, notes: managerNotes, assigneeId });
    if (result.data) onUpdated(result.data);
    setManagerNotes(''); setNotice(action === 'call' ? 'Call task created. Loss remains in review.' : 'Manager decision saved to the timeline.');
  });
  const final = ['sold', 'lost'].includes(lead.status);
  return <View style={styles.card}>
    <Text style={styles.title}>Follow-up & lead process</Text>
    {lead.overdue && <Text style={styles.error}>Overdue: this prospect was not touched today.</Text>}
    {lead.next_action && <Text style={styles.text}>Next: {lead.next_action.title} · {new Date(lead.next_action.due_at).toLocaleString('en-AU', { timeZone: 'Australia/Melbourne' })}</Text>}
    {!final && !pending && !!lead.owner_id && <>
      <WorkflowButton label={open ? 'Hide next action' : 'Record follow-up & next action'} disabled={busy} onPress={() => setOpen(!open)} />
      {open && <View style={styles.group}>
        <Text style={styles.text}>Melbourne time. {policy ? policy.maxDate ? `After this contact, latest next action: ${policy.maxDate}.` : 'Early follow-up sequence complete: free scheduling.' : 'Loading follow-up limits…'} One contact day counts per calendar day.</Text>
        <WorkflowField label="Contact / follow-up note (required)" value={note} onChangeText={setNote} />
        <WorkflowField label="Next action (required)" value={title} onChangeText={setTitle} />
        {policy?.maxDays && <View style={styles.row}>{Array.from({ length: policy.maxDays + 1 }, (_, index) => {
          const day = new Date(Date.parse(`${policy.today}T12:00:00Z`) + index * 86400000).toISOString().slice(0, 10);
          return <WorkflowButton key={day} label={index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day} selected={date === day} disabled={busy} onPress={() => setDate(day)} />;
        })}</View>}
        <WorkflowField label="Due date (YYYY-MM-DD, Melbourne)" value={date} onChangeText={setDate} />
        <WorkflowField label="Due time (HH:mm, Melbourne)" value={time} onChangeText={setTime} />
        <WorkflowButton label="Save next action" disabled={busy || !policy || !title.trim() || !note.trim() || Boolean(policy.maxDate && date > policy.maxDate)} onPress={() => run(async () => {
          const result = await oversightApi.nextAction(lead._id, { title: title.trim(), note: note.trim(), dueAt: melbourneDateTime(date, time) });
          if (result.data) onUpdated(result.data);
          setTitle(''); setNote(''); setNotice('Contact recorded and next action saved.'); setRevision(value => value + 1);
        })} />
      </View>}
    </>}
    {lead.loss_review && <View style={styles.group}><Text style={styles.label}>Loss {lead.loss_review.status === 'pending' ? 'awaiting manager approval' : lead.loss_review.status}</Text><Text style={styles.text}>{lead.loss_review.requested_name}: {lead.loss_review.reason}</Text>{!!lead.loss_review.notes && <Text style={styles.text}>{lead.loss_review.reviewed_name}: {lead.loss_review.notes}</Text>}</View>}
    {pending && user?.canAllocate && <View style={styles.group}>
      <WorkflowField label="Manager notes (required except approval)" value={managerNotes} onChangeText={setManagerNotes} />
      <View style={styles.row}>
        <WorkflowButton label="Approve loss" disabled={busy} onPress={() => review('approve')} />
        <WorkflowButton label="Call customer myself" disabled={busy || !managerNotes.trim()} onPress={() => review('call')} />
        {!!lead.phone && <WorkflowButton label={`Call ${lead.phone}`} disabled={busy} onPress={() => run(async () => { await Linking.openURL(`tel:${lead.phone}`); })} />}
        <WorkflowButton label="Return to salesperson" disabled={busy || !managerNotes.trim()} onPress={() => review('return')} />
      </View>
      <Text style={styles.label}>Reassign with notes</Text>
      <View style={styles.row}>{people.map(person => <WorkflowButton key={person.id} label={person.name} disabled={busy || !managerNotes.trim()} onPress={() => review('reassign', person.id)} />)}</View>
    </View>}
    {!final && !pending && <>
      <WorkflowButton label={lossOpen ? 'Cancel loss request' : 'Request lost status'} disabled={busy} onPress={() => setLossOpen(!lossOpen)} />
      {lossOpen && <View style={styles.group}><WorkflowField label="Loss reason (required)" value={reason} onChangeText={setReason} /><WorkflowButton label="Submit for manager approval" disabled={busy || !reason.trim()} onPress={() => run(async () => {
        const result = await oversightApi.requestLoss(lead._id, reason.trim()); if (result.data) onUpdated(result.data); setReason(''); setLossOpen(false); setNotice('Loss sent to manager review.');
      })} /></View>}
    </>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.text}>{notice}</Text>}
    {!!error && <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><WorkflowButton label="Reload follow-up limits" onPress={() => setRevision(value => value + 1)} /></>}
  </View>;
}
