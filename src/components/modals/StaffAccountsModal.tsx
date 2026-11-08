import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { staffAdminApi } from '../../services/api';
import { colors } from '../../theme/theme';
import type { StaffAccess, StaffAccount, StaffDirectory, StaffRole } from '../../types';
import { WorkflowButton } from '../common/WorkflowControls';

const roleLabels: Record<StaffRole, string> = {
  dealer_principal: 'Dealer principal', general_manager: 'General manager', sales_manager: 'Sales manager',
  manager: 'Manager', sales_consultant: 'Sales consultant', contractor: 'Contractor',
};

const emptyAccess: StaffAccess = { role: 'sales_consultant', site: '', allowedSites: [], viewCost: false };

function Choice({ label, selected, multiple = false, disabled, onPress }: {
  label: string; selected: boolean; multiple?: boolean; disabled: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <View style={[styles.indicator, !multiple && styles.radio, selected && styles.indicatorSelected]}>
        {selected && <Text style={styles.check}>✓</Text>}
      </View>
      <Text style={styles.choiceLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function StaffAccountsModal({ onClose }: { onClose: () => void }) {
  const [directory, setDirectory] = useState<StaffDirectory | null>(null);
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<StaffAccount | 'new' | null>(null);
  const [access, setAccess] = useState(emptyAccess);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    staffAdminApi.list(controller.signal).then(result => {
      if (!result.data) throw new Error('The staff directory is unavailable.');
      if (!controller.signal.aborted) setDirectory(result.data);
    }).catch(reason => {
      if (!controller.signal.aborted) setError(reason.message);
    });
    return () => controller.abort();
  }, [revision]);

  function openEditor(account: StaffAccount | 'new') {
    const sites = directory?.sites ?? [];
    setAccess(account === 'new' ? emptyAccess : {
      role: account.role,
      site: sites.find(site => site.toLowerCase() === account.site.toLowerCase()) ?? '',
      allowedSites: sites.filter(site => account.allowedSites.some(allowed => allowed.toLowerCase() === site.toLowerCase())),
      viewCost: account.viewCost,
    });
    setEditor(account);
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setNotice('');
  }

  function back() {
    if (saving) return;
    Keyboard.dismiss();
    if (!editor) return onClose();
    setEditor(null);
    setPassword('');
    setError('');
  }

  function toggleSite(site: string) {
    setAccess(current => {
      const allowedSites = current.allowedSites.includes(site)
        ? current.allowedSites.filter(value => value !== site)
        : [...current.allowedSites, site];
      return { ...current, allowedSites, site: allowedSites.includes(current.site) ? current.site : allowedSites[0] || '' };
    });
  }

  async function save() {
    if (!editor || saving) return;
    setError('');
    if (!access.allowedSites.includes(access.site)) {
      setError('Select dealership access and a home dealership.');
      return;
    }
    if (editor === 'new' && (!name.trim() || !email.trim() || password.length < 12 || !password.trim())) {
      setError('Enter a name, email address, and a password of at least 12 characters.');
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const result = editor === 'new'
        ? await staffAdminApi.create({ ...access, name: name.trim(), email: email.trim(), password })
        : await staffAdminApi.update(editor.id, access);
      const account = result.data;
      if (!account) throw new Error('The server did not return the saved staff account.');
      setDirectory(previous => previous && {
        ...previous,
        accounts: [...previous.accounts.filter(item => item.id !== account.id), account]
          .sort((a, b) => a.name.localeCompare(b.name) || a.email.localeCompare(b.email)),
      });
      setEditor(null);
      setPassword('');
      setNotice(editor === 'new' ? 'Staff account created.' : 'Staff access updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the staff account.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={back}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>Staff accounts</Text>
              <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={back} style={styles.back}>
                <Text style={styles.link}>{editor ? 'Back to accounts' : 'Close'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView key={editor ? 'editor' : 'directory'} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              {!directory && (error ? <>
                <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
                <WorkflowButton label="Retry" onPress={() => { setError(''); setRevision(value => value + 1); }} />
              </> : <ActivityIndicator accessibilityLabel="Loading staff accounts" color={colors.signalRed} />)}

              {directory && !editor && <>
                <Text style={styles.secondary}>Create staff logins or edit roles and dealership access.</Text>
                {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
                <TouchableOpacity accessibilityRole="button" style={styles.primary} onPress={() => openEditor('new')}>
                  <Text style={styles.primaryText}>Create staff account</Text>
                </TouchableOpacity>
                {directory.accounts.map(account => (
                  <TouchableOpacity key={account.id} accessibilityRole="button" onPress={() => openEditor(account)} style={styles.account}>
                    <Text style={styles.label}>{account.name}</Text>
                    <Text style={styles.secondary}>{account.email}</Text>
                    <Text style={styles.secondary}>{roleLabels[account.role]} · {account.site}{account.active ? '' : ' · Inactive'}</Text>
                  </TouchableOpacity>
                ))}
                {!directory.accounts.length && <Text style={styles.secondary}>No staff accounts yet.</Text>}
              </>}

              {directory && editor && <>
                <Text accessibilityRole="header" style={styles.title}>{editor === 'new' ? 'New staff account' : editor.name}</Text>
                {editor === 'new' ? <>
                  <View style={styles.field}>
                    <Text style={styles.label}>Full name</Text>
                    <TextInput accessibilityLabel="Full name" value={name} onChangeText={setName} maxLength={200} autoComplete="name" editable={!saving} style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} maxLength={254} autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!saving} style={styles.input} />
                  </View>
                  <View style={styles.field}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} maxLength={256} autoComplete="new-password" secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!saving} style={styles.input} />
                    <Text style={styles.secondary}>Use at least 12 characters.</Text>
                  </View>
                </> : <Text style={styles.secondary}>{editor.email}</Text>}

                <View style={styles.group}>
                  <Text accessibilityRole="header" style={styles.label}>Role</Text>
                  {directory.roles.map(role => (
                    <Choice key={role} label={roleLabels[role]} selected={role === access.role} disabled={saving} onPress={() => setAccess(current => ({
                      ...current, role, viewCost: role === 'sales_consultant' && current.viewCost,
                    }))} />
                  ))}
                </View>
                <View style={styles.group}>
                  <Text accessibilityRole="header" style={styles.label}>Dealership access</Text>
                  {directory.sites.map(site => (
                    <Choice key={site} label={site} multiple selected={access.allowedSites.includes(site)} disabled={saving} onPress={() => toggleSite(site)} />
                  ))}
                </View>
                <View style={styles.group}>
                  <Text accessibilityRole="header" style={styles.label}>Home dealership</Text>
                  {access.allowedSites.length > 1 ? access.allowedSites.map(site => (
                    <Choice key={site} label={site} selected={site === access.site} disabled={saving} onPress={() => setAccess(current => ({ ...current, site }))} />
                  )) : <Text style={styles.secondary}>{access.site || 'Select a dealership above.'}</Text>}
                </View>
                {access.role === 'sales_consultant' && <View style={styles.switchRow}>
                  <Text style={[styles.label, styles.choiceLabel]}>Allow viewing vehicle costs</Text>
                  <Switch accessibilityLabel="Allow viewing vehicle costs" value={access.viewCost} disabled={saving} onValueChange={viewCost => setAccess(current => ({ ...current, viewCost }))} />
                </View>}
                {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
                <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={save} style={[styles.primary, saving && styles.disabled]}>
                  <Text style={styles.primaryText}>{saving ? 'Saving…' : editor === 'new' ? 'Create account' : 'Save access'}</Text>
                </TouchableOpacity>
              </>}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.appCanvas },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.cardBorder },
  title: { flexShrink: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  link: { color: colors.blue, fontWeight: '700' },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 16, paddingBottom: 28, gap: 12 },
  field: { gap: 4 },
  label: { fontWeight: '700', color: colors.textPrimary },
  secondary: { color: colors.textSecondary },
  input: { minHeight: 44, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 10, color: colors.textPrimary, backgroundColor: colors.card },
  account: { gap: 3, padding: 12, borderWidth: 1, borderRadius: 10, borderColor: colors.cardBorder, backgroundColor: colors.card },
  group: { gap: 6 },
  choice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  choiceSelected: { borderColor: colors.blueBorder, backgroundColor: colors.blueLight },
  indicator: { width: 20, height: 20, borderWidth: 1, borderColor: colors.slate, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  radio: { borderRadius: 10 },
  indicatorSelected: { borderColor: colors.blue, backgroundColor: colors.blue },
  check: { color: colors.textLight, fontWeight: '800', fontSize: 13 },
  choiceLabel: { flex: 1, color: colors.textPrimary },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  primary: { minHeight: 46, justifyContent: 'center', alignItems: 'center', borderRadius: 9, paddingHorizontal: 12, backgroundColor: colors.signalRedDark },
  primaryText: { color: colors.textLight, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  error: { backgroundColor: colors.dangerLight, color: colors.danger, borderRadius: 8, padding: 10 },
  notice: { backgroundColor: colors.emeraldLight, color: colors.emerald, borderRadius: 8, padding: 10 },
});
