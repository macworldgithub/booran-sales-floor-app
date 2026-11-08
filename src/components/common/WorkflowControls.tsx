import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/theme';

export function WorkflowButton({ label, onPress, disabled, selected }: { label: string; onPress: () => void; disabled?: boolean; selected?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled, selected }} onPress={onPress} disabled={disabled} style={[styles.button, selected && styles.selected, disabled && !selected && styles.disabled]}>
    <Text style={[styles.buttonText, selected && styles.selectedText]}>{label}</Text>
  </TouchableOpacity>;
}

export function WorkflowField({ label, value, onChangeText, numeric = false }: {
  label: string; value: string; onChangeText: (text: string) => void; numeric?: boolean;
}) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'decimal-pad' : 'default'}
      autoCapitalize="none" style={styles.input} />
  </View>;
}

export const workflowStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 16, gap: 12, marginVertical: 8, minWidth: 0, maxWidth: '100%' },
  group: { gap: 10, borderTopWidth: 1, borderColor: colors.cardBorder, paddingTop: 14, minWidth: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, minWidth: 0 },
  title: { fontWeight: '800', color: colors.textPrimary, fontSize: 17, flexShrink: 1 },
  label: { fontWeight: '700', color: colors.textPrimary, fontSize: 13, flexShrink: 1 },
  text: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20, paddingVertical: 4, flexShrink: 1 },
});

const styles = StyleSheet.create({
  button: { borderRadius: 10, backgroundColor: '#eaf0f7', paddingVertical: 10, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start', maxWidth: '100%', flexShrink: 1 },
  buttonText: { fontWeight: '700', fontSize: 13, lineHeight: 18, color: '#17437a', flexShrink: 1 },
  selected: { backgroundColor: colors.graphite },
  selectedText: { color: '#fff' },
  disabled: { opacity: 0.5 },
  field: { gap: 6, minWidth: 0, maxWidth: '100%' },
  label: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  input: { borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, padding: 11, minHeight: 44, fontSize: 14, color: colors.textPrimary, backgroundColor: '#fff', minWidth: 0 },
});
