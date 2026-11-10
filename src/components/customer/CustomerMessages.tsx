import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  AppState,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Send, MessageSquare, AlertCircle, RefreshCw, Paperclip } from 'lucide-react-native';
import { Lead, CustomerMessage, CustomerMedia } from '../../types';
import { customerMessageApi } from '../../services/api';
import { uploadMedia } from '../../services/media';
import { Pagination } from '../common/Pagination';
import { WorkflowButton, workflowStyles } from '../common/WorkflowControls';
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
  const [mediaAvailable, setMediaAvailable] = useState(false);
  const [recordingAvailable, setRecordingAvailable] = useState(false);
  const [attachments, setAttachments] = useState<CustomerMedia[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<CustomerMedia[]>([]);
  const [showMedia, setShowMedia] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [warning, setWarning] = useState('');
  const [aiEnabled, setAiEnabled] = useState(Boolean(lead.ai_enabled));
  const [resumeHours, setResumeHours] = useState(lead.ai_resume_hours || 0);
  const [drafting, setDrafting] = useState(false);
  const [confirmingSend, setConfirmingSend] = useState(false);
  const attempt = useRef<{ body: string; media_ids: string[]; request_id: string } | null>(null);
  const uploadPending = useRef(false);
  const loadVersion = useRef(0);

  const phone = lead.phone || lead.customer_phone || '';

  const loadHistory = useCallback(async (background = false) => {
    const version = ++loadVersion.current;
    if (!background) setIsLoading(true);
    try {
      const res = await customerMessageApi.history(lead._id, page);
      if (version !== loadVersion.current) return;
      if (res.success && res.data) {
        setMessages(res.data.messages || []);
        setSmsAvailable(res.data.sms_available ?? true);
        setMediaAvailable(res.data.media_available);
        setRecordingAvailable(Boolean(res.data.recording_available));
        setAiEnabled(Boolean(res.data.ai_enabled));
        setResumeHours(res.data.ai_resume_hours || 0);
        setWarning(res.data.history_warning || '');
        setPages(Math.max(1, res.pagination?.totalPages ?? 1));
        setTotal(res.pagination?.total ?? res.data.messages.length);
      }
    } catch (err: any) {
      if (version === loadVersion.current) setWarning(err?.message || 'Unable to load message history.');
    } finally {
      if (version === loadVersion.current) setIsLoading(false);
    }
  }, [lead._id, page]);

  useEffect(() => {
    loadHistory();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') loadHistory(true);
    }, 8000);
    return () => { clearInterval(timer); loadVersion.current++; };
  }, [loadHistory]);

  useEffect(() => {
    if (!showMedia) return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await customerMessageApi.media(lead._id);
        if (active && result.data) setMediaLibrary(result.data);
      } catch (reason) {
        if (active) setError((reason as Error).message);
      }
    };
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [lead._id, showMedia]);

  const chooseMedia = async (recorded = false) => {
    if (uploadPending.current || attempt.current || disabled || attachments.length >= 5) return;
    uploadPending.current = true;
    setUploading(true);
    setError(null);
    try {
      if (recorded && !(await ImagePicker.requestCameraPermissionsAsync()).granted) throw new Error('Allow camera access to record a customer video.');
      const result = recorded
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 180, quality: 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
      if (!result.canceled) {
        const media = await uploadMedia(lead._id, result.assets[0], undefined, recorded);
        setMediaLibrary(previous => [media, ...previous.filter(item => item.id !== media.id)]);
        if (!media.status || media.status === 'ready') setAttachments(previous => [...previous, media]);
        if (recorded || media.status === 'processing' || media.status === 'rendering') setShowMedia(true);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      uploadPending.current = false;
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !attachments.length) || isSending || isUploading || !phone) return;
    setIsSending(true);
    setError(null);
    try {
      const requestId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
        const nibble = Math.floor(Math.random() * 16);
        return (char === 'x' ? nibble : (nibble & 3) | 8).toString(16);
      });
      attempt.current ??= {
        body: messageText.trim(),
        media_ids: attachments.map(media => media.id),
        request_id: requestId,
      };
      const res = await customerMessageApi.send(lead._id, attempt.current);
      if (res.success && res.data) {
        attempt.current = null;
        setConfirmingSend(false);
        if (['unknown', 'failed'].includes(res.data.status)) setError(res.data.error || 'The provider could not confirm delivery.');
        setMessageText('');
        setAttachments([]);
        if (page === 1) await loadHistory(true); else setPage(1);
      } else {
        throw new Error(res.error || 'Failed to send SMS.');
      }
    } catch (err: any) {
      if ([400, 403, 404, 409].includes(err?.status)) attempt.current = null;
      setConfirmingSend(Boolean(attempt.current));
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
  const latestInbound = page === 1 ? messages.find(item => item.direction === 'inbound') : undefined;
  const setDraftPolicy = async (enabled: boolean, hours = 0) => {
    setDrafting(true); setError(null);
    try {
      const result = await customerMessageApi.setAi(lead._id, enabled, hours);
      setAiEnabled(Boolean(result.data?.enabled));
      setResumeHours(result.data?.resumeHours || 0);
    } catch (reason) { setError((reason as Error).message); }
    finally { setDrafting(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MessageSquare size={16} color={colors.textPrimary} />
          <Text style={styles.headerTitle}>Customer SMS Timeline</Text>
        </View>
        <TouchableOpacity onPress={() => loadHistory()} disabled={isLoading} style={styles.refreshButton}>
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
                  {msg.attachments?.map(media => (
                    <TouchableOpacity key={media.id} onPress={() => Linking.openURL(media.url).catch(() => setError('Unable to open the attachment.'))}>
                      <Text style={isOutbound ? styles.bodyOutbound : styles.bodyInbound}>{media.name} ↗</Text>
                    </TouchableOpacity>
                  ))}

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
      {pages > 1 && <Pagination currentPage={page} totalPages={pages} totalItems={total} pageSize={20} onPageChange={setPage} />}
      {(error || warning) && <View style={styles.errorBox}>
        <AlertCircle size={14} color={colors.danger} />
        <Text style={styles.errorBoxText}>{error || warning}</Text>
      </View>}
      {attachments.map(media => (
        <TouchableOpacity key={media.id} disabled={isSending || confirmingSend} onPress={() => setAttachments(items => items.filter(item => item.id !== media.id))}>
          <Text style={styles.statusText}>{media.name} · Remove</Text>
        </TouchableOpacity>
      ))}
      {mediaAvailable && <View style={{ paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}>
        <View style={workflowStyles.row}>
          {recordingAvailable && <WorkflowButton label={isUploading ? 'Uploading…' : 'Record customer video'} disabled={disabled || isUploading || isSending || confirmingSend || attachments.length >= 5} onPress={() => void chooseMedia(true)} />}
          <WorkflowButton label={showMedia ? 'Hide customer uploads' : 'Customer uploads'} onPress={() => setShowMedia(value => !value)} />
        </View>
        {!recordingAvailable && lead.dealership?.toLowerCase() === 'south morang hyundai' && <Text style={workflowStyles.text}>Set the dealership’s video contact details to enable branded recording.</Text>}
        {showMedia && mediaLibrary.map(media => <View key={media.id} style={workflowStyles.row}>
          <Text style={workflowStyles.text}>{media.name}{media.status === 'processing_failed' ? ` · ${media.processing_error || 'Branding failed'}` :
            media.status && media.status !== 'ready' ? ' · Adding dealership end card…' :
            media.content_type.startsWith('video/') ? ` · ${media.views ?? 0} views · ${media.reviews ?? 0} reviews` : ''}</Text>
          {media.status === 'processing_failed' && <WorkflowButton label="Retry branding" onPress={async () => {
            try {
              const result = await customerMessageApi.completeMedia(lead._id, media.id);
              if (result.data) setMediaLibrary(items => items.map(item => item.id === media.id ? result.data! : item));
            } catch (reason) { setError((reason as Error).message); }
          }} />}
          {(!media.status || media.status === 'ready') && <>
            <WorkflowButton label="Open link" onPress={() => Linking.openURL(media.url).catch(() => setError('Unable to open the attachment.'))} />
            <WorkflowButton label="Attach" disabled={isSending || isUploading || confirmingSend || attachments.length >= 5 || attachments.some(item => item.id === media.id)} onPress={() => setAttachments(items => [...items, media])} />
          </>}
        </View>)}
      </View>}
      <View style={[workflowStyles.row, { paddingHorizontal: 10, paddingVertical: 6 }]}>
        <WorkflowButton label={aiEnabled || resumeHours ? 'Pause AI drafts' : 'Enable AI drafts'} disabled={isSending || drafting || confirmingSend}
          onPress={() => setDraftPolicy(!(aiEnabled || resumeHours))} />
        {aiEnabled && <WorkflowButton label={resumeHours ? 'Keep drafts paused after staff reply' : 'Resume drafts 24h after staff reply'}
          disabled={isSending || drafting || confirmingSend} onPress={() => setDraftPolicy(true, resumeHours ? 0 : 24)} />}
        {!aiEnabled && !!resumeHours && <Text style={workflowStyles.text}>Staff takeover. Drafting will resume after the inactivity period.</Text>}
        {aiEnabled && <WorkflowButton label="Draft reply for review" disabled={isSending || drafting || !latestInbound || confirmingSend || !!messageText} onPress={async () => {
          if (!latestInbound) return;
          setDrafting(true); setError(null);
          try {
            const result = await customerMessageApi.draft(lead._id, latestInbound.body.slice(0, 1000));
            if (result.data) setMessageText(result.data.draft);
          } catch (reason) { setError((reason as Error).message); }
          finally { setDrafting(false); }
        }} />}
      </View>

      {/* Composer Input */}
      {phone ? (
        <View style={styles.composer}>
          {mediaAvailable && <TouchableOpacity accessibilityLabel="Attach photo or video" disabled={disabled || isUploading || isSending || attachments.length >= 5 || confirmingSend} onPress={() => void chooseMedia()}>
            {isUploading ? <ActivityIndicator /> : <Paperclip size={18} color={colors.textSecondary} />}
          </TouchableOpacity>}
          <TextInput
            style={styles.composerInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder={`Message to ${phone}...`}
            placeholderTextColor="#94a3b8"
            multiline
            maxLength={600}
            editable={!disabled && smsAvailable && !isSending && !drafting && !confirmingSend}
          />
          <TouchableOpacity
            onPress={handleSend}
            accessibilityLabel={confirmingSend ? 'Check send result' : 'Send SMS'}
            disabled={(!messageText.trim() && !attachments.length) || isUploading || isSending || disabled || !smsAvailable}
            style={[
              styles.sendButton,
              ((!messageText.trim() && !attachments.length) || isUploading || isSending || disabled || !smsAvailable) && styles.sendButtonDisabled,
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

