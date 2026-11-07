import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Car,
  Lock,
  DollarSign,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Tag,
  CheckCircle2,
} from 'lucide-react-native';
import { Vehicle } from '../../types';
import { inventoryApi } from '../../services/api';
import { colors, shadows } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onVehicleUpdated?: (updatedVehicle: Vehicle) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function VehicleDetailModal({
  vehicle,
  isOpen,
  onClose,
  onVehicleUpdated,
  onShowToast,
}: VehicleDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [isSubmittingHold, setIsSubmittingHold] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vehicle) return null;

  const isHeld = vehicle.status === 'Soft Hold' || Boolean(vehicle.softHold?.held);

  const handleReleaseHold = async () => {
    setIsSubmittingHold(true);
    setError(null);
    try {
      const res = await inventoryApi.releaseHold(vehicle._id, {
        holdId: vehicle.softHold?.holdId,
        heldAt: vehicle.softHold?.heldAt,
      });
      if (res.success && res.data) {
        onVehicleUpdated?.(res.data);
        onShowToast?.('Vehicle soft hold released.');
      } else {
        throw new Error(res.error || 'Unable to release soft hold.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to release hold.');
    } finally {
      setIsSubmittingHold(false);
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
            <View style={{ flex: 1 }}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        vehicle.status === 'In Stock'
                          ? '#ecfdf5'
                          : vehicle.status === 'Soft Hold'
                          ? '#fffbeb'
                          : '#f1f5f9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          vehicle.status === 'In Stock'
                            ? colors.emerald
                            : vehicle.status === 'Soft Hold'
                            ? colors.amber
                            : colors.slate,
                      },
                    ]}
                  >
                    {vehicle.status?.toUpperCase() || 'IN STOCK'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.agingBadge,
                    {
                      backgroundColor:
                        vehicle.daysInStock >= 90 ? '#fee2e2' : '#f1f5f9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.agingBadgeText,
                      {
                        color:
                          vehicle.daysInStock >= 90 ? colors.danger : colors.slate,
                      },
                    ]}
                  >
                    {vehicle.daysInStock} DAYS IN STOCK
                  </Text>
                </View>
              </View>

              <Text style={styles.vehicleTitle} numberOfLines={2}>
                {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.variant || ''}
              </Text>
              <Text style={styles.vehicleSubtitle}>
                Stock #{vehicle.stockNumber} · VIN: {vehicle.vin}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorAlert}>
              <AlertTriangle size={14} color={colors.danger} />
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          )}

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {isHeld && (
              <View style={[styles.sectionCard, styles.holdActiveCard]}>
                <View style={styles.holdHeader}>
                  <View style={styles.holdHeaderLeft}>
                    <Lock size={18} color={colors.amber} />
                    <Text style={styles.holdHeaderTitle}>Existing Soft Hold</Text>
                  </View>
                  {user?.canAllocate && <TouchableOpacity onPress={handleReleaseHold} disabled={isSubmittingHold} style={styles.releaseHoldBtn}>
                    {isSubmittingHold ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.releaseHoldBtnText}>Release Hold</Text>}
                  </TouchableOpacity>}
                </View>
                {vehicle.softHold?.prospectName && <Text style={styles.holdProspect}>{vehicle.softHold.prospectName}</Text>}
              </View>
            )}

            {/* Financial Metrics */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Financial Breakdown & Gross</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>ADVERTISED PRICE</Text>
                  <Text style={styles.metricBoxValue}>
                    ${(vehicle.advertisedPrice || 0).toLocaleString()}
                  </Text>
                </View>

                {user?.viewCost && <>
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>VEHICLE COST</Text>
                  <Text style={styles.metricBoxValue}>
                    ${(vehicle.vehicleCost || vehicle.totalStockCost || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>POTENTIAL GROSS</Text>
                  <Text
                    style={[
                      styles.metricBoxValue,
                      {
                        color:
                          (vehicle.potentialGross || 0) > 0
                            ? colors.emerald
                            : colors.danger,
                      },
                    ]}
                  >
                    ${(vehicle.potentialGross || 0).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>HOLDING COST / DAY</Text>
                  <Text style={styles.metricBoxValue}>
                    ${(vehicle.holdingCostPerDay || 25).toFixed(2)}
                  </Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>ACCUMULATED HOLDING</Text>
                  <Text style={[styles.metricBoxValue, { color: colors.amber }]}>
                    ${(vehicle.accumulatedHoldingCost || (vehicle.daysInStock * 25)).toLocaleString()}
                  </Text>
                </View>

                </>}
                <View style={styles.metricBox}>
                  <Text style={styles.metricBoxLabel}>LOCATION</Text>
                  <Text style={styles.metricBoxValue} numberOfLines={1}>
                    {vehicle.rooftopName}
                  </Text>
                </View>
              </View>
            </View>

            {/* Specifications */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Specifications & Details</Text>
              <View style={styles.specsList}>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Category</Text>
                  <Text style={styles.specValue}>{vehicle.category || 'Used'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Body Style</Text>
                  <Text style={styles.specValue}>{vehicle.body || 'SUV'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Transmission</Text>
                  <Text style={styles.specValue}>{vehicle.transmission || 'Automatic'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Fuel / Powertrain</Text>
                  <Text style={styles.specValue}>{vehicle.fuel || 'Petrol'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Colour</Text>
                  <Text style={styles.specValue}>{vehicle.colour || 'Silver'}</Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Odometer</Text>
                  <Text style={styles.specValue}>
                    {vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : 'Delivery km'}
                  </Text>
                </View>
                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>Registration</Text>
                  <Text style={styles.specValue}>{vehicle.rego || 'Unregistered'}</Text>
                </View>
              </View>
            </View>

            {/* Status Tags */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Showroom Readiness</Text>
              <View style={styles.readinessRow}>
                <View style={styles.readinessItem}>
                  <ShieldCheck
                    size={16}
                    color={vehicle.frontlineReady ? colors.emerald : colors.slate}
                  />
                  <Text style={styles.readinessText}>
                    Frontline Ready: {vehicle.frontlineReady ? 'Yes' : 'In Prep'}
                  </Text>
                </View>
                <View style={styles.readinessItem}>
                  <Globe
                    size={16}
                    color={vehicle.isLiveOnWebsite ? colors.blue : colors.slate}
                  />
                  <Text style={styles.readinessText}>
                    Website Live: {vehicle.isLiveOnWebsite ? 'Yes' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
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
    backgroundColor: '#f4f5f7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '92%',
    paddingHorizontal: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  agingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  agingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#ffffff',
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
  sheetBody: {
    flex: 1,
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  holdActiveCard: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  holdInactiveCard: {
    borderColor: colors.cardBorder,
  },
  holdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  holdHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  holdHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  releaseHoldBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  releaseHoldBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  holdDetails: {
    marginTop: 8,
    gap: 4,
  },
  holdProspect: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  holdConsultant: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  holdNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  placeHoldTrigger: {
    marginTop: 10,
    backgroundColor: colors.signalRed,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  placeHoldTriggerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  holdForm: {
    marginTop: 10,
    gap: 6,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#ffffff',
  },
  holdActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  confirmHoldBtn: {
    backgroundColor: colors.signalRed,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  confirmHoldBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelHoldBtn: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelHoldBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricBox: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
  },
  metricBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metricBoxValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
  },
  specsList: {
    gap: 8,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  specLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  readinessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readinessItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readinessText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

