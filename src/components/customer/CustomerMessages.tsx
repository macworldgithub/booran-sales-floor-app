import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Send, MessageSquare, AlertCircle, RefreshCw, Paperclip } from 'lucide-react-native';
import { Lead, CustomerMessage } from '../../types';
import { customerMessageApi } from '../../services/api';
import { colors } from '../../theme/theme';

interface CustomerMessagesProps {
  lead: Lead;
  disabled?: boolean;
}

export function CustomerMessages({ lead, disabled = false }: CustomerMessagesProps) {
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [smsAvailable, setSmsAvailable] = useState(true);

  const phone = lead.phone || lead.customer_phone || '';

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await customerMessageApi.history(lead._id);
      if (res.success && res.data) {
        setMessages(res.data.messages || []);
        setSmsAvailable(res.data.sms_available ?? true);
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load message history.');
    } finally {
      setIsLoading(false);
    }
  }, [lead._id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSend = async () => {
    if (!messageText.trim() || isSending || !phone) return;
    setIsSending(true);
    setError(null);
    try {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const res = await customerMessageApi.send(lead._id, {
        body: messageText.trim(),
        media_ids: [],
        request_id: requestId,
      });
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setMessageText('');
      } else {
        throw new Error(res.error || 'Failed to send SMS.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to send SMS.');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return { text: 'Delivered', color: '#15803d', bg: '#dcfce7' };
      case 'sent':
        return { text: 'Sent', color: '#2563eb', bg: '#dbeafe' };
      case 'failed':
        return { text: 'Failed', color: '#dc2626', bg: '#fee2e2' };
      case 'received':
        return { text: 'Received', color: '#475569', bg: '#e2e8f0' };
      default:
        return { text: status, color: '#d97706', bg: '#fef3c7' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageSquare size={16} color={colors.textPrimary} />
          <Text style={styles.headerTitle}>Customer SMS Timeline</Text>
        </View>
        <TouchableOpacity onPress={loadHistory} disabled={isLoading} style={styles.refreshButton}>
          <RefreshCw size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <ScrollView
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        nestedScrollEnabled
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.signalRed} />
            <Text style={styles.statusText}>Loading messages...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={14} color={colors.danger} />
            <Text style={styles.errorBoxText}>{error}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No SMS conversations yet with {lead.name}.</Text>
            <Text style={styles.emptySubtext}>
              {phone ? `Send an SMS to ${phone} below.` : 'Add a mobile number to begin SMS communication.'}
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => {
            const isOutbound = msg.direction !== 'inbound';
            const statusInfo = getStatusBadge(msg.status);

            return (
              <View
                key={msg.id || index}
                style={[
                  styles.messageRow,
                  isOutbound ? styles.messageRowOutbound : styles.messageRowInbound,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isOutbound ? styles.bubbleOutbound : styles.bubbleInbound,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageBody,
                      isOutbound ? styles.bodyOutbound : styles.bodyInbound,
                    ]}
                  >
                    {msg.body}
                  </Text>

                  <View style={styles.messageMeta}>
                    <Text
                      style={[
                        styles.messageTime,
                        isOutbound ? styles.timeOutbound : styles.timeInbound,
                      ]}
                    >
                      {msg.author || (isOutbound ? 'Sales Staff' : 'Customer')} ·{' '}
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>

                    {isOutbound && (
                      <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                          {statusInfo.text}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Composer Input */}
      {phone ? (
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={`Message to ${phone}...`}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={600}
            editable={!disabled && smsAvailable}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!messageText.trim() || isSending || disabled || !smsAvailable}
            style={[
              styles.sendButton,
              (!messageText.trim() || isSending || disabled || !smsAvailable) && styles.sendButtonDisabled,
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={16} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noPhoneNotice}>
          <Text style={styles.noPhoneText}>Enter customer mobile number above to enable SMS.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'uppercase',
  },
  refreshButton: {
    padding: 4,
  },
  messagesContainer: {
    maxHeight: 220,
    minHeight: 120,
  },
  messagesContent: {
    padding: 12,
    gap: 8,
  },
  centerContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  errorBoxText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  messageRowOutbound: {
    justifyContent: 'flex-end',
  },
  messageRowInbound: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '82%',
    padding: 10,
    borderRadius: 12,
  },
  bubbleOutbound: {
    backgroundColor: '#1e293b',
    borderBottomRightRadius: 2,
  },
  bubbleInbound: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 2,
  },
  messageBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  bodyOutbound: {
    color: '#ffffff',
  },
  bodyInbound: {
    color: colors.textPrimary,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  timeOutbound: {
    color: '#94a3b8',
  },
  timeInbound: {
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  composerInput: {
    flex: 1,
    maxHeight: 70,
    minHeight: 36,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.textPrimary,
    backgroundColor: '#f8fafc',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.signalRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  noPhoneNotice: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  noPhoneText: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});

