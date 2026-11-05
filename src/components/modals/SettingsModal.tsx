import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Server, Check } from 'lucide-react-native';
import { colors } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function SettingsModal({ isOpen, onClose, onShowToast }: SettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { apiUrl, updateApiUrl } = useAuth();
  const [draftUrl, setDraftUrl] = useState(apiUrl);

  if (!isOpen) return null;

  const presets = [
    { label: 'iOS Simulator', url: 'http://localhost:5001/api' },
    { label: 'Android Emulator', url: 'http://10.0.2.2:5001/api' },
    { label: 'Production Vercel', url: 'https://booran-sales-floor-backend.vercel.app/api' },
  ];

  const handleSave = async () => {
    if (!draftUrl.trim()) return;
    await updateApiUrl(draftUrl.trim());
    onShowToast?.('API URL updated');
    onClose();
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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>BACKEND API URL (ENDING IN /api)</Text>
            <TextInput
              style={styles.input}
              value={draftUrl}
              onChangeText={setDraftUrl}
              placeholder="http://localhost:5001/api"
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
                    <View>
                      <Text style={styles.presetLabel}>{preset.label}</Text>
                      <Text style={styles.presetUrl}>{preset.url}</Text>
                    </View>
                    {isSelected && <Check size={16} color={colors.signalRed} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save & Apply Settings</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
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

