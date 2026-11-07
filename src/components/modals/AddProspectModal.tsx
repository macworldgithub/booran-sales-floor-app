import React, { useState, useEffect } from 'react';
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
import { X, User, Phone, Mail, Car, AlertCircle, Plus } from 'lucide-react-native';
import { Lead } from '../../types';
import { leadApi } from '../../services/api';
import { workflows } from '../../services/workflows';
import { WorkflowButton, WorkflowField } from '../common/WorkflowControls';
import { colors, shadows } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface AddProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDealership?: string;
  onLeadCreated?: (newLead: Lead) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function AddProspectModal({
  isOpen,
  onClose,
  defaultDealership,
  onLeadCreated,
  onShowToast,
}: AddProspectModalProps) {
  const insets = useSafeAreaInsets();
  const { user, locations, selectedRooftop } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [dealership, setDealership] = useState(
    defaultDealership && defaultDealership !== 'All Locations'
      ? defaultDealership
      : selectedRooftop !== 'All Locations'
      ? selectedRooftop
      : locations[0] || ''
  );
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [source, setSource] = useState('Floor Walk-in');
  const [notes, setNotes] = useState('');

  // Trade-in
  const [hasTradeIn, setHasTradeIn] = useState(false);
  const [tradeMake, setTradeMake] = useState('');
  const [tradeModel, setTradeModel] = useState('');
  const [tradeYear, setTradeYear] = useState('');
  const [tradeRego, setTradeRego] = useState('');
  const [tradeVin, setTradeVin] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const preferred = defaultDealership || selectedRooftop;
      setDealership(locations.includes(preferred) ? preferred : locations[0] || '');
    }
  }, [isOpen, selectedRooftop, defaultDealership, locations]);

  if (!isOpen) return null;

  const sourceOptions = [
    'Floor Walk-in',
    'Phone Inquiry',
    'Carsales',
    'Autotrader',
    'Website Lead',
    'Referral',
  ];

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim()) {
      setError('Provide the customer’s full name, mobile and email.');
      return;
    }
    if (!dealership) {
      setError('Please select an authorised dealership.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const vehicleDesc = `${vehicleMake} ${vehicleModel}`.trim();
      const payload: Partial<Lead> = {
        name: name.trim(),
        customer_name: name.trim(),
        phone: phone.trim(),
        customer_phone: phone.trim(),
        email: email.trim().toLowerCase(),
        customer_email: email.trim().toLowerCase(),
        business_name: businessName.trim(),
        dealership,
        vehicle: vehicleDesc || 'General Inquiry',
        make: vehicleMake.trim(),
        model: vehicleModel.trim(),
        source,
        owner_name: user?.name,
        assignedTo: user?.name,
        notes: notes.trim(),
        status: 'new_lead',
        priority: true,
      };

      if (hasTradeIn && (tradeMake.trim() || tradeRego.trim() || tradeVin.trim())) {
        payload.tradeIn = {
          make: tradeMake.trim(),
          model: tradeModel.trim(),
          year: Number(tradeYear) || undefined,
          rego: tradeRego.trim().toUpperCase(),
          vin: tradeVin.trim().toUpperCase(),
        };
      }

      const res = await leadApi.createLead(payload);
      if (res.success && res.data) {
        onLeadCreated?.(res.data);
        onShowToast?.(`New prospect added: ${name.trim()}`);
        onClose();
      } else {
        throw new Error(res.error || 'Failed to create prospect.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to create prospect.');
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
              <Text style={styles.title}>New Customer Prospect</Text>
              <Text style={styles.subtitle}>Direct Showroom & CRM Intake</Text>
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
            {/* Full Name */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>FULL NAME *</Text>
              <TextInput
                style={styles.textInput}
                value={name}
                onChangeText={setName}
                placeholder="e.g. David & Jennifer Mitchell"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <WorkflowField label="Business name (optional)" value={businessName} onChangeText={setBusinessName} />
            {/* Mobile & Email */}
            <View style={styles.rowFields}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>MOBILE PHONE</Text>
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0412 345 678"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="customer@email.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Dealership Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>ASSIGNED DEALERSHIP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={styles.pillsRow}>
                  {locations.map((loc) => {
                    const isSelected = dealership === loc;
                    return (
                      <TouchableOpacity
                        key={loc}
                        onPress={() => setDealership(loc)}
                        style={[
                          styles.pill,
                          isSelected && styles.pillSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            isSelected && styles.pillTextSelected,
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

            {/* Vehicle Interest */}
            <View style={styles.rowFields}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>VEHICLE MAKE</Text>
                <TextInput
                  style={styles.textInput}
                  value={vehicleMake}
                  onChangeText={setVehicleMake}
                  placeholder="e.g. Kia / Chery"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>VEHICLE MODEL</Text>
                <TextInput
                  style={styles.textInput}
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  placeholder="e.g. Seal / Omoda 5"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Lead Source */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>LEAD SOURCE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={styles.pillsRow}>
                  {sourceOptions.map((src) => {
                    const isSelected = source === src;
                    return (
                      <TouchableOpacity
                        key={src}
                        onPress={() => setSource(src)}
                        style={[styles.pill, isSelected && styles.pillSelected]}
                      >
                        <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                          {src}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Trade-in Toggle */}
            <View style={styles.formGroup}>
              <TouchableOpacity
                onPress={() => setHasTradeIn(!hasTradeIn)}
                style={styles.tradeInToggle}
              >
                <View style={[styles.checkbox, hasTradeIn && styles.checkboxActive]} />
                <Text style={styles.tradeInToggleText}>Customer has a trade-in vehicle</Text>
              </TouchableOpacity>

              {hasTradeIn && (
                <View style={styles.tradeInInputs}>
                  <View style={styles.rowFields}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>TRADE MAKE</Text>
                      <TextInput
                        style={styles.textInput}
                        value={tradeMake}
                        onChangeText={setTradeMake}
                        placeholder="e.g. Toyota"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>TRADE MODEL</Text>
                      <TextInput
                        style={styles.textInput}
                        value={tradeModel}
                        onChangeText={setTradeModel}
                        placeholder="e.g. RAV4"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>
                  </View>
                  <View style={styles.rowFields}>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>YEAR</Text>
                      <TextInput
                        style={styles.textInput}
                        value={tradeYear}
                        onChangeText={setTradeYear}
                        placeholder="2020"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.formGroup, { flex: 1 }]}>
                      <Text style={styles.fieldLabel}>REGO</Text>
                      <TextInput
                        style={styles.textInput}
                        value={tradeRego}
                        onChangeText={setTradeRego}
                        placeholder="ABC-123"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                      />
                      <WorkflowButton label={lookingUp ? 'Looking up…' : 'Look up VIN'} disabled={lookingUp || !tradeRego || !dealership} onPress={async () => {
                        setLookingUp(true);
                        setError(null);
                        try {
                          const response = await workflows.lookup(tradeRego, dealership);
                          if (response.data) {
                            setTradeVin(response.data.vin || '');
                            setTradeMake(response.data.make || '');
                            setTradeModel(response.data.model || '');
                            setTradeYear(response.data.year ? String(response.data.year) : '');
                          }
                        } catch (reason) { setError((reason as Error).message); }
                        finally { setLookingUp(false); }
                      }} />
                      <WorkflowField label="Trade-in VIN" value={tradeVin} onChangeText={setTradeVin} />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.fieldLabel}>INITIAL NOTES</Text>
              <TextInput
                style={[styles.textInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Customer budget, financing required, test drive preferences..."
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
                <Text style={styles.submitButtonText}>Create Prospect Record</Text>
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
    maxHeight: '92%',
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
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#f8fafc',
  },
  pillSelected: {
    backgroundColor: colors.signalRed,
    borderColor: colors.signalRed,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tradeInToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  checkboxActive: {
    backgroundColor: colors.signalRed,
    borderColor: colors.signalRed,
  },
  tradeInToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tradeInInputs: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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

