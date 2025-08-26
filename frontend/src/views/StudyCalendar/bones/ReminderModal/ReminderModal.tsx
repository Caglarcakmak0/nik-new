import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button, Select, message, List, Tag, Spin } from 'antd';
import ReactMarkdown from 'react-markdown';
// @ts-ignore - type declarations not bundled
import remarkGfm from 'remark-gfm';
import { Dayjs } from 'dayjs';
import { useTheme } from '../../../../contexts/ThemeContext';
import { createReminder, updateReminder, deleteReminder, getReminders } from '../../../../services/api';
import { ReminderItem, StudySession } from '../../types';

interface ReminderModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Dayjs | null;
  sessions: StudySession[];
}

const ReminderModal: React.FC<ReminderModalProps> = ({ 
  open, 
  onClose, 
  selectedDate, 
  sessions 
}) => {
  const { isDark } = useTheme();
  const [newReminderText, setNewReminderText] = useState('');
  const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null);
  const [reminderSubmitting, setReminderSubmitting] = useState(false);
  const [newReminderSubject, setNewReminderSubject] = useState<string | undefined>(undefined);
  const [dayReminders, setDayReminders] = useState<ReminderItem[]>([]);
  const [loadingDayReminders, setLoadingDayReminders] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Markdown editing helpers
  const wrapSelection = (prefix: string, suffix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = newReminderText.substring(0, start);
    const selected = newReminderText.substring(start, end) || 'metin';
    const after = newReminderText.substring(end);
    const next = before + prefix + selected + suffix + after;
    setNewReminderText(next);
    setTimeout(() => {
      el.focus();
      el.selectionStart = before.length + prefix.length;
      el.selectionEnd = before.length + prefix.length + selected.length;
    }, 0);
  };

  const prependLine = (insertion: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const text = newReminderText;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const updated = text.slice(0, lineStart) + insertion + text.slice(lineStart);
    setNewReminderText(updated);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + insertion.length;
    }, 0);
  };

  const insertTemplate = useCallback((template: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const text = newReminderText;
    const updated = text.slice(0, start) + template + text.slice(start);
    setNewReminderText(updated);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + template.length;
    }, 0);
  }, [newReminderText]);

  // Günün hatırlatmalarını getir
  const fetchDayReminders = useCallback(async () => {
    if (!selectedDate) return;
    try {
      setLoadingDayReminders(true);
      const from = selectedDate.startOf('day').toISOString();
      const to = selectedDate.endOf('day').toISOString();
      const res = await getReminders({ from, to });
      setDayReminders(res?.data || []);
    } catch {
      setDayReminders([]);
    } finally {
      setLoadingDayReminders(false);
    }
  }, [selectedDate]);

  // Modal açıldığında veya tarih değişince mevcut hatırlatmaları yükle
  useEffect(() => {
    if (open && selectedDate) {
      fetchDayReminders();
      // Yeni tarih seçildiğinde form temizle
      setEditingReminder(null);
      setNewReminderText('');
      setNewReminderSubject(undefined);
    }
  }, [open, selectedDate, fetchDayReminders]);

  const startEdit = (rem: ReminderItem) => {
    setEditingReminder(rem);
    setNewReminderText(rem.text || '');
    setNewReminderSubject(rem.subject || undefined);
    // Scroll textarea into view slight delay
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSaveReminder = async () => {
    if (!newReminderText.trim()) {
      message.warning('Hatırlatma metni boş olamaz');
      return;
    }
    if (!selectedDate) return;

    try {
      setReminderSubmitting(true);
      const payload = {
        date: selectedDate.startOf('day').toISOString(),
        text: newReminderText.trim(),
        subject: newReminderSubject || undefined,
        isDone: false
      };

      if (editingReminder) {
        await updateReminder(editingReminder._id, payload);
        message.success('Hatırlatma güncellendi');
      } else {
        await createReminder(payload);
        message.success('Hatırlatma eklendi');
      }

      // Listeyi güncelle ve formu temizle (modal açık kalıyor)
      await fetchDayReminders();
      setNewReminderText('');
      setNewReminderSubject(undefined);
      setEditingReminder(null);
    } catch (e: any) {
      message.error(e?.message || 'Hatırlatma kaydedilemedi');
    } finally {
      setReminderSubmitting(false);
    }
  };

  const handleDeleteReminder = async () => {
    if (!editingReminder) return;
    try {
      setReminderSubmitting(true);
  await deleteReminder(editingReminder._id);
  message.success('Hatırlatma silindi');
  await fetchDayReminders();
  setEditingReminder(null);
  setNewReminderText('');
  setNewReminderSubject(undefined);
    } catch (e: any) {
      message.error(e?.message || 'Hatırlatma silinemedi');
    } finally {
      setReminderSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSaveReminder}
      okText={editingReminder ? 'Güncelle' : 'Kaydet'}
      confirmLoading={reminderSubmitting}
      title={selectedDate ? `${selectedDate.format('DD MMMM YYYY')} - Hatırlatma` : 'Hatırlatma'}
      styles={{ body: { paddingTop: 8, paddingBottom: 8 } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Günün mevcut hatırlatmaları */}
        <div style={{
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          borderRadius: 8,
          padding: 8,
          background: isDark ? '#0f172a' : '#f8fafc'
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Mevcut Notlar</span>
            {loadingDayReminders && <Spin size="small" />}
          </div>
          {dayReminders.length === 0 && !loadingDayReminders && (
            <div style={{ fontSize: 12, color: isDark ? '#64748b' : '#64748b' }}>Bu günde kayıtlı not yok.</div>
          )}
          {dayReminders.length > 0 && (
            <List
              size="small"
              dataSource={dayReminders}
              style={{ maxHeight: 160, overflowY: 'auto' }}
              renderItem={(item) => {
                const active = editingReminder?._id === item._id;
                return (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      background: active ? (isDark ? '#1e293b' : '#e2e8f0') : 'transparent',
                      borderRadius: 6,
                      padding: '4px 8px'
                    }}
                    onClick={() => startEdit(item)}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {item.subject && <Tag color="blue" style={{ marginRight: 0 }}>{item.subject}</Tag>}
                          <span style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#e2e8f0' : '#111827' }}>
                            {(item.text || '').split('\n')[0].slice(0, 60)}{(item.text || '').length > 60 ? '…' : ''}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#64748b' }}>{item.isDone ? '✓' : ''}</span>
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Select
            allowClear
            placeholder="Ders / Etiket (opsiyonel)"
            size="small"
            value={newReminderSubject}
            onChange={(v) => setNewReminderSubject(v)}
            options={Array.from(new Set(sessions.map(s => s.subject))).slice(0, 20).map(s => ({ value: s, label: s }))}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 4, 
              background: isDark ? '#1e293b' : '#f1f5f9', 
              padding: 6, 
              borderRadius: 8, 
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0' 
            }}>
              {[
                { label: 'B', title: 'Kalın', apply: () => wrapSelection('**', '**') },
                { label: 'İ', title: 'İtalik', apply: () => wrapSelection('*', '*') },
                { label: 'H1', title: 'Başlık 1', apply: () => prependLine('# ') },
                { label: 'H2', title: 'Başlık 2', apply: () => prependLine('## ') },
                { label: '- •', title: 'Liste', apply: () => prependLine('- ') },
                { label: '1.', title: 'Numaralı', apply: () => prependLine('1. ') },
                { label: '[ ]', title: 'Görev', apply: () => prependLine('- [ ] ') },
                { label: 'Kod', title: 'Kod Blok', apply: () => wrapSelection('\n```\n', '\n```\n') },
                { label: 'Link', title: 'Bağlantı', apply: () => wrapSelection('[', '](https://)') },
                { label: 'Tablo', title: 'Tablo Şablonu', apply: () => insertTemplate('\n| Başlık | Başlık2 |\n| ------ | ------- |\n| Hücre  | Hücre   |\n') },
                { label: 'Alıntı', title: 'Alıntı', apply: () => prependLine('> ') },
                { label: 'ÖNEM', title: 'Önemli Etiket', apply: () => prependLine('> **ÖNEMLİ:** ') },
              ].map(btn => (
                <Button 
                  key={btn.label} 
                  size="small" 
                  onClick={btn.apply} 
                  style={{ fontWeight: 600 }} 
                  title={btn.title}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
            <textarea
              value={newReminderText}
              onChange={e => setNewReminderText(e.target.value)}
              placeholder={editingReminder ? 'Hatırlatmayı düzenle...' : 'Markdown destekli not yazın (Örn: **Matematik** tekrar)'}
              maxLength={5000}
              ref={textareaRef}
              style={{ 
                width: '100%', 
                minHeight: 120, 
                padding: 10, 
                fontFamily: 'inherit', 
                borderRadius: 8, 
                border: '1px solid #d1d5db', 
                resize: 'vertical', 
                background: isDark ? '#1f2937' : '#fff', 
                color: isDark ? '#f1f5f9' : '#111827' 
              }}
            />
            {newReminderText.trim() && (
              <div style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: 8, 
                padding: 8, 
                background: isDark ? '#0f172a' : '#f8fafc', 
                maxHeight: 180, 
                overflowY: 'auto' 
              }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: (props: any) => <h1 style={{ fontSize: 18, margin: '8px 0' }} {...props} />,
                    h2: (props: any) => <h2 style={{ fontSize: 16, margin: '8px 0' }} {...props} />,
                    code: ({ inline, children, ...props }: any) => inline ? (
                      <code style={{ 
                        background: isDark ? '#1e293b' : '#e2e8f0', 
                        padding: '2px 4px', 
                        borderRadius: 4 
                      }} {...props}>
                        {children}
                      </code>
                    ) : (
                      <pre style={{ 
                        background: isDark ? '#1e293b' : '#e2e8f0', 
                        padding: 10, 
                        borderRadius: 8, 
                        overflow: 'auto' 
                      }} {...props}>
                        <code>{children}</code>
                      </pre>
                    )
                  }}
                >
                  {newReminderText}
                </ReactMarkdown>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>
              {newReminderText.length}/5000
            </div>
            {editingReminder && (
              <Button 
                onClick={() => { 
                  setEditingReminder(null); 
                  setNewReminderText(''); 
                  setNewReminderSubject(undefined); 
                }} 
                size="small" 
                type="default"
              >
                Yeni Oluştur
              </Button>
            )}
          </div>
          {editingReminder && (
            <Button danger onClick={handleDeleteReminder} disabled={reminderSubmitting}>
              Sil
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ReminderModal;
