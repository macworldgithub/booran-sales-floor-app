import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Server, Check } from 'lucide-react-native';
import { colors } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { PRODUCTION_URL } from '../../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function SettingsModal({ isOpen, onClose, onShowToast }: SettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { apiUrl, updateApiUrl } = useAuth();
  const [draftUrl, setDraftUrl] = useState(apiUrl);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) { setDraftUrl(apiUrl); setError(''); }
  }, [apiUrl, isOpen]);

  if (!isOpen) return null;

  const presets = [{ label: 'Booran backend', url: PRODUCTION_URL }];
  if (__DEV__ && Platform.OS === 'ios') presets.push({ label: 'iOS Simulator', url: 'http://localhost:5001/api' });
  if (__DEV__ && Platform.OS === 'android') presets.push({ label: 'Android Emulator', url: 'http://10.0.2.2:5001/api' });

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await updateApiUrl(draftUrl);
      onShowToast?.('API URL updated');
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the API settings.');
    } finally { setSaving(false); }
  };

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
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <Server size={18} color={colors.textPrimary} />
              <Text style={styles.title}>API & Backend Settings</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close API settings" onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>BACKEND API URL (ENDING IN /api)</Text>
            <TextInput
              style={styles.input}
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder={PRODUCTION_URL}
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={[styles.label, { marginTop: 14 }]}>PRESETS</Text>
            <View style={styles.presetsList}>
              {presets.map((preset) => {
                const isSelected = draftUrl === preset.url;
                return (
                  <TouchableOpacity
                    key={preset.label}
                    onPress={() => setDraftUrl(preset.url)}
                    style={[styles.presetItem, isSelected && styles.presetItemSelected]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.presetLabel}>{preset.label}</Text>
                      <Text style={styles.presetUrl}>{preset.url}</Text>
                    </View>
                    {isSelected && <Check size={16} color={colors.signalRed} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {!!error && <Text accessibilityRole="alert" style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save & Apply Settings'}</Text>
            </TouchableOpacity>
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
    maxHeight: '90%',
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  content: {
    paddingVertical: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#f8fafc',
  },
  presetsList: {
    gap: 8,
  },
  presetItem: {
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  presetItemSelected: {
    borderColor: colors.signalRed,
    backgroundColor: '#fef2f2',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  presetUrl: {
    flexShrink: 1,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: colors.signalRed,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

