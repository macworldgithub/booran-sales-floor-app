import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Car,
  User,
  Plus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';
import { Appointment } from '../types';
import { appointmentApi, staffApi } from '../services/api';
import { melbourneDate } from '../services/dates';
import { Pagination } from '../components/common/Pagination';
import { WorkflowButton, workflowStyles } from '../components/common/WorkflowControls';
import { Delivery, Task, workflows } from '../services/workflows';
import { colors, shadows } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

interface CalendarViewProps {
  onOpenBookDrive: () => void;
  revision?: number;
}

export function CalendarView({ onOpenBookDrive, revision }: CalendarViewProps) {
  const { selectedRooftop, user } = useAuth();

  const [selectedDate, setSelectedDate] = useState(melbourneDate);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [consultant, setConsultant] = useState('');
  const [staff, setStaff] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [dayTasks, setDayTasks] = useState<Task[]>([]);
  const [dayDeliveries, setDayDeliveries] = useState<Delivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = [
    'all',
    'Test Drive',
    'Showroom Visit',
    'Delivery Handover',
    'Callback',
    'Walk-in',
    'Lunch',
  ];

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        date: selectedDate,
        limit: 20,
        page,
        type: typeFilter,
        consultant,
      };
      if (selectedRooftop !== 'All Locations') {
        params.rooftop = selectedRooftop;
      }

      const res = await appointmentApi.getAppointments(params);
      if (res.success && res.data) {
        setAppointments(res.data);
        setTotal(res.pagination?.total ?? res.data.length);
        setPages(Math.max(1, res.pagination?.totalPages ?? 1));
      } else {
        throw new Error(res.error || 'Failed to fetch appointments.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load showroom calendar.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedRooftop, page, typeFilter, consultant]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments, revision]);

  useEffect(() => {
    let active = true;
    setDayTasks([]);
    setDayDeliveries([]);
    Promise.allSettled([
      workflows.tasks(selectedRooftop, selectedDate, consultant),
      consultant ? Promise.resolve(null) : workflows.deliveries(selectedRooftop, 1, 'scheduled', selectedDate),
    ]).then(([tasks, deliveries]) => {
      if (!active) return;
      if (tasks.status === 'fulfilled') setDayTasks(tasks.value.data || []);
      if (deliveries.status === 'fulfilled') setDayDeliveries(deliveries.value?.data || []);
    });
    return () => { active = false; };
  }, [selectedRooftop, selectedDate, consultant, revision]);

  useEffect(() => {
    setConsultant('');
    setPage(1);
    if (!user?.canAllocate) return;
    let active = true;
    staffApi.getStaff(selectedRooftop).then(result => {
      if (active) setStaff([...new Set((result.data || []).map(item => item.name).filter(name => name !== 'Unassigned'))].sort());
    }).catch(() => { if (active) setStaff([]); });
    return () => { active = false; };
  }, [selectedRooftop, user?.canAllocate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setUTCDate(d.getUTCDate() - 1);
    setPage(1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setUTCDate(d.getUTCDate() + 1);
    setPage(1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setPage(1);
    setSelectedDate(melbourneDate());
  };

  const filteredAppointments = appointments.filter((a) => {
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    return true;
  });

  const formattedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-AU', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Date Navigation Bar */}
      <View style={styles.dateBar}>
        <View style={styles.dateNavRow}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.navArrow}>
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleToday} style={styles.dateDisplay}>
            <CalendarIcon size={16} color={colors.signalRed} />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNextDay} style={styles.navArrow}>
            <ChevronRight size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={onOpenBookDrive} style={styles.bookBtn}>
          <Plus size={16} color="#ffffff" />
          <Text style={styles.bookBtnText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>

      {/* Appointment Type Filter Pills */}
      <View style={styles.typesScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typesRow}>
          {typeOptions.map((type) => {
            const isSelected = typeFilter === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => { setTypeFilter(type); setPage(1); }}
                style={[styles.typePill, isSelected && styles.typePillSelected]}
              >
                <Text style={[styles.typePillText, isSelected && styles.typePillTextSelected]}>
                  {type === 'all' ? 'All Types' : type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      {user?.canAllocate && !!staff.length && <View style={styles.typesScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={workflowStyles.row}>
          <WorkflowButton label="Whole team" disabled={!consultant} onPress={() => { setConsultant(''); setPage(1); }} />
          {staff.map(name => <WorkflowButton key={name} label={name} disabled={consultant === name} onPress={() => { setConsultant(name); setPage(1); }} />)}
        </ScrollView>
      </View>}
      {pages > 1 && <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={20} onPageChange={setPage} itemName="bookings" />}

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAppointments} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeline Schedule */}
      <ScrollView
        style={styles.scheduleList}
        contentContainerStyle={styles.scheduleContent}
        showsVerticalScrollIndicator={false}
      >
        {!!(dayTasks.length || dayDeliveries.length) && <View style={workflowStyles.card}>
          {!!dayTasks.length && <Text style={workflowStyles.label}>Follow-ups due</Text>}
          {dayTasks.map(task => <Text key={task._id} style={workflowStyles.text}>
            {new Date(task.due_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Melbourne' })} · {task.title} · {task.assignee_name}
          </Text>)}
          {!!dayDeliveries.length && <Text style={workflowStyles.label}>Delivery handovers</Text>}
          {dayDeliveries.map(delivery => <Text key={delivery._id} style={workflowStyles.text}>
            {new Date(delivery.when).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Melbourne' })} · {delivery.customer_name} · {delivery.dealership}
          </Text>)}
        </View>}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Loading showroom bookings...</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CalendarIcon size={36} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No bookings on this day</Text>
            <Text style={styles.emptySubtitle}>
              Select another day or tap Book Appointment to schedule a test drive or showroom consultation.
            </Text>
            <TouchableOpacity onPress={onOpenBookDrive} style={styles.bookScheduleBtn}>
              <Text style={styles.bookScheduleBtnText}>Book Test Drive</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredAppointments.map((appt) => {
            const timeStr = appt.when
              ? new Date(appt.when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '10:00 AM';

            return (
              <View key={appt._id} style={styles.apptCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <Clock size={12} color={colors.signalRed} />
                    <Text style={styles.timeBadgeText}>{timeStr}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          appt.status === 'Completed'
                            ? '#ecfdf5'
                            : appt.status === 'Cancelled'
                            ? '#fee2e2'
                            : '#eff6ff',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color:
                            appt.status === 'Completed'
                              ? colors.emerald
                              : appt.status === 'Cancelled'
                              ? colors.danger
                              : colors.blue,
                        },
                      ]}
                    >
                      {appt.status?.toUpperCase() || 'BOOKED'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.prospectName}>{appt.prospectName}</Text>
                <Text style={styles.vehicleText}>
                  {appt.vehicle || 'Floor Consultation'} · {appt.dealership || 'Dealership'}
                </Text>

                <View style={styles.apptMetaRow}>
                  <View style={styles.metaItem}>
                    <User size={12} color={colors.textSecondary} />
                    <Text style={styles.metaText}>
                      Consultant: {appt.consultantName || 'Sales Team'}
                    </Text>
                  </View>

                  <View style={styles.typeTag}>
                    <Text style={styles.typeTagText}>{appt.type}</Text>
                  </View>
                </View>

                {appt.notes ? (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesText}>{appt.notes}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  dateBar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  navArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  bookBtn: {
    backgroundColor: colors.signalRed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  bookBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  typesScrollWrapper: {
    maxHeight: 38,
    marginTop: 8,
  },
  typesRow: {
    paddingHorizontal: 12,
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typePillSelected: {
    backgroundColor: colors.graphite,
    borderColor: colors.graphite,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typePillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    margin: 12,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 12,
  },
  scheduleList: {
    flex: 1,
  },
  scheduleContent: {
    padding: 12,
    gap: 10,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  bookScheduleBtn: {
    marginTop: 8,
    backgroundColor: colors.signalRed,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bookScheduleBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  apptCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.signalRed,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  prospectName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  vehicleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  apptMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  typeTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  notesBox: {
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
  },
  notesText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

