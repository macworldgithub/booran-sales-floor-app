import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  AlertTriangle,
  MapPin,
  UserCheck,
  RefreshCw,
  X,
  LogOut,
  ChevronDown,
  Check,
  Settings,
} from 'lucide-react-native';
import { BooranLogo } from './BooranLogo';
import { colors } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSettings?: () => void;
  leadsCount?: number;
  inventoryCount?: number;
  actionItemsCount?: number;
}

export function MobileNav({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenSettings,
  leadsCount = 0,
  inventoryCount = 0,
  actionItemsCount = 0,
}: MobileNavProps) {
  const insets = useSafeAreaInsets();
  const { user, locations, selectedRooftop, setSelectedRooftop, logout } = useAuth();
  const [isRooftopDropdownOpen, setIsRooftopDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const floorItems = [
    { id: 'today', label: 'Today Command Center', icon: LayoutDashboard },
    { id: 'leads', label: 'Leads Centre (CRM)', icon: Users, badge: leadsCount },
    { id: 'inventory', label: 'Live Inventory', icon: Car, badge: inventoryCount },
    { id: 'calendar', label: 'Showroom Floor', icon: Calendar },
  ];

  const managementItems = [
    {
      id: 'action-items',
      label: 'Capital Radar',
      icon: AlertTriangle,
      badge: actionItemsCount,
      badgeColor: colors.amber,
    },
    { id: 'rooftops', label: 'Locations & Rooftops', icon: MapPin },
    { id: 'staff', label: 'Staff & Allocation', icon: UserCheck },
    ...(user?.role === 'super_admin'
      ? [{ id: 'feed-logs', label: 'DMS & Feed Sync', icon: RefreshCw }]
      : []),
  ];

  const allDealershipOptions = ['All Locations', ...locations];

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  const handleSelectRooftop = (rooftop: string) => {
    setSelectedRooftop(rooftop);
    setIsRooftopDropdownOpen(false);
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.drawerContent,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <BooranLogo height={26} />
              <Text style={styles.headerSubtitle}>Sales Floor OS</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Dealership Selector Dropdown */}
          <View style={styles.rooftopSection}>
            <Text style={styles.sectionLabel}>Active Dealership</Text>
            <TouchableOpacity
              onPress={() => setIsRooftopDropdownOpen(!isRooftopDropdownOpen)}
              style={styles.rooftopSelector}
              activeOpacity={0.8}
            >
              <Text style={styles.rooftopSelectedText} numberOfLines={1}>
                {selectedRooftop}
              </Text>
              <ChevronDown size={16} color="#94a3b8" />
            </TouchableOpacity>

            {isRooftopDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  {allDealershipOptions.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => handleSelectRooftop(item)}
                      style={[
                        styles.dropdownItem,
                        selectedRooftop === item && styles.dropdownItemActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          selectedRooftop === item && styles.dropdownItemTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                      {selectedRooftop === item && (
                        <Check size={14} color={colors.signalRed} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
            {/* Floor Operations */}
            <View style={styles.navGroup}>
              <Text style={styles.groupHeader}>Floor Operations</Text>
              {floorItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectTab(item.id)}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                  >
                    <View style={styles.navItemLeft}>
                      <Icon
                        size={18}
                        color={isActive ? '#ffffff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.navItemText,
                          isActive && styles.navItemTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {item.badge !== undefined && item.badge > 0 && (
                      <View
                        style={[
                          styles.navBadge,
                          {
                            backgroundColor: isActive
                              ? 'rgba(255, 255, 255, 0.25)'
                              : '#334155',
                          },
                        ]}
                      >
                        <Text style={styles.navBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Group Management */}
            <View style={styles.navGroup}>
              <Text style={styles.groupHeader}>Group Management</Text>
              {managementItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectTab(item.id)}
                    style={[styles.navItem, isActive && styles.navItemActive]}
                  >
                    <View style={styles.navItemLeft}>
                      <Icon
                        size={18}
                        color={isActive ? '#ffffff' : '#94a3b8'}
                      />
                      <Text
                        style={[
                          styles.navItemText,
                          isActive && styles.navItemTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {item.badge !== undefined && item.badge > 0 && (
                      <View
                        style={[
                          styles.navBadge,
                          {
                            backgroundColor: item.badgeColor || '#334155',
                          },
                        ]}
                      >
                        <Text style={styles.navBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* App Settings */}
            <View style={styles.navGroup}>
              <Text style={styles.groupHeader}>Preferences</Text>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenSettings?.();
                }}
                style={styles.navItem}
              >
                <View style={styles.navItemLeft}>
                  <Settings size={18} color="#94a3b8" />
                  <Text style={styles.navItemText}>Server & API Settings</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* User Account / Footer */}
          <View style={styles.footer}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user?.avatar || user?.name?.slice(0, 2).toUpperCase() || 'BM'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name}
                </Text>
                <Text style={styles.userRole} numberOfLines={1}>
                  {user?.role === 'super_admin' ? 'Super Admin' : user?.site || 'Manager'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={async () => {
                onClose();
                await logout();
              }}
              style={styles.logoutButton}
            >
              <LogOut size={16} color="#ef4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
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
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerContent: {
    width: '82%',
    maxWidth: 320,
    backgroundColor: '#171b22',
    height: '100%',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
    fontWeight: '500',
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rooftopSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rooftopSelector: {
    backgroundColor: '#1c222b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rooftopSelectedText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  dropdownMenu: {
    marginTop: 6,
    backgroundColor: '#1c222b',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(230, 0, 18, 0.15)',
  },
  dropdownItemText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  dropdownItemTextActive: {
    color: colors.signalRed,
    fontWeight: '700',
  },
  navScroll: {
    flex: 1,
    paddingVertical: 8,
  },
  navGroup: {
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  navItemActive: {
    backgroundColor: colors.signalRed,
  },
  navItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  navItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  navItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  navBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  navBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.signalRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  userRole: {
    color: '#94a3b8',
    fontSize: 11,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '700',
  },
});
