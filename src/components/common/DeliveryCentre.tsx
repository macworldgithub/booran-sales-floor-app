import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useAuth } from '../../context/AuthContext';
import { authorisedImage, fetchApi, leadApi } from '../../services/api';
import { Delivery, workflows } from '../../services/workflows';
import type { Lead } from '../../types';
import { currentLocation } from './PulseCard';
import { Pagination } from './Pagination';
import { WorkflowButton, WorkflowField, workflowStyles as styles } from './WorkflowControls';

export function DeliveryCentre({ onOpenLead, initialOpen = false }: { onOpenLead?: (lead: Lead) => void; initialOpen?: boolean }) {
  const { selectedRooftop, user } = useAuth();
  const [open, setOpen] = useState(initialOpen);
  const [rows, setRows] = useState<Delivery[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('scheduled');
  const [version, reload] = useState(0);
  const [editing, setEditing] = useState('');
  const [contractors, setContractors] = useState<{ id: string; name: string }[]>([]);
  const [contractorId, setContractorId] = useState('');
  const [title, setTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [photo, setPhoto] = useState('');
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [journeyDays, setJourneyDays] = useState('7');
  const [journeyDraft, setJourneyDraft] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    setRows([]);
    workflows.deliveries(selectedRooftop, page, status).then(result => {
      if (!active) return;
      const lastPage = Math.max(1, result.pagination?.totalPages ?? 1);
      if (page > lastPage) setPage(lastPage);
      setRows(result.data || []);
      setTotal(result.pagination?.total ?? 0);
      setPages(lastPage);
    }).catch(reason => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [open, selectedRooftop, page, status, version]);

  useEffect(() => { setPage(1); setEditing(''); setPhoto(''); }, [selectedRooftop]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  const proofPath = (id: string, accessory: string) => `/deliveries/${id}/accessories/${accessory}/proof`;
  const complete = (delivery: Delivery, accessory: string) => run(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow camera access to capture the proof of completion.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.45 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const file = new File(asset.uri);
    if (!file.size || file.size > 2 * 1024 * 1024) throw new Error('The completion photo must be 2 MB or smaller.');
    const point = await currentLocation();
    if (point.accuracy === null) throw new Error('Location accuracy is unavailable. Try again outside.');
    const params = `latitude=${point.latitude}&longitude=${point.longitude}&accuracy=${point.accuracy}`;
    await fetchApi(`${proofPath(delivery._id, accessory)}?${params}`, {
      method: 'PUT', headers: { 'Content-Type': asset.mimeType || 'image/jpeg' }, body: await file.bytes(),
    });
    reload(n => n + 1);
  });

  return <View style={[styles.card, !initialOpen && { marginVertical: 0 }]}>
    <Text style={styles.title}>Delivery Centre</Text>
    {!initialOpen && <WorkflowButton label={open ? 'Hide deliveries' : 'Open delivery bookings'} onPress={() => setOpen(!open)} />}
    {open && <>
      <View style={styles.row}>
        {['scheduled', 'completed'].map(value => <WorkflowButton key={value} label={value === 'scheduled' ? 'Scheduled' : 'Completed'}
          disabled={status === value} onPress={() => { setPage(1); setStatus(value); }} />)}
        <WorkflowButton label="Refresh" disabled={busy} onPress={() => { setError(''); reload(n => n + 1); }} />
      </View>
      {user?.canAllocate && selectedRooftop !== 'All Locations' && <View style={styles.group}>
        <WorkflowButton label={journeyOpen ? 'Hide journey settings' : 'Configure post-delivery follow-up'} disabled={busy} onPress={() => { setNotice(''); setJourneyOpen(!journeyOpen); }} />
        {journeyOpen && <>
          <WorkflowField label="Days after handover" value={journeyDays} onChangeText={setJourneyDays} numeric />
          <WorkflowField label="SMS draft for staff review" value={journeyDraft} onChangeText={setJourneyDraft} />
          <WorkflowButton label="Save follow-up journey" disabled={busy || !journeyDraft.trim()} onPress={() => run(async () => {
            await workflows.deliveryJourney({ dealership: selectedRooftop, days: Number(journeyDays), message: journeyDraft });
            setNotice('Follow-up journey saved for this dealership.');
          })} />
        </>}
      </View>}
      {!rows.length && <Text style={styles.text}>No {status} deliveries in this view.</Text>}
      {rows.map(delivery => <View key={delivery._id} style={styles.group}>
        <Text style={styles.label}>{delivery.customer_name || 'Delivery booking'} · {delivery.dealership}</Text>
        <Text style={styles.text}>{[delivery.vehicle, new Date(delivery.when).toLocaleString(), delivery.status].filter(Boolean).join(' · ')}</Text>
        {delivery.follow_up && <View style={styles.group}>
          <Text style={styles.label}>Follow-up draft due {new Date(delivery.follow_up.dueAt).toLocaleDateString()}</Text>
          <Text selectable style={styles.text}>{delivery.follow_up.draft}</Text>
        </View>}
        {delivery.accessories.some(item => !item.completedAt) && <Text style={styles.error}>Accessory work outstanding</Text>}
        {delivery.accessories.map(item => {
          const path = proofPath(delivery._id, item.id);
          return <View key={item.id} style={styles.group}>
            <Text style={styles.text}>{[item.title, item.contractor_name, item.completedAt ? 'Complete' : 'Pending'].filter(Boolean).join(' · ')}</Text>
            {!item.completedAt && (user?.canAllocate || user?.role === 'contractor') &&
              <WorkflowButton label="Finish with on-site photo" disabled={busy} onPress={() => complete(delivery, item.id)} />}
            {item.completedAt && user?.canAllocate &&
              <WorkflowButton label={photo === path ? 'Hide photo' : 'View completion photo'} onPress={() => setPhoto(photo === path ? '' : path)} />}
            {photo === path && <Image accessibilityLabel="Accessory completion photo" source={authorisedImage(path)} style={{ height: 180, width: '100%' }} resizeMode="contain" />}
          </View>;
        })}
        <View style={styles.row}>
          {delivery.lead_id && onOpenLead && <WorkflowButton label="Open customer" disabled={busy} onPress={() => run(async () => {
            const result = await leadApi.getLead(delivery.lead_id!);
            if (result.data) onOpenLead(result.data);
          })} />}
          {user?.canAllocate && delivery.status === 'scheduled' && <>
            <WorkflowButton label={editing === delivery._id ? 'Close editing' : 'Coordinate booking'} disabled={busy} onPress={() => run(async () => {
              if (editing === delivery._id) { setEditing(''); return; }
              const result = await workflows.contractors(delivery._id);
              setContractors(result.data || []);
              setTitle(''); setContractorId(''); setNewTime(''); setEditing(delivery._id);
            })} />
            <WorkflowButton label="Mark handed over" disabled={busy || delivery.accessories.some(item => !item.completedAt)} onPress={() => run(async () => {
              await workflows.deliveryUpdate(delivery._id, { status: 'completed' });
              reload(n => n + 1);
            })} />
          </>}
        </View>
        {editing === delivery._id && <View style={styles.group}>
          <WorkflowField label="New handover time (ISO with timezone)" value={newTime} onChangeText={setNewTime} />
          <WorkflowButton label="Reschedule" disabled={busy || !newTime} onPress={() => run(async () => {
            await workflows.deliveryUpdate(delivery._id, { when: newTime });
            reload(n => n + 1);
          })} />
          <WorkflowField label="Accessory job" value={title} onChangeText={setTitle} />
          <View style={styles.row}>{contractors.map(person => <WorkflowButton key={person.id} label={person.name} disabled={person.id === contractorId} onPress={() => setContractorId(person.id)} />)}</View>
          {!contractors.length && <Text style={styles.text}>No contractor accounts for this dealership.</Text>}
          <WorkflowButton label="Assign accessory" disabled={busy || !title || !contractorId} onPress={() => run(async () => {
            await workflows.deliveryUpdate(delivery._id, { accessory: { title, contractorId } });
            setTitle('');
            reload(n => n + 1);
          })} />
        </View>}
      </View>)}
      <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={20} onPageChange={setPage} itemName="deliveries" />
    </>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text style={styles.text}>{notice}</Text>}
  </View>;
}
