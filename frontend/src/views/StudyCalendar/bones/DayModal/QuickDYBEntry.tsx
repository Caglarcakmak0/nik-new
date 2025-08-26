import React, { useState, useEffect } from 'react';
import { Space, Spin, Button, Input, message } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useTheme } from '../../../../contexts/ThemeContext';
import { StudySession, DayData } from '../../types';
import { apiRequest } from '../../../../services/api';

interface QuickDYBEntryProps {
  dayModalDate: Dayjs;
  selectedDayData: DayData;
  sessions: StudySession[];
}

const QuickDYBEntry: React.FC<QuickDYBEntryProps> = ({ dayModalDate, selectedDayData, sessions }) => {
  const { isDark } = useTheme();
  const [dayPlan, setDayPlan] = useState<any | null>(null);
  const [dayPlanLoading, setDayPlanLoading] = useState(false);
  const [editingSubjectIndex, setEditingSubjectIndex] = useState<number | null>(null);
  const [subjectNameDraft, setSubjectNameDraft] = useState('');
  const [tempDYB, setTempDYB] = useState<Record<string, { correct: number; wrong: number; blank: number }>>({});
  const [autoPlanDates, setAutoPlanDates] = useState<Set<string>>(new Set());

  const textPrimary = isDark ? '#f1f5f9' : '#1f2937';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';

  // Fetch daily plan for selected day
  const fetchDayPlan = async (date: Dayjs) => {
    try {
      setDayPlanLoading(true);
      const iso = date.startOf('day').toISOString();
      const res = await apiRequest(`/daily-plans?date=${iso}`, { method: 'GET' });
      let plan = null as any;
      if (Array.isArray(res?.data)) {
        const targetDay = date.format('YYYY-MM-DD');
        plan = res.data.find((p: any) => p.date && dayjs(p.date).format('YYYY-MM-DD') === targetDay) || res.data[0] || null;
      } else if (res?.data) {
        plan = res.data;
      }
      setDayPlan(plan);
    } catch {
      setDayPlan(null);
    } finally {
      setDayPlanLoading(false);
    }
  };

  const createQuickFreeformPlan = async (date: Dayjs) => {
    try {
      setDayPlanLoading(true);
      const payload = {
        date: date.startOf('day').toISOString(),
        title: `Hızlı Plan - ${date.format('DD/MM/YYYY')}`,
        source: 'self',
        status: 'active',
        subjects: [
          {
            subject: 'genel_tekrar',
            description: 'Freeform hızlı DYB girişi için otomatik oluşturuldu',
            targetTime: 5,
            priority: 5,
            status: 'not_started'
          }
        ]
      };
      const res = await apiRequest('/daily-plans', { method: 'POST', body: JSON.stringify(payload) });
      setDayPlan(res?.data || null);
      message.success('Hızlı freeform plan oluşturuldu');
    } catch (e: any) {
      message.error(e?.message || 'Hızlı plan oluşturulamadı');
    } finally {
      setDayPlanLoading(false);
    }
  };

  const createPlanFromSessions = async (date: Dayjs, sessions: any[]) => {
    try {
      if (!sessions || sessions.length === 0) return;
      setDayPlanLoading(true);
      const subjectGroups: Record<string, { totalTime: number }> = {};
      sessions.forEach(s => {
        if (!subjectGroups[s.subject]) subjectGroups[s.subject] = { totalTime: 0 };
        subjectGroups[s.subject].totalTime += s.duration || 0;
      });
      const subjects = Object.entries(subjectGroups).map(([subject, info]) => ({
        subject,
        description: 'Oturumlardan oluşturuldu',
        targetTime: Math.max(5, info.totalTime || 0),
        priority: 5,
        status: 'not_started'
      }));
      const payload = {
        date: date.startOf('day').toISOString(),
        title: `Oturumlardan Plan - ${date.format('DD/MM/YYYY')}`,
        source: 'self',
        status: 'active',
        subjects
      };
      const res = await apiRequest('/daily-plans', { method: 'POST', body: JSON.stringify(payload) });
      setDayPlan(res?.data || null);
      message.success('Oturumlardan plan oluşturuldu');
    } catch (e: any) {
      console.error('createPlanFromSessions error', e);
      message.error((e?.message) ? `Plan oluşturulamadı: ${e.message}` : 'Plan oluşturulamadı');
    } finally {
      setDayPlanLoading(false);
    }
  };

  const updateDYB = async (subjectIndex: number, field: 'correctAnswers' | 'wrongAnswers' | 'blankAnswers', value: number) => {
    if (!dayPlan || !dayPlan._id) return;
    const safeVal = Math.max(0, value || 0);
    setDayPlan((prev: any) => {
      if (!prev) return prev;
      const copy = { ...prev, subjects: prev.subjects.map((s: any, i: number) => i === subjectIndex ? { ...s, [field]: safeVal } : s) };
      return copy;
    });
    try {
      await apiRequest(`/daily-plans/${dayPlan._id}/subjects/${subjectIndex}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: safeVal })
      });
    } catch {/* silently ignore */}
  };

  const startEditSubjectName = (index: number, currentSub: any) => {
    setEditingSubjectIndex(index);
    const currentName = (currentSub.description && currentSub.description.trim()) || currentSub.displayName || currentSub.subject;
    setSubjectNameDraft(currentName);
  };

  const cancelEditSubjectName = () => {
    setEditingSubjectIndex(null);
    setSubjectNameDraft('');
  };

  const saveSubjectName = async () => {
    if (editingSubjectIndex === null || !dayPlan) return;
    const idx = editingSubjectIndex;
    const trimmed = subjectNameDraft.trim();
    if (!trimmed) { message.warning('Ders adı boş olamaz'); return; }
    try {
      setDayPlanLoading(true);
      const updatedSubjects = dayPlan.subjects.map((s: any, i: number) => i === idx ? { ...s, description: trimmed } : s);
      const res = await apiRequest(`/daily-plans/${dayPlan._id}`, { method: 'PUT', body: JSON.stringify({ subjects: updatedSubjects }) });
      setDayPlan(res?.data || { ...dayPlan, subjects: updatedSubjects });
      message.success('Ders adı güncellendi');
      cancelEditSubjectName();
    } catch (e: any) {
      message.error(e?.message || 'Ders adı güncellenemedi');
    } finally { setDayPlanLoading(false); }
  };

  const persistTempDYBAsPlan = async () => {
    if (dayPlan) return;
    if (!dayModalDate || !selectedDayData?.sessions?.length) return;
    try {
      setDayPlanLoading(true);
      const subjects = Object.keys(tempDYB).map(sub => ({
        subject: sub,
        description: 'Geçici DYB planı',
        targetTime: 5,
        priority: 5,
        status: 'not_started',
        correctAnswers: tempDYB[sub].correct,
        wrongAnswers: tempDYB[sub].wrong,
        blankAnswers: tempDYB[sub].blank,
        completedQuestions: tempDYB[sub].correct + tempDYB[sub].wrong + tempDYB[sub].blank
      }));
      const payload = {
        date: dayModalDate.startOf('day').toISOString(),
        title: `DYB Planı - ${dayModalDate.format('DD/MM/YYYY')}`,
        source: 'self',
        status: 'active',
        subjects
      };
      const res = await apiRequest('/daily-plans', { method: 'POST', body: JSON.stringify(payload) });
      setDayPlan(res?.data || null);
      message.success('DYB planı oluşturuldu');
    } catch (e: any) {
      console.error('persistTempDYBAsPlan error', e);
      message.error(e?.message || 'DYB planı oluşturulamadı');
    } finally { setDayPlanLoading(false); }
  };

  // Oturum var ama plan yoksa DYB için otomatik plan oluştur
  useEffect(() => {
    const key = dayModalDate.format('YYYY-MM-DD');
    if (dayPlan) return;
    if (!selectedDayData || !selectedDayData.sessions || selectedDayData.sessions.length === 0) return;
    if (autoPlanDates.has(key)) return;
    setAutoPlanDates(prev => new Set(prev).add(key));
    createPlanFromSessions(dayModalDate, selectedDayData.sessions);
  }, [dayPlan, selectedDayData, dayModalDate]);

  // Plan yoksa ve oturumlar varsa geçici DYB state hazırla
  useEffect(() => {
    if (dayPlan) return;
    if (!selectedDayData?.sessions?.length) return;
    const uniqueSubjects = Array.from(new Set(selectedDayData.sessions.map((s: any) => s.subject)));
    setTempDYB(prev => {
      const copy = { ...prev };
      uniqueSubjects.forEach(sub => { if (!copy[sub]) copy[sub] = { correct: 0, wrong: 0, blank: 0 }; });
      Object.keys(copy).forEach(k => { if (!uniqueSubjects.includes(k)) delete copy[k]; });
      return copy;
    });
  }, [selectedDayData, dayPlan]);

  useEffect(() => {
    fetchDayPlan(dayModalDate);
  }, [dayModalDate]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Space style={{ fontWeight: 600, fontSize: 15, color: textPrimary }}>
          <BookOutlined style={{ color: '#0ea5e9' }} /> Hızlı D/Y/B Girişi
        </Space>
        {dayPlanLoading && <Spin size="small" />}
      </div>

      {dayPlan && dayPlan.subjects && dayPlan.subjects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ 
            maxHeight: 240, 
            overflowY: 'auto', 
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
            borderRadius: 12, 
            padding: 8, 
            background: isDark ? '#0f172a' : '#ffffff' 
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Ders</th>
                  <th style={{ padding: '6px 4px' }}>Doğru</th>
                  <th style={{ padding: '6px 4px' }}>Yanlış</th>
                  <th style={{ padding: '6px 4px' }}>Boş</th>
                  <th style={{ padding: '6px 4px' }}>Net</th>
                  <th style={{ padding: '6px 4px' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {dayPlan.subjects.map((sub: any, idx: number) => {
                  const correct = sub.correctAnswers || 0;
                  const wrong = sub.wrongAnswers || 0;
                  const blank = sub.blankAnswers || 0;
                  const net = Math.max(correct - wrong / 4, 0).toFixed(2);
                  const total = correct + wrong + blank;
                  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                  return (
                    <tr key={sub.subject || idx} style={{ borderBottom: '1px solid ' + (isDark ? '#334155' : '#e2e8f0') }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>
                        {editingSubjectIndex === idx ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <Input 
                              size="small" 
                              autoFocus 
                              value={subjectNameDraft} 
                              onChange={e => setSubjectNameDraft(e.target.value)} 
                              style={{ width: 140 }} 
                            />
                            <Space size={2}>
                              <Button size="small" type="primary" onClick={saveSubjectName}>Kaydet</Button>
                              <Button size="small" onClick={cancelEditSubjectName}>İptal</Button>
                            </Space>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{(sub.description && sub.description.trim()) || sub.displayName || sub.subject}</span>
                            <Button 
                              size="small" 
                              type="text" 
                              style={{ padding: '0 4px', height: 22 }} 
                              onClick={() => startEditSubjectName(idx, sub)}
                            >
                              Düzenle
                            </Button>
                          </div>
                        )}
                      </td>
                      {[
                        { key: 'correctAnswers', val: correct, color: '#16a34a' },
                        { key: 'wrongAnswers', val: wrong, color: '#dc2626' },
                        { key: 'blankAnswers', val: blank, color: '#64748b' }
                      ].map(field => (
                        <td key={field.key} style={{ padding: '4px 4px' }}>
                          <input
                            type="number"
                            min={0}
                            value={field.val}
                            onChange={e => updateDYB(idx, field.key as any, Number(e.target.value))}
                            style={{ 
                              width: 60, 
                              padding: '2px 4px', 
                              border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), 
                              borderRadius: 6, 
                              background: isDark ? '#1e2937' : '#fff', 
                              color: isDark ? '#e2e8f0' : '#0f172a' 
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '4px 4px', fontWeight: 600 }}>{net}</td>
                      <td style={{ padding: '4px 4px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500 }}>{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedDayData?.sessions?.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: textSecondary }}>
            Plan yok; oturum dersleri için geçici DYB girişi yapabilirsiniz.
          </div>
          <div style={{ 
            maxHeight: 220, 
            overflowY: 'auto', 
            border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', 
            borderRadius: 12, 
            padding: 8, 
            background: isDark ? '#0f172a' : '#ffffff' 
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, background: isDark ? '#1e293b' : '#f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Ders</th>
                  <th style={{ padding: '6px 4px' }}>Doğru</th>
                  <th style={{ padding: '6px 4px' }}>Yanlış</th>
                  <th style={{ padding: '6px 4px' }}>Boş</th>
                  <th style={{ padding: '6px 4px' }}>Net</th>
                  <th style={{ padding: '6px 4px' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(tempDYB).map(sub => {
                  const obj = tempDYB[sub];
                  const total = obj.correct + obj.wrong + obj.blank;
                  const net = Math.max(obj.correct - obj.wrong / 4, 0).toFixed(2);
                  const pct = total > 0 ? Math.round((obj.correct / total) * 100) : 0;
                  return (
                    <tr key={sub} style={{ borderBottom: '1px solid ' + (isDark ? '#334155' : '#e2e8f0') }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>{sub}</td>
                      {['correct', 'wrong', 'blank'].map(field => (
                        <td key={field} style={{ padding: '4px 4px' }}>
                          <input
                            type="number"
                            min={0}
                            value={(obj as any)[field]}
                            onChange={e => setTempDYB(prev => ({ ...prev, [sub]: { ...prev[sub], [field]: Number(e.target.value) } }))}
                            style={{ 
                              width: 60, 
                              padding: '2px 4px', 
                              border: '1px solid ' + (isDark ? '#475569' : '#cbd5e1'), 
                              borderRadius: 6, 
                              background: isDark ? '#1e2937' : '#fff', 
                              color: isDark ? '#e2e8f0' : '#0f172a' 
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '4px 4px', fontWeight: 600 }}>{net}</td>
                      <td style={{ padding: '4px 4px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500 }}>{pct}%</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Space>
            <Button size="small" type="primary" loading={dayPlanLoading} onClick={persistTempDYBAsPlan}>
              Kaydet & Plan Oluştur
            </Button>
            <Button size="small" onClick={() => setTempDYB({})}>
              Sıfırla
            </Button>
          </Space>
        </div>
      ) : (
        <div style={{ 
          fontSize: 12, 
          color: textSecondary, 
          padding: '8px 0', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 8 
        }}>
          <span>Bu gün için çalışma programı bulunamadı.</span>
          <Space wrap>
            <Button 
              size="small" 
              type="primary" 
              loading={dayPlanLoading} 
              onClick={() => createQuickFreeformPlan(dayModalDate)}
            >
              Hızlı Freeform Plan
            </Button>
            {selectedDayData?.sessions?.length > 0 && (
              <Button 
                size="small" 
                loading={dayPlanLoading} 
                onClick={() => createPlanFromSessions(dayModalDate, selectedDayData.sessions)}
              >
                Oturumlardan Plan Oluştur
              </Button>
            )}
          </Space>
          <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#64748b' }}>
            Plan oluşturduktan sonra D/Y/B girişi aktif olur.
          </span>
        </div>
      )}
    </>
  );
};

export default QuickDYBEntry;
