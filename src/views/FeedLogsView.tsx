import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  ArrowDownCircle,
} from 'lucide-react-native';
import { FeedLog } from '../types';
import { inventoryApi, leadApi } from '../services/api';
import { colors, shadows } from '../theme/theme';

interface FeedLogsViewProps {
  onShowToast?: (msg: string, type?: 'success' | 'error') => void;
}

export function FeedLogsView({ onShowToast }: FeedLogsViewProps) {
  const [logs, setLogs] = useState<FeedLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingCsv, setIsSyncingCsv] = useState(false);
  const [isSyncingFlwup, setIsSyncingFlwup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await inventoryApi.getFeedLogs({ limit: 30 });
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        throw new Error(res.error || 'Failed to fetch DMS feed logs.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load DMS logs.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSyncCsv = async () => {
    if (isSyncingCsv) return;
    setIsSyncingCsv(true);
    try {
      const res = await inventoryApi.syncCsv();
      if (res.success && res.data) {
        onShowToast?.(`CSV Sync Complete: ${res.data.vehiclesProcessed} vehicles updated`);
        fetchLogs();
      } else {
        throw new Error('CSV Sync was not completed.');
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'CSV sync failed', 'error');
    } finally {
      setIsSyncingCsv(false);
    }
  };

  const handleSyncFlwup = async () => {
    if (isSyncingFlwup) return;
    setIsSyncingFlwup(true);
    try {
      const res = await leadApi.syncFlwup();
      if (res.success) {
        onShowToast?.('FLWUP CRM pipeline synchronized');
        fetchLogs();
      } else {
        throw new Error(res.error || 'FLWUP sync failed.');
      }
    } catch (err: any) {
      onShowToast?.(err?.message || 'FLWUP sync failed', 'error');
    } finally {
      setIsSyncingFlwup(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <View style={styles.bannerTagRow}>
            <Text style={styles.bannerTag}>SUPER ADMIN DMS FEED</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{logs.length} Feed Records</Text>
            </View>
          </View>
          <Text style={styles.bannerTitle}>Pentana & Website Reconciliation</Text>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            onPress={handleSyncCsv}
            disabled={isSyncingCsv}
            style={[styles.syncBtn, isSyncingCsv && { opacity: 0.6 }]}
          >
            {isSyncingCsv ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <RefreshCw size={12} color="#ffffff" />
                <Text style={styles.syncBtnText}>Sync CSV</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSyncFlwup}
            disabled={isSyncingFlwup}
            style={[styles.syncBtn, styles.syncBtnDark, isSyncingFlwup && { opacity: 0.6 }]}
          >
            {isSyncingFlwup ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Database size={12} color="#ffffff" />
                <Text style={styles.syncBtnText}>Sync CRM</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchLogs} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logs List */}
      <ScrollView
        style={styles.logsList}
        contentContainerStyle={styles.logsListContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.signalRed} />
            <Text style={styles.loadingText}>Fetching feed integration logs...</Text>
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <RefreshCw size={32} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No feed logs found</Text>
            <Text style={styles.emptySubtitle}>Tap Sync CSV to run an immediate feed ingestion.</Text>
          </View>
        ) : (
          logs.map((log) => {
            const isSuccess = log.status === 'SUCCESS';
            const isWarn = log.status === 'WARNING';

            return (
              <View key={log._id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={styles.logTypeRow}>
                    <Text style={styles.feedType}>{log.feedType}</Text>
                    <Text style={styles.windowText}>Window: {log.scheduledWindow}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isSuccess
                          ? '#ecfdf5'
                          : isWarn
                          ? '#fffbeb'
                          : '#fee2e2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: isSuccess
                            ? colors.emerald
                            : isWarn
                            ? colors.amber
                            : colors.danger,
                        },
                      ]}
                    >
                      {log.status}
                    </Text>
                  </View>
                </View>

                {/* Metrics */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>PENTANA ROWS</Text>
                    <Text style={styles.metricVal}>
                      {log.totalPentanaRows.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>RECONCILED</Text>
                    <Text style={[styles.metricVal, { color: colors.emerald }]}>
                      {log.reconciledCount.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>QUARANTINED</Text>
                    <Text style={[styles.metricVal, { color: log.quarantinedCount > 0 ? colors.amber : colors.textPrimary }]}>
                      {log.quarantinedCount}
                    </Text>
                  </View>

                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DURATION</Text>
                    <Text style={styles.metricVal}>{(log.durationMs / 1000).toFixed(1)}s</Text>
                  </View>
                </View>

                {log.notes ? (
                  <Text style={styles.logNotes}>{log.notes}</Text>
                ) : null}

                <Text style={styles.timestamp}>
                  {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                </Text>
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
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  bannerLeft: {
    marginBottom: 8,
  },
  bannerTagRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  bannerTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countBadgeText: {
    color: colors.signalRed,
    fontSize: 10,
    fontWeight: '800',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  actionButtonsRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8,
  },
  syncBtn: {
    maxWidth: '100%',
    backgroundColor: colors.signalRed,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncBtnDark: {
    backgroundColor: colors.graphite,
  },
  syncBtnText: {
    flexShrink: 1,
    color: '#ffffff',
    fontSize: 12,
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
  logsList: {
    flex: 1,
  },
  logsListContent: {
    padding: 12,
    gap: 12,
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
  logCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    ...shadows.sm,
  },
  logCardHeader: {
    flexWrap: 'wrap',
    gap: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logTypeRow: {
    flex: 1,
  },
  feedType: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  windowText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
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
  metricsGrid: {
    flexWrap: 'wrap',
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  metricItem: {
    flexBasis: 100,
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    textAlign: 'center',
    fontSize: 8,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  logNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
});

