import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Header } from './src/components/common/Header';
import { BottomNav } from './src/components/common/BottomNav';
import { MobileNav } from './src/components/common/MobileNav';
import { Toast } from './src/components/common/Toast';
import { BooranLogo } from './src/components/common/BooranLogo';

import { TodayView } from './src/views/TodayView';
import { LeadsView } from './src/views/LeadsView';
import { InventoryView } from './src/views/InventoryView';
import { ActionItemsView } from './src/views/ActionItemsView';
import { CalendarView } from './src/views/CalendarView';
import { RooftopsView } from './src/views/RooftopsView';
import { StaffView } from './src/views/StaffView';
import { FeedLogsView } from './src/views/FeedLogsView';
import { LoginScreen } from './src/views/LoginScreen';

import { Customer360Modal } from './src/components/modals/Customer360Modal';
import { VehicleDetailModal } from './src/components/modals/VehicleDetailModal';
import { BookTestDriveModal } from './src/components/modals/BookTestDriveModal';
import { AddProspectModal } from './src/components/modals/AddProspectModal';
import { NotificationCenterModal } from './src/components/modals/NotificationCenterModal';
import { SettingsModal } from './src/components/modals/SettingsModal';
import { DeliveryCentre } from './src/components/common/DeliveryCentre';
import { WorkflowButton } from './src/components/common/WorkflowControls';

import { Lead, Vehicle, ActionItem, Appointment, UnifiedSummary } from './src/types';
import { leadApi, inventoryApi, appointmentApi, unifiedApi } from './src/services/api';
import { colors } from './src/theme/theme';
import { melbourneDate } from './src/services/dates';

