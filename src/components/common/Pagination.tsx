import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native';
import { colors } from '../../theme/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemName = 'records',
  isLoading = false,
}: PaginationProps) {
  const validCurrentPage = Math.max(1, Math.min(currentPage || 1, Math.max(1, totalPages || 1)));
  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          Showing <Text style={styles.boldText}>{startItem}–{endItem}</Text> of{' '}
          <Text style={styles.boldText}>{totalItems.toLocaleString()}</Text> {itemName}
        </Text>
        {isLoading && <ActivityIndicator size="small" color={colors.signalRed} style={{ marginLeft: 6 }} />}
      </View>

      {totalPages > 1 && (
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={() => onPageChange(1)}
            disabled={validCurrentPage === 1 || isLoading}
            style={[styles.button, validCurrentPage === 1 && styles.buttonDisabled]}
          >
            <ChevronsLeft size={16} color={validCurrentPage === 1 ? colors.textMuted : colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onPageChange(Math.max(1, validCurrentPage - 1))}
            disabled={validCurrentPage === 1 || isLoading}
            style={[styles.button, validCurrentPage === 1 && styles.buttonDisabled]}
          >
            <ChevronLeft size={18} color={validCurrentPage === 1 ? colors.textMuted : colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>
              Page <Text style={styles.pageTextActive}>{validCurrentPage}</Text> of {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => onPageChange(Math.min(totalPages, validCurrentPage + 1))}
            disabled={validCurrentPage >= totalPages || isLoading}
            style={[styles.button, validCurrentPage >= totalPages && styles.buttonDisabled]}
          >
            <ChevronRight size={18} color={validCurrentPage >= totalPages ? colors.textMuted : colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onPageChange(totalPages)}
            disabled={validCurrentPage >= totalPages || isLoading}
            style={[styles.button, validCurrentPage >= totalPages && styles.buttonDisabled]}
          >
            <ChevronsRight size={16} color={validCurrentPage >= totalPages ? colors.textMuted : colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.35,
    backgroundColor: '#f8fafc',
  },
  pageIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.appCanvas,
  },
  pageText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  pageTextActive: {
    fontWeight: '800',
    color: colors.signalRed,
  },
});

