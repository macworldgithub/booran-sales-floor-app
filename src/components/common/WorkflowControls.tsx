import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/theme';

export function WorkflowButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.button, disabled && styles.disabled]}>
    <Text style={styles.buttonText}>{label}</Text>
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
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, padding: 14, gap: 8, marginVertical: 8 },
  group: { gap: 8, borderTopWidth: 1, borderColor: colors.cardBorder, paddingTop: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { fontWeight: '800', color: colors.textPrimary, fontSize: 16 },
  label: { fontWeight: '700', color: colors.textPrimary },
  text: { color: colors.textSecondary },
  error: { color: colors.danger, paddingVertical: 4 },
});

const styles = StyleSheet.create({
  button: { borderRadius: 8, backgroundColor: '#eaf0f7', paddingVertical: 8, paddingHorizontal: 10, alignSelf: 'flex-start' },
  buttonText: { fontWeight: '700', color: '#17437a' },
  disabled: { opacity: 0.5 },
  field: { gap: 4 },
  label: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
  input: { borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, padding: 9, color: colors.textPrimary, backgroundColor: '#fff' },
});
