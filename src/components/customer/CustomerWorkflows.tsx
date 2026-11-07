import React, { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Lead } from '../../types';
import { authorisedImage, leadApi } from '../../services/api';
import { uploadMedia } from '../../services/media';
import { Appraisal, Deal, Delivery, PPSR, VehicleInfo, workflows } from '../../services/workflows';
import { useAuth } from '../../context/AuthContext';
import { WorkflowButton, WorkflowField, workflowStyles as styles } from '../common/WorkflowControls';
import { Signature, SignaturePad } from './SignaturePad';

type Panel = 'profile' | 'appraisal' | 'deal' | 'delivery' | 'task';
type Section = { section: string; condition: string; notes: string; photoIds: string[] };
const sides = ['front', 'right', 'rear', 'left', 'interior'];
const blankSections = () => sides.map(section => ({ section, condition: 'unchecked', notes: '', photoIds: [] }));

export function CustomerWorkflows({ lead, onUpdate, onOpenLead, onDrawing }: {
  lead: Lead; onUpdate: (lead: Lead) => void; onOpenLead: (lead: Lead) => void; onDrawing: (drawing: boolean) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('profile');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [related, setRelated] = useState<{ contacts: Lead[]; duplicates: Lead[]; merged: Lead[] }>({ contacts: [], duplicates: [], merged: [] });
  const [name, setName] = useState(lead.name);
  const [email, setEmail] = useState(lead.email || '');
  const [business, setBusiness] = useState(lead.business_name || '');
  const [vehicle, setVehicle] = useState<VehicleInfo>({ rego: lead.tradeIn?.rego, vin: lead.tradeIn?.vin, make: lead.tradeIn?.make, model: lead.tradeIn?.model, year: lead.tradeIn?.year });
  const [regoState, setRegoState] = useState('VIC');
  const [sections, setSections] = useState<Section[]>(blankSections);
  const [side, setSide] = useState(0);
  const [licence, setLicence] = useState('');
  const [internalDrive, setInternalDrive] = useState('');
  const [loanSigner, setLoanSigner] = useState('');
  const [loanTerms, setLoanTerms] = useState('');
  const [signature, setSignature] = useState<Signature>([]);
  const [stockNumber, setStockNumber] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [cost, setCost] = useState('');
  const [appraisalId, setAppraisalId] = useState('');
  const [dealId, setDealId] = useState('');
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [task, setTask] = useState('');
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const run = async (operation: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try { await operation(); } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    const [workflow, matches] = await Promise.all([workflows.customer(lead._id), workflows.related(lead._id)]);
    setAppraisals(workflow.data?.appraisals || []);
    setDeals(workflow.data?.deals || []);
    setDeliveries(workflow.data?.deliveries || []);
    if (matches.data) setRelated(matches.data);
  };
  const openPanel = (value: Panel) => {
    setPanel(value);
    setNotes('');
    setWhen('');
    setNotice('');
    setError('');
    setPhoto('');
  };
  const date = (input: string) => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(input.trim())) {
      throw new Error('Enter an ISO date and time with timezone, for example 2026-12-01T10:00+11:00.');
    }
    return new Date(input.trim()).toISOString();
  };
  const updateSection = (next: Partial<Section>) => setSections(items => items.map((item, index) => index === side ? { ...item, ...next } : item));
  const capture = async (target: 'walkaround' | 'licence') => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow camera access to capture an inspection photo.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.45 });
    if (result.canceled) return;
    const media = await uploadMedia(lead._id, result.assets[0], target === 'licence' ? 'licence' : 'inspection');
    if (target === 'licence') setLicence(media.id);
    else updateSection({ photoIds: [...sections[side].photoIds, media.id] });
  };
  const lookup = () => run(async () => {
    const result = await workflows.lookup(vehicle.rego || '', lead.dealership, regoState);
    if (result.data) setVehicle({ ...result.data, year: result.data.year || undefined });
  });
  const ppsr = (target: { appraisalId?: string; dealId?: string }) => run(async () => {
    const result = await workflows.ppsr(lead._id, target);
    await refresh();
    if (result.data?.status === 'error') setError(result.data.error || 'PPSR could not be completed.');
    else setNotice(`PPSR result: ${result.data?.status}`);
  });
  const ppsrLabel = (value?: PPSR) => value ? `PPSR ${value.status}${value.reference ? ` · ${value.reference}` : ''}` : 'PPSR not checked';
  const contactButton = (contact: Lead) => <WorkflowButton key={contact._id} label={contact.name} onPress={() => onOpenLead(contact)} />;
  const photoButton = (id: string, label: string) => <WorkflowButton key={id} label={photo === id ? 'Hide photo' : label} onPress={() => setPhoto(photo === id ? '' : id)} />;
  const field = (key: 'rego' | 'vin' | 'make' | 'model', label: string) => <WorkflowField label={label} value={vehicle[key] || ''} onChangeText={value => setVehicle(previous => ({ ...previous, [key]: value }))} />;
  const section = sections[side];

  return <View style={styles.card}>
    <Text style={styles.title}>Customer workflows</Text>
    <WorkflowButton label={open ? 'Hide workflows' : 'Open workflows'} disabled={busy} onPress={() => {
      setOpen(!open);
      if (!open) void run(refresh);
    }} />
    {open && <>
      <View style={styles.row}>
        {([['profile', 'Profile'], ['appraisal', 'I-Appraise'], ['deal', 'Deals'], ['delivery', 'Delivery']] as const).map(([id, label]) =>
          <WorkflowButton key={id} label={label} disabled={busy || panel === id} onPress={() => openPanel(id)} />)}
        {user?.canAllocate && <WorkflowButton label="Manager task" disabled={busy || panel === 'task'} onPress={() => openPanel('task')} />}
      </View>
      {panel === 'profile' && <View style={styles.group}>
        <WorkflowField label="Customer name" value={name} onChangeText={setName} />
        <WorkflowField label="Email" value={email} onChangeText={setEmail} />
        <WorkflowField label="Business name (optional)" value={business} onChangeText={setBusiness} />
        <WorkflowButton label="Save profile" disabled={busy} onPress={() => run(async () => {
          const result = await leadApi.updateLead(lead._id, { customer_name: name, customer_email: email, business_name: business });
          if (result.data) onUpdate(result.data);
          await refresh();
          setNotice('Profile saved.');
        })} />
        {!!related.contacts.length && <Text style={styles.label}>Business contacts</Text>}
        {related.contacts.map(contactButton)}
        {!!related.merged.length && <Text style={styles.label}>Merged enquiries</Text>}
        {related.merged.map(contactButton)}
        {user?.canAllocate && related.duplicates.map(duplicate => <WorkflowButton key={duplicate._id} disabled={busy}
          label={`Merge ${duplicate.name} into this profile`} onPress={() => Alert.alert(
            'Merge duplicate prospect?', 'The enquiry and its history stay linked to this profile.',
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Merge', onPress: () => run(async () => { await workflows.merge(lead._id, duplicate._id); await refresh(); }) }],
          )} />)}
      </View>}
      {(panel === 'appraisal' || panel === 'deal') && <View style={styles.group}>
        {field('rego', 'Registration')}
        <WorkflowField label="Registration state" value={regoState} onChangeText={setRegoState} />
        <WorkflowButton label="Look up VIN" disabled={busy || !vehicle.rego} onPress={lookup} />
        {field('vin', 'VIN')}
        {field('make', 'Make')}
        {field('model', 'Model')}
        <WorkflowField label="Year" numeric value={vehicle.year ? String(vehicle.year) : ''} onChangeText={value => setVehicle(previous => ({ ...previous, year: Number(value) || undefined }))} />
        <WorkflowField label={panel === 'appraisal' ? 'Inspection notes' : 'Deal notes'} value={notes} onChangeText={setNotes} />
      </View>}
      {panel === 'appraisal' && <View style={styles.group}>
        <Text style={styles.label}>Walk-around inspection</Text>
        <View style={styles.row}>
          {sides.map((label, index) => <WorkflowButton key={label} label={label} disabled={busy || side === index} onPress={() => setSide(index)} />)}
        </View>
        <Text style={styles.text}>{section.section} · {section.condition} · {section.photoIds.length} photos</Text>
        <View style={styles.row}>
          <WorkflowButton label="Clear" onPress={() => updateSection({ condition: 'clear' })} disabled={busy} />
          <WorkflowButton label="Mark damage" onPress={() => updateSection({ condition: 'damage' })} disabled={busy} />
          <WorkflowButton label="Capture photo" onPress={() => run(() => capture('walkaround'))} disabled={busy || section.photoIds.length >= 2} />
          <WorkflowButton label="Suggest damage from last photo" disabled={busy || !section.photoIds.length} onPress={() => run(async () => {
            const result = await workflows.suggestDamage(lead._id, section.photoIds[section.photoIds.length - 1]);
            if (result.data) {
              updateSection({ condition: result.data.condition, notes: result.data.notes });
              setNotice('Review the AI suggestion and adjust the condition or notes before saving.');
            }
          })} />
        </View>
        <WorkflowField label={`${section.section} condition notes`} value={section.notes} onChangeText={value => updateSection({ notes: value })} />
        <WorkflowButton label={licence ? 'Replace licence photo' : 'Scan licence photo'} onPress={() => run(() => capture('licence'))} disabled={busy} />
        <WorkflowField label="Internal test drive time (optional, ISO with timezone)" value={internalDrive} onChangeText={setInternalDrive} />
        <WorkflowField label="Loan-car signer (optional)" value={loanSigner} onChangeText={setLoanSigner} />
        {!!loanSigner && <>
          <WorkflowField label="Loan-car terms shown to signer" value={loanTerms} onChangeText={setLoanTerms} />
          <SignaturePad onChange={setSignature} onDrawing={onDrawing} />
        </>}
        <WorkflowButton label="Save inspection" disabled={busy || (!vehicle.rego && !vehicle.vin)} onPress={() => run(async () => {
          await workflows.appraisal(lead._id, {
            ...vehicle, notes, walkaround: sections, licencePhotoId: licence || undefined,
            internalDrive: internalDrive ? { when: date(internalDrive) } : undefined,
            loanCar: loanSigner ? { signer: loanSigner, terms: loanTerms, signature } : undefined,
          });
          await refresh();
          setSections(blankSections());
          setLicence(''); setInternalDrive(''); setLoanSigner(''); setLoanTerms(''); setSignature([]);
          setNotice('Inspection saved.');
        })} />
        {appraisals.map(row => <View key={row._id} style={styles.group}>
          <Text style={styles.label}>{[row.rego || row.vin, row.make, row.model].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.text}>{ppsrLabel(row.ppsr)} {row.notes || ''}</Text>
          {row.internalDrive && <Text style={styles.text}>Test drive · {new Date(row.internalDrive.when).toLocaleString()} · {row.internalDrive.driver}</Text>}
          {row.loanCar && <Text style={styles.text}>Loan-car form signed by {row.loanCar.signer}</Text>}
          {row.inspection?.map(item => <View key={item.section}>
            <Text style={styles.text}>{item.section} · {item.condition} {item.notes}</Text>
            {item.photos.map(image => photoButton(image.id, image.name))}
          </View>)}
          {row.licence?.map(image => photoButton(image.id, 'View licence photo'))}
          <WorkflowButton label="Check PPSR" disabled={busy || !row.vin} onPress={() => ppsr({ appraisalId: row._id })} />
        </View>)}
        {!!photo && <Image accessibilityLabel="Private inspection photo" resizeMode="contain" style={{ width: '100%', height: 230 }}
          source={authorisedImage(`/leads/${lead._id}/media/${photo}/content`)} />}
      </View>}
      {panel === 'deal' && <View style={styles.group}>
        <WorkflowField label="Stock number (for inventory vehicles)" value={stockNumber} onChangeText={setStockNumber} />
        <WorkflowField label="Sale price in AUD" value={salePrice} onChangeText={setSalePrice} numeric />
        {user?.viewCost && <WorkflowField label="Cost in AUD" value={cost} onChangeText={setCost} numeric />}
        <Text style={styles.label}>Link appraisal</Text>
        <View style={styles.row}>{appraisals.map(row => <WorkflowButton key={row._id} label={row.rego || row.vin || 'Inspection'} disabled={busy || appraisalId === row._id} onPress={() => setAppraisalId(row._id)} />)}</View>
        <WorkflowButton label="Register deal" disabled={busy} onPress={() => run(async () => {
          await workflows.deal(lead._id, {
            ...vehicle, stockNumber, appraisalId: appraisalId || undefined, notes,
            salePrice: salePrice.trim() ? Number(salePrice) : undefined,
            cost: user?.viewCost && cost.trim() ? Number(cost) : undefined,
          });
          await refresh();
          setStockNumber(''); setAppraisalId(''); setNotes(''); setSalePrice(''); setCost('');
          setNotice('Deal registered.');
        })} />
        {deals.map(row => <View key={row._id} style={styles.group}>
          <Text style={styles.label}>{[row.stockNumber, row.make, row.model, row.status].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.text}>{ppsrLabel(row.ppsr)}</Text>
          {row.sale_price_cents !== undefined && <Text style={styles.text}>Sale price · ${(row.sale_price_cents / 100).toFixed(2)}</Text>}
          {row.gross_cents !== undefined && <Text style={styles.text}>Gross · ${(row.gross_cents / 100).toFixed(2)}</Text>}
          {row.appraisal_ppsr && <Text style={styles.text}>Appraisal · {ppsrLabel(row.appraisal_ppsr)}</Text>}
          {row.export_reference && <Text style={styles.text}>DMS reference · {row.export_reference}</Text>}
          <View style={styles.row}>
            <WorkflowButton label="Check PPSR" disabled={busy || !row.vin} onPress={() => ppsr({ dealId: row._id })} />
            {user?.canAllocate && row.status !== 'cancelled' && !row.export_reference && <WorkflowButton label="Submit to DMS" disabled={busy} onPress={() => run(async () => {
              await workflows.exportDeal(row._id);
              await refresh();
              setNotice('Deal accepted by the DMS.');
            })} />}
            {user?.canAllocate && row.status === 'registered' && ['completed', 'cancelled'].map(status =>
              <WorkflowButton key={status} label={status === 'completed' ? 'Complete deal' : 'Cancel deal'} disabled={busy} onPress={() => run(async () => {
                await workflows.dealStatus(row._id, status);
                await refresh();
                const result = await leadApi.getLead(lead._id);
                if (result.data) onUpdate(result.data);
              })} />)}
          </View>
        </View>)}
      </View>}
      {panel === 'delivery' && <View style={styles.group}>
        <Text style={styles.label}>Select a completed deal</Text>
        {deals.filter(row => row.status === 'completed').map(row =>
          <WorkflowButton key={row._id} label={[row.stockNumber, row.make, row.model].filter(Boolean).join(' ') || 'Completed deal'} disabled={busy || dealId === row._id} onPress={() => setDealId(row._id)} />)}
        <WorkflowField label="Delivery time (ISO with timezone)" value={when} onChangeText={setWhen} />
        <WorkflowField label="Delivery notes" value={notes} onChangeText={setNotes} />
        <WorkflowButton label="Book delivery" disabled={busy || !dealId || !when} onPress={() => run(async () => {
          await workflows.bookDelivery(lead._id, dealId, date(when), notes);
          await refresh();
          setNotice('Delivery booked.');
        })} />
        {deliveries.map(row => <Text key={row._id} style={styles.text}>{new Date(row.when).toLocaleString()} · {row.status} · {row.accessories.filter(item => !item.completedAt).length} open accessories</Text>)}
      </View>}
      {panel === 'task' && <View style={styles.group}>
        <Text style={styles.text}>Assigned to {lead.owner_name || 'Unassigned'}</Text>
        <WorkflowField label="Task title" value={task} onChangeText={setTask} />
        <WorkflowField label="Task notes" value={notes} onChangeText={setNotes} />
        <WorkflowField label="Due time (ISO with timezone)" value={when} onChangeText={setWhen} />
        <WorkflowButton label="Assign follow-up task" disabled={busy || !lead.owner_id || !task || !when} onPress={() => run(async () => {
          await workflows.task(lead._id, { title: task, notes, dueAt: date(when) });
          setTask(''); setWhen(''); setNotes(''); setNotice('Task assigned.');
        })} />
      </View>}
      {busy && <Text style={styles.text}>Working…</Text>}
      {!!notice && <Text style={styles.text}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </>}
  </View>;
}
