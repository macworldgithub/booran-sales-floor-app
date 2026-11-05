import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Pencil, Plus } from 'lucide-react-native';
import { Lead } from '../../types';
import { leadApi } from '../../services/api';
import { colors } from '../../theme/theme';

interface CustomerPhoneEditorProps {
  lead: Lead;
  disabled?: boolean;
  onUpdated: (lead: Lead) => void;
  onEditingChange?: (editing: boolean) => void;
}

export function CustomerPhoneEditor({
  lead,
  disabled = false,
  onUpdated,
  onEditingChange,
}: CustomerPhoneEditorProps) {
  const number = lead.phone || lead.customer_phone || '';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(number);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) setDraft(number);
  }, [number, editing]);

  const handleSave = async () => {
    if (saving || disabled) return;
    setSaving(true);
    setError('');
    try {
      const result = await leadApi.updateLead(lead._id, {
        customer_phone: draft.trim(),
        phone: draft.trim(),
      });
      if (!result.data) throw new Error('The mobile number could not be saved.');
      onUpdated(result.data);
      setEditing(false);
      onEditingChange?.(false);
    } catch (err: any) {
      setError(err?.message || 'The mobile number could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <View style={styles.editContainer}>
        <Text style={styles.label}>Mobile Number</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="0412 345 678"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          autoFocus
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || disabled}
            style={[styles.saveButton, (saving || disabled) && { opacity: 0.6 }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save number</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setDraft(number);
              setError('');
              setEditing(false);
              onEditingChange?.(false);
            }}
            disabled={saving}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.viewContainer}>
      <Text style={styles.metaLabel}>MOBILE</Text>
      <Text style={styles.phoneText}>{number || 'Not provided'}</Text>
      <TouchableOpacity
        disabled={disabled}
        onPress={() => {
          setError('');
          setEditing(true);
          onEditingChange?.(true);
        }}
        style={styles.editTrigger}
      >
        {number ? (
          <Pencil size={12} color={colors.signalRed} />
        ) : (
          <Plus size={12} color={colors.signalRed} />
        )}
        <Text style={styles.editTriggerText}>{number ? 'Edit number' : 'Add number'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  viewContainer: {
    minWidth: 120,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  editTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  editTriggerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.signalRed,
  },
  editContainer: {
    marginTop: 4,
    gap: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  input: {
    height: 38,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: colors.signalRed,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});

