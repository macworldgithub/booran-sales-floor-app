import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Lead } from '../../types';
import { leadApi } from '../../services/api';
import { colors } from '../../theme/theme';

type Assignee = { id: string; name: string; email: string };

export function LeadAssignment({ lead, onUpdated, quick = false }: { lead: Lead; onUpdated: (lead: Lead) => void; quick?: boolean }) {
  const [open, setOpen] = useState(quick);
  const [assignees, setAssignees] = useState<Assignee[] | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let active = true;
    leadApi.getAssignees(lead._id).then(result => {
      if (active) setAssignees(result.data || []);
    }).catch(reason => {
      if (active) setError(reason.message);
    });
    return () => { active = false; };
  }, [open, lead._id]);

  const assign = async (id: string | null) => {
    setSaving(true);
    setError('');
    try {
      const result = await leadApi.assign(lead._id, id, lead.owner_id ?? null);
      if (result.data) onUpdated(result.data);
      setOpen(false);
    } catch (reason) {
      const failure = reason as Error & { status?: number };
      setError(failure.message);
      if (failure.status === 409) {
        const result = await leadApi.getLead(lead._id).catch(() => null);
        if (result?.data) onUpdated(result.data);
      }
    } finally {
      setSaving(false);
    }
  };

  const term = search.trim().toLowerCase();
  const matches = assignees?.filter(person => `${person.name} ${person.email}`.toLowerCase().includes(term)) ?? [];

  return (
    <View style={styles.section}>
      {!quick && <TouchableOpacity disabled={saving} onPress={() => { setOpen(!open); setError(''); }} accessibilityRole="button">
        <Text style={styles.link}>{open ? 'Close allocation' : 'Allocate lead'}</Text>
      </TouchableOpacity>}
      {open && <>
        <TextInput value={search} onChangeText={setSearch} placeholder="Find staff by name or email" style={styles.input} autoCapitalize="none" />
        {lead.owner_id || lead.owner_name !== 'Unassigned' ? (
          <TouchableOpacity disabled={saving} onPress={() => assign(null)}><Text style={styles.option}>Return to unassigned queue</Text></TouchableOpacity>
        ) : null}
        {matches.slice(0, 12).map(person => (
          <TouchableOpacity key={person.id} accessibilityRole="button" accessibilityLabel={`Assign to ${person.name}`} disabled={saving || lead.owner_id === person.id} onPress={() => assign(person.id)}>
            <Text style={styles.option}>{person.name} · {person.email}{lead.owner_id === person.id ? ' (assigned)' : ''}</Text>
          </TouchableOpacity>
        ))}
        {matches.length > 12 && <Text>Enter a name or email to narrow the list.</Text>}
        {assignees && !matches.length && <Text>No matching staff accounts for this dealership.</Text>}
        {(saving || (!assignees && !error)) && <ActivityIndicator />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 12, gap: 8 },
  link: { color: colors.blue, fontWeight: '700', paddingVertical: 8 },
  input: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, padding: 10 },
  option: { paddingVertical: 10, color: colors.textPrimary },
  error: { color: colors.danger },
});
