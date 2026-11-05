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
import {
  X,
  User,
  Car,
  Calendar,
  Clock,
  Send,
  Plus,
  FileText,
  CheckCircle2,
  AlertCircle,
  Mail,
  Building,
} from 'lucide-react-native';
import { Lead } from '../../types';
import { leadApi } from '../../services/api';
import { CustomerPhoneEditor } from '../customer/CustomerPhoneEditor';
import { CustomerMessages } from '../customer/CustomerMessages';
import { colors, shadows } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface Customer360ModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onLeadUpdated?: (updatedLead: Lead) => void;
  onOpenBookDrive?: (lead: Lead) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function Customer360Modal({
  lead,
  isOpen,
  onClose,
  onLeadUpdated,
  onOpenBookDrive,
  onShowToast,
}: Customer360ModalProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const currentStatus = lead.status || 'new_lead';

  const statusOptions = [
    { id: 'new_lead', label: 'New Lead', color: '#2563eb', bg: '#eff6ff' },
    { id: 'following_up', label: 'Following Up', color: '#d97706', bg: '#fffbeb' },
    { id: 'sold', label: 'Sold', color: '#059669', bg: '#ecfdf5' },
    { id: 'lost', label: 'Lost', color: '#64748b', bg: '#f1f5f9' },
  ];

  const handleStatusChange = async (newStatus: string) => {
    if (isUpdatingStatus || newStatus === currentStatus) return;
    setIsUpdatingStatus(true);
    setError(null);
    try {
      const res = await leadApi.updateLead(lead._id, { status: newStatus });
      if (res.success && res.data) {
        onLeadUpdated?.(res.data);
        onShowToast?.(`Lead status updated to ${newStatus}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || isSubmittingNote) return;
    setIsSubmittingNote(true);
    setError(null);
    try {
      const res = await leadApi.addNote(lead._id, newNote.trim(), user?.name);
      if (res.success && res.data) {
        onLeadUpdated?.(res.data);
        setNewNote('');
        onShowToast?.('Note added to timeline');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to save note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const initials =
    lead.initials ||
    (lead.name || lead.customer_name || 'Prospect')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View>
                <Text style={styles.leadName} numberOfLines={1}>
                  {lead.name || lead.customer_name || 'Prospect Profile'}
                </Text>
                <Text style={styles.leadDealership} numberOfLines={1}>
                  {lead.dealership} · ID: {lead.id || lead._id?.slice(-6)}
                </Text>
              </View>
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

          <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
            {/* Status Selector */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Pipeline Stage</Text>
              <View style={styles.statusPillsRow}>
                {statusOptions.map((opt) => {
                  const isActive = currentStatus === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => handleStatusChange(opt.id)}
                      disabled={isUpdatingStatus}
                      style={[
                        styles.statusPill,
                        { borderColor: opt.color },
                        isActive && { backgroundColor: opt.color },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: opt.color },
                          isActive && { color: '#ffffff', fontWeight: '800' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Contact Details */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.metaGrid}>
                <View style={styles.metaCell}>
                  <CustomerPhoneEditor
                    lead={lead}
                    onUpdated={(updated) => onLeadUpdated?.(updated)}
                  />
                </View>

                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>EMAIL</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {lead.email || lead.customer_email || 'Not provided'}
                  </Text>
                </View>

                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>VEHICLE INTEREST</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {lead.vehicle || `${lead.make || ''} ${lead.model || ''}`.trim() || 'General inquiry'}
                  </Text>
                </View>

                <View style={styles.metaCell}>
                  <Text style={styles.metaLabel}>ASSIGNED CONSULTANT</Text>
                  <Text style={styles.metaValue} numberOfLines={1}>
                    {lead.owner_name || lead.assignedTo || 'Unassigned'}
                  </Text>
                </View>
              </View>

              {lead.source && (
                <View style={styles.sourceTag}>
                  <Text style={styles.sourceText}>Source: {lead.source}</Text>
                </View>
              )}
            </View>

            {/* Test Drive Action Card */}
            <View style={[styles.sectionCard, styles.testDriveCard]}>
              <View style={styles.testDriveHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Showroom Test Drive</Text>
                  <Text style={styles.testDriveSubtext}>
                    {lead.testDrive?.testDriveDate
                      ? `Booked for ${new Date(lead.testDrive.testDriveDate).toLocaleDateString()} (${lead.testDrive.status || 'Confirmed'})`
                      : 'No appointment scheduled yet.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => onOpenBookDrive?.(lead)}
                  style={styles.bookDriveButton}
                >
                  <Calendar size={14} color="#ffffff" />
                  <Text style={styles.bookDriveButtonText}>
                    {lead.testDrive?.testDriveDate ? 'Manage Drive' : 'Book Drive'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Trade In */}
            {lead.tradeIn?.make && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Trade-In Appraisal</Text>
                <View style={styles.tradeInRow}>
                  <Car size={16} color={colors.textSecondary} />
                  <Text style={styles.tradeInText}>
                    {lead.tradeIn.year || ''} {lead.tradeIn.make} {lead.tradeIn.model}{' '}
                    {lead.tradeIn.rego ? `(Rego: ${lead.tradeIn.rego})` : ''}
                  </Text>
                  {lead.tradeIn.estimatedValue ? (
                    <Text style={styles.tradeInValue}>
                      Est: ${lead.tradeIn.estimatedValue.toLocaleString()}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}

            {/* Customer SMS Communications */}
            <CustomerMessages lead={lead} />

            {/* Diary Entries & Notes Timeline */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Sales Floor Diary & Notes</Text>

              {/* Add Note Input */}
              <View style={styles.addNoteBox}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Record customer interaction, phone note, or next step..."
                  placeholderTextColor="#94a3b8"
                  value={newNote}
                  onChangeText={setNewNote}
                  multiline
                />
                <TouchableOpacity
                  onPress={handleAddNote}
                  disabled={!newNote.trim() || isSubmittingNote}
                  style={[
                    styles.addNoteBtn,
                    (!newNote.trim() || isSubmittingNote) && { opacity: 0.5 },
                  ]}
                >
                  {isSubmittingNote ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.addNoteBtnText}>Add Note</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Diary Entries List */}
              <View style={styles.diaryTimeline}>
                {lead.diary_entries && lead.diary_entries.length > 0 ? (
                  lead.diary_entries.map((entry, idx) => (
                    <View key={idx} style={styles.diaryItem}>
                      <View style={styles.diaryBullet} />
                      <View style={styles.diaryBody}>
                        <View style={styles.diaryMeta}>
                          <Text style={styles.diaryAuthor}>{entry.author || 'Staff'}</Text>
                          <Text style={styles.diaryDate}>
                            {entry.date ? new Date(entry.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </Text>
                        </View>
                        <Text style={styles.diaryNote}>{entry.note}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyDiary}>No timeline entries recorded yet.</Text>
                )}
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
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.signalRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  leadName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  leadDealership: {
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
  statusPillsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaCell: {
    width: '46%',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  sourceTag: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sourceText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  testDriveCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  testDriveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testDriveSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bookDriveButton: {
    backgroundColor: colors.signalRed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bookDriveButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tradeInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tradeInText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  tradeInValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.emerald,
  },
  addNoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 10,
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 50,
    fontSize: 13,
    color: colors.textPrimary,
  },
  addNoteBtn: {
    backgroundColor: colors.graphite,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  addNoteBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  diaryTimeline: {
    gap: 12,
  },
  diaryItem: {
    flexDirection: 'row',
    gap: 10,
  },
  diaryBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.signalRed,
    marginTop: 5,
  },
  diaryBody: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
  },
  diaryMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  diaryAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  diaryDate: {
    fontSize: 10,
    color: colors.textMuted,
  },
  diaryNote: {
    fontSize: 12,
    color: colors.textPrimary,
    lineHeight: 16,
  },
  emptyDiary: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
});