function MainSalesFloorApp() {
  const { user, isAuthenticated, isLoading: authLoading, selectedRooftop, logout } = useAuth();

  // Navigation state
  const [activeTab, setActiveTab] = useState<string>('today');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [bookDriveLead, setBookDriveLead] = useState<Lead | null>(null);
  const [isBookDriveOpen, setIsBookDriveOpen] = useState(false);
  const [isAddProspectOpen, setIsAddProspectOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Global Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastType(type);
    setToastMessage(message);
  };

  // Telemetry data stores
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadRevision, setLeadRevision] = useState(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarRevision, setCalendarRevision] = useState(0);
  const [unifiedSummary, setUnifiedSummary] = useState<UnifiedSummary | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const loadVersion = useRef(0);

  const loadInitialData = useCallback(async () => {
    if (!isAuthenticated || user?.role === 'contractor') return;
    const version = ++loadVersion.current;
    setIsDataLoading(true);

    try {
      const todayStr = melbourneDate();

      const [leadsRes, vehiclesRes, actionsRes, apptsRes, summaryRes] = await Promise.all([
        leadApi
          .getLeads({ limit: 30, dealership: selectedRooftop, attention: 'true' })
          .catch(() => ({ success: false, data: [] })),
        inventoryApi
          .getVehicles({ limit: 30, rooftop: selectedRooftop })
          .catch(() => ({ success: false, data: [] })),
        inventoryApi
          .getActionItems({ limit: 30, rooftop: selectedRooftop })
          .catch(() => ({ success: false, data: [] })),
        appointmentApi
          .getAppointments({ rooftop: selectedRooftop, limit: 30, date: todayStr })
          .catch(() => ({ success: false, data: [] })),
        unifiedApi
          .getSummary(selectedRooftop)
          .catch(() => ({ success: false, data: undefined })),
      ]);

      if (version !== loadVersion.current) return;

      if (leadsRes.success && leadsRes.data) {
        setLeads(leadsRes.data);
      }
      if (vehiclesRes.success && vehiclesRes.data) {
        setVehicles(vehiclesRes.data);
      }
      if (actionsRes.success && actionsRes.data) {
        setActionItems(actionsRes.data);
      }
      if (apptsRes.success && apptsRes.data) {
        setAppointments(apptsRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setUnifiedSummary(summaryRes.data);
      }
    } catch (err) {
      console.warn('Initial data load error:', err);
    } finally {
      if (version === loadVersion.current) {
        setIsDataLoading(false);
      }
    }
  }, [isAuthenticated, selectedRooftop, user?.role]);

  useEffect(() => {
    setSelectedLead(null);
    setSelectedVehicle(null);
    setLeads([]);
    setVehicles([]);
    setActionItems([]);
    setAppointments([]);
    setUnifiedSummary(null);
    loadInitialData();
    return () => { loadVersion.current++; };
  }, [loadInitialData]);

  useEffect(() => {
    if (!isAuthenticated || user?.role === 'contractor') return;
    let active = true;
    const open = async (response: Notifications.NotificationResponse) => {
      const id = response.notification.request.content.data?.leadId;
      if (typeof id !== 'string') return;
      const result = await leadApi.getLead(id).catch(() => null);
      if (active && result?.data) setSelectedLead(result.data);
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(response => { void open(response); });
    const previous = Notifications.getLastNotificationResponse();
    if (previous) {
      Notifications.clearLastNotificationResponse();
      void open(previous);
    }
    return () => { active = false; subscription.remove(); };
  }, [isAuthenticated, user?.role]);

  if (authLoading) {
    return (
      <View style={styles.splashContainer}>
        <BooranLogo height={42} />
        <ActivityIndicator size="large" color={colors.signalRed} style={{ marginTop: 24 }} />
        <Text style={styles.splashText}>Verifying showroom session...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginScreen onOpenSettings={() => setIsSettingsOpen(true)} />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onShowToast={showToast}
        />
      </>
    );
  }

  if (user?.role === 'contractor') return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: 55 }}>
      <DeliveryCentre initialOpen />
      <WorkflowButton label="Sign out" onPress={logout} />
    </ScrollView>
  );

  const unreadNotifications = Boolean(
    (unifiedSummary?.crm?.newLeads ?? 0) > 0 ||
      (unifiedSummary?.inventory?.openActionItems ?? 0) > 0
  );

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />

      {/* Header */}
      <Header
        onOpenMobileNav={() => setIsMobileNavOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAddProspect={() => setIsAddProspectOpen(true)}
        onSelectLead={(l) => setSelectedLead(l)}
        onSelectVehicle={(v) => setSelectedVehicle(v)}
        onSelectAction={() => setActiveTab('action-items')}
        unreadNotifications={unreadNotifications}
      />

      {/* Main View Container */}
      <View style={styles.mainView}>
        {activeTab === 'today' && (
          <TodayView
            leads={leads}
            vehicles={vehicles}
            actionItems={actionItems}
            appointments={appointments}
            summary={unifiedSummary}
            isLoading={isDataLoading}
            onRefresh={loadInitialData}
            onSelectLead={(l) => setSelectedLead(l)}
            onSelectVehicle={(v) => setSelectedVehicle(v)}
            onOpenBookDrive={(l) => {
              setBookDriveLead(l || null);
              setIsBookDriveOpen(true);
            }}
            onOpenAddProspect={() => setIsAddProspectOpen(true)}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'leads' && (
          <LeadsView
            revision={leadRevision}
            onSelectLead={(l) => setSelectedLead(l)}
            onOpenBookDrive={(l) => {
              setBookDriveLead(l || null);
              setIsBookDriveOpen(true);
            }}
            onOpenAddProspect={() => setIsAddProspectOpen(true)}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView onSelectVehicle={(v) => setSelectedVehicle(v)} />
        )}

        {activeTab === 'action-items' && (
          <ActionItemsView onShowToast={showToast} />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            revision={calendarRevision}
            onOpenBookDrive={() => {
              setBookDriveLead(null);
              setIsBookDriveOpen(true);
            }}
          />
        )}

        {activeTab === 'rooftops' && (
          <RooftopsView
            onSelectRooftopFilter={(rooftop) => {
              setActiveTab('inventory');
            }}
          />
        )}

        {activeTab === 'staff' && <StaffView />}

        {activeTab === 'feed-logs' && user?.role === 'super_admin' && (
          <FeedLogsView onShowToast={showToast} />
        )}
      </View>

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMore={() => setIsMobileNavOpen(true)}
        leadsCount={unifiedSummary?.crm?.totalLeads ?? leads.length}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles ?? vehicles.length}
      />

      {/* Slide-over Drawer */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        leadsCount={unifiedSummary?.crm?.totalLeads ?? leads.length}
        inventoryCount={unifiedSummary?.inventory?.totalVehicles ?? vehicles.length}
        actionItemsCount={unifiedSummary?.inventory?.openActionItems ?? actionItems.length}
      />

      {/* Modals */}
      <Customer360Modal
        key={selectedLead?._id || 'no-lead'}
        onOpenRelated={setSelectedLead}
        lead={selectedLead}
        isOpen={Boolean(selectedLead)}
        onClose={() => setSelectedLead(null)}
        onLeadUpdated={(updated) => {
          setSelectedLead(updated);
          setLeadRevision(value => value + 1);
          setLeads((prev) =>
            prev.map((l) => (l._id === updated._id ? { ...l, ...updated } : l))
          );
        }}
        onOpenBookDrive={(lead) => {
          setBookDriveLead(lead);
          setIsBookDriveOpen(true);
        }}
        onShowToast={showToast}
      />

      <VehicleDetailModal
        vehicle={selectedVehicle}
        isOpen={Boolean(selectedVehicle)}
        onClose={() => setSelectedVehicle(null)}
        onVehicleUpdated={(updated) => {
          setSelectedVehicle(updated);
          setVehicles((prev) =>
            prev.map((v) => (v._id === updated._id ? { ...v, ...updated } : v))
          );
        }}
        onShowToast={showToast}
      />

      {isBookDriveOpen && <BookTestDriveModal
        key={bookDriveLead?._id || 'standalone-booking'}
        isOpen={isBookDriveOpen}
        onClose={() => setIsBookDriveOpen(false)}
        lead={bookDriveLead}
        onAppointmentCreated={(newAppt) => {
          setAppointments((prev) => [newAppt, ...prev]);
          setCalendarRevision(value => value + 1);
        }}
        onShowToast={showToast}
      />}

      {isAddProspectOpen && <AddProspectModal
        isOpen={isAddProspectOpen}
        onClose={() => setIsAddProspectOpen(false)}
        onLeadCreated={(newLead) => {
          setLeads((prev) => [newLead, ...prev]);
          setLeadRevision(value => value + 1);
          setSelectedLead(newLead);
        }}
        onShowToast={showToast}
      />}

      <NotificationCenterModal
        onOpenLead={setSelectedLead}
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        summary={unifiedSummary}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onShowToast={showToast}
      />

      {/* Floating Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        onDismiss={() => setToastMessage(null)}
      />
    </View>
  );
}

function SalesFloorSession() {
  const { user } = useAuth();
  return <MainSalesFloorApp key={user?.id || 'signed-out'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SalesFloorSession />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171b22',
  },
  mainView: {
    flex: 1,
    backgroundColor: '#f4f5f7',
  },
  splashContainer: {
    flex: 1,
    backgroundColor: '#171b22',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splashText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
  },
});
