import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Calendar, Clock, Car, User, AlertCircle, Building } from 'lucide-react-native';
import { Lead, Appointment } from '../../types';
import { appointmentApi } from '../../services/api';
import { colors, shadows } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface BookTestDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  defaultDealership?: string;
  onAppointmentCreated?: (appointment: Appointment) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function BookTestDriveModal({
  isOpen,
  onClose,
  lead,
  defaultDealership,
  onAppointmentCreated,
  onShowToast,
}: BookTestDriveModalProps) {
  const insets = useSafeAreaInsets();
  const { user, locations, selectedRooftop } = useAuth();

  const [prospectName, setProspectName] = useState(
    lead?.name || lead?.customer_name || ''
  );
  const [vehicle, setVehicle] = useState(
    lead?.vehicle || `${lead?.make || ''} ${lead?.model || ''}`.trim() || ''
  );
  const [consultant, setConsultant] = useState(
    lead?.owner_name || lead?.assignedTo || user?.name || ''
  );
  const [dealership, setDealership] = useState(
    lead?.dealership ||
      (defaultDealership && defaultDealership !== 'All Locations'
        ? defaultDealership
        : selectedRooftop !== 'All Locations'
        ? selectedRooftop
        : locations[0] || 'BYD South Morang')
  );

  const [appointmentType, setAppointmentType] = useState<Appointment['type']>('Test Drive');
  const [appointmentDate, setAppointmentDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [duration, setDuration] = useState('45');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const typeOptions: Appointment['type'][] = [
    'Test Drive',
    'Showroom Visit',
    'Delivery Handover',
    'Callback',
  ];

  const handleSubmit = async () => {
    if (!prospectName.trim()) {
      setError('Please provide customer / prospect name.');
      return;
    }
    if (!dealership) {
      setError('Please select an authorised dealership.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const scheduledDateTime = `${appointmentDate}T${appointmentTime}:00`;
      const res = await appointmentApi.createAppointment({
        leadId: lead?._id,
        prospectName: prospectName.trim(),
        consultantName: consultant.trim(),
        vehicle: vehicle.trim(),
        dealership,
        type: appointmentType,
        when: new Date(scheduledDateTime).toISOString(),
        duration: Number(duration) || 45,
        notes: notes.trim(),
        status: 'Booked',
      });

      if (res.success && res.data) {
        onAppointmentCreated?.(res.data);
        onShowToast?.(`Appointment confirmed for ${prospectName.trim()}`);
        onClose();
      } else {
        throw new Error(res.error || 'Failed to book appointment.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to book appointment.');
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.title}>Book Floor Appointment</Text>
              <Text style={styles.subtitle}>Test Drive & Showroom Scheduler</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorAlert}>
              <AlertCircle size={14} color={colors.danger} />
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Appointment Type Picker */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>APPOINTMENT TYPE</Text>
              <View style={styles.typeOptionsRow}>
                {typeOptions.map((type) => {
                  const isSelected = appointmentType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setAppointmentType(type)}
                      style={[
                        styles.typePill,
                        isSelected && styles.typePillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          isSelected && styles.typePillTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Prospect Name */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>PROSPECT / CUSTOMER NAME *</Text>
              <TextInput
                style={styles.textInput}
                value={prospectName}
                onChangeText={setProspectName}
                placeholder="e.g. Michael Campbell"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Vehicle of Interest */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>VEHICLE MODEL / SPEC</Text>
              <TextInput
                style={styles.textInput}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder="e.g. 2024 BYD Seal Premium"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Dealership */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>DEALERSHIP LOCATION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={styles.dealershipPills}>
                  {locations.map((loc) => {
                    const isSelected = dealership === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        onPress={() => setDealership(loc)}
                        style={[
                          styles.dealershipPill,
                          isSelected && styles.dealershipPillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dealershipPillText,
                            isSelected && styles.dealershipPillTextSelected,
                          ]}
                        >
                          {loc}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Consultant */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>SALES CONSULTANT</Text>
              <TextInput
                style={styles.textInput}
                value={consultant}
                onChangeText={setConsultant}
                placeholder="e.g. Sarah Jenkins"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Date & Time */}
            <View style={styles.rowFields}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>DATE (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  value={appointmentDate}
                  onChangeText={setAppointmentDate}
                  placeholder="2026-11-05"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>TIME (24H)</Text>
                <TextInput
                  style={styles.textInput}
                  value={appointmentTime}
                  onChangeText={setAppointmentTime}
                  placeholder="10:00"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>NOTES & PREPARATION</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special requests, trade-in ready, VIP prospect..."
                placeholderTextColor="#94a3b8"
                multiline
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Appointment</Text>
              )}
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  errorAlertText: {
    color: colors.danger,
    fontSize: 12,
  },
  formScroll: {
    paddingVertical: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#f8fafc',
  },
  typeOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  typePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  typePillSelected: {
    backgroundColor: colors.signalRed,
    borderColor: colors.signalRed,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dealershipPills: {
    flexDirection: 'row',
    gap: 6,
  },
  dealershipPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  dealershipPillSelected: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphite,
  },
  dealershipPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dealershipPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    backgroundColor: colors.signalRed,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    ...shadows.sm,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

