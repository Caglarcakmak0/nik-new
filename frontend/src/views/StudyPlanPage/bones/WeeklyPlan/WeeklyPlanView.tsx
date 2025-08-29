import React, { useEffect, useState, useRef } from 'react';
import { Typography, Button, Form, Select, Input, message, Spin } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { apiRequest } from '../../../../services/api';
import { CheckOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

export interface WeeklyEntry {
  _id: string;
  day: number; // 0 Monday - 6 Sunday
  subject: string;
  type: 'konu_anlatim' | 'soru_cozum';
  topic?: string;
  customTitle?: string;
  suggestion?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  order: number;
  notes?: string;
}

interface WeeklyPlanData {
  _id: string;
  weekStartDate: string;
  entries: WeeklyEntry[];
  title: string;
}

interface WeeklyPlanViewProps {
  referenceDate: Dayjs; // any date in week
}

const SUBJECTS = [
  { value: 'matematik_ayt', label: 'AYT Matematik' },
  { value: 'matematik', label: 'TYT Matematik' },
  { value: 'turkce', label: 'Türkçe' },
  { value: 'fizik_ayt', label: 'AYT Fizik' },
  { value: 'fizik', label: 'TYT Fizik' },
  { value: 'kimya', label: 'Kimya' },
  { value: 'biyoloji', label: 'Biyoloji' },
  { value: 'genel_tekrar', label: 'Genel Tekrar' },
  { value: 'deneme_sinavi', label: 'Deneme Sınavı' }
];
const SUBJECT_LABEL_MAP: Record<string,string> = SUBJECTS.reduce((a,s)=>{a[s.value]=s.label;return a;},{} as Record<string,string>);

const DAY_LABELS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

const WeeklyPlanView: React.FC<WeeklyPlanViewProps> = ({ referenceDate }) => {
  const [plan, setPlan] = useState<WeeklyPlanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form] = Form.useForm();
  const [activeEntry, setActiveEntry] = useState<WeeklyEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<WeeklyEntry | null>(null);
  // Pazartesi hesapla (Sunday -> Monday -6)
  const monday = referenceDate.day() === 0 ? referenceDate.subtract(6,'day') : referenceDate.startOf('week').add(referenceDate.startOf('week').day()===0?1:0,'day');

  async function fetchPlan() {
    try {
      setLoading(true);
      const dateStr = referenceDate.format('YYYY-MM-DD');
      const res = await apiRequest(`/weekly-plans?date=${dateStr}`);
      setPlan(res.data || null);
      if(res?.data?.entries){
        // Debug: notes kontrolü
        // eslint-disable-next-line no-console
        console.debug('WeeklyPlan entries (notes check):', res.data.entries.map((e:any)=> ({ id: e._id, notes: e.notes })));
      }
    } catch (e:any) {
      console.error(e);
      setPlan(null);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ fetchPlan(); // eslint-disable-next-line
  },[referenceDate]);

  function openAdd(dayIndex:number){
  setEditingEntry(null);
  form.resetFields();
  form.setFieldsValue({ day: dayIndex, type:'konu_anlatim' });
  setShowAddModal(true);
  }

  async function submitAdd(){
    try {
  const values = await form.validateFields();
  if(values.topic === undefined) values.topic = '';
  if(values.notes === undefined) values.notes = '';
      const ws = monday.format('YYYY-MM-DD');
      if (editingEntry) {
        await apiRequest(`/weekly-plans/${ws}/entries/${editingEntry._id}`, { method:'PATCH', body: JSON.stringify(values) });
        message.success('Güncellendi');
      } else {
        await apiRequest(`/weekly-plans/${ws}/add-entry`, { method:'PATCH', body: JSON.stringify(values) });
        message.success('Eklendi');
      }
      setShowAddModal(false);
      setEditingEntry(null);
      fetchPlan();
    } catch(e:any){
      if(e?.errorFields) return; // form
      message.error(e.message || 'Hata');
    }
  }

  async function toggle(entry:WeeklyEntry){
    try {
      const ws = monday.format('YYYY-MM-DD');
      await apiRequest(`/weekly-plans/${ws}/entries/${entry._id}/toggle-status`, { method:'PATCH', body: JSON.stringify({}) });
      fetchPlan();
    } catch(e:any){ message.error(e.message); }
  }

  const grouped: Record<number, WeeklyEntry[]> = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  (plan?.entries||[]).forEach(e=>{ if(!grouped[e.day]) grouped[e.day]=[]; grouped[e.day].push(e); });
  Object.keys(grouped).forEach(k=> grouped[Number(k)].sort((a,b)=> a.order - b.order));

  // Drag & drop state
  const [dragging, setDragging] = useState<{ day:number; id:string } | null>(null);
  const dragOverId = useRef<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  async function commitReorder(day:number, ordered:WeeklyEntry[]) {
    try {
      const ws = monday.format('YYYY-MM-DD');
      await apiRequest(`/weekly-plans/${ws}/reorder`, { method:'PATCH', body: JSON.stringify({ day, orderedEntryIds: ordered.map(e=> e._id) }) });
      fetchPlan();
    } catch(e:any){ message.error('Sıralama kaydedilemedi: '+ e.message); }
  }

  function onDragStart(e:React.DragEvent, day:number, id:string){
    setDragging({ day, id });
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e:React.DragEvent, id:string){
    e.preventDefault();
    dragOverId.current = id;
  }
  function onDrop(e:React.DragEvent, day:number){
    e.preventDefault();
    if(!dragging) return;
    // Cross-day move
    if(dragging.day !== day){
      const movingEntry = grouped[dragging.day].find(e=> e._id === dragging.id);
      if(movingEntry){
        (async ()=>{
          try {
            const ws = monday.format('YYYY-MM-DD');
            await apiRequest(`/weekly-plans/${ws}/entries/${movingEntry._id}`, { method:'PATCH', body: JSON.stringify({ day }) });
            message.success('Taşındı');
            fetchPlan();
          } catch(err:any){ message.error(err.message||'Taşıma hatası'); }
        })();
      }
    } else {
      const list = [...grouped[day]];
      const fromIndex = list.findIndex(i=> i._id === dragging.id);
      const toIndex = list.findIndex(i=> i._id === dragOverId.current);
      if(fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) { setDragging(null); dragOverId.current=null; setDragOverDay(null); return; }
      const [moved] = list.splice(fromIndex,1);
      list.splice(toIndex,0,moved);
      commitReorder(day, list);
    }
    setDragging(null); dragOverId.current=null; setDragOverDay(null);
  }
  function onDragEnd(){ setDragging(null); dragOverId.current=null; setDragOverDay(null); }

  function onDayDragOver(e:React.DragEvent, day:number){
    e.preventDefault();
    if(dragOverDay!==day) setDragOverDay(day);
  }

  const totalEntries = plan?.entries?.length || 0;
  const completedEntries = plan?.entries?.filter(e=> e.status==='completed').length || 0;
  const completionPct = totalEntries? Math.round((completedEntries/totalEntries)*100):0;

  // Suggestion feature removed

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:16 }}>
        <div>
          <Title level={4} style={{ margin:0 }}>{monday.format('DD MMM YYYY')} - {monday.add(6,'day').format('DD MMM YYYY')}</Title>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={()=> openAdd(dayjs().day()===0?6:dayjs().day()-1)}>Ders Ekle</Button>
      </div>
      <div className="wpl-summary" style={{ marginBottom:20 }}>
        <div className="wpl-summary__chips">
          <div className="wpl-chip"><span>Tamamlanan</span><em>{completedEntries}</em></div>
          <div className="wpl-chip"><span>Toplam</span><em>{totalEntries}</em></div>
          <div className="wpl-chip"><span>Oran</span><em>%{completionPct}</em></div>
        </div>
        <div className="wpl-summary__bar"><div className="wpl-summary__bar__inner" style={{ width:`${completionPct}%` }} /></div>
      </div>
      {loading && <Spin />}
      <div className="weekly-plan-layout__days">
        {DAY_LABELS.map((label, idx)=>(
          <div key={idx} className={`wpl-day ${dragOverDay===idx?'drag-over':''}`} onDragOver={(e)=> onDayDragOver(e, idx)} onDrop={(e)=> onDrop(e, idx)}>
            <div className="wpl-day__head">
              <h4 className="wpl-day__title">{label}</h4>
              <button className="wpl-day__add" onClick={()=> openAdd(idx)}>Ekle</button>
            </div>
            <div className="wpl-day__list" onDragOver={(e)=> e.preventDefault()}>
              {grouped[idx] && grouped[idx].length>0 ? grouped[idx].map(entry => {
                const subjectLabel = SUBJECT_LABEL_MAP[entry.subject] || entry.subject;
                const displayTitle = entry.customTitle || entry.topic || entry.suggestion || subjectLabel;
                return (
                  <div key={entry._id}
                       className={`wpl-entry wpl-entry--${entry.type==='konu_anlatim'?'konu':'soru'} ${entry.status==='completed'?'is-completed':''} ${dragging?.id===entry._id?'is-dragging':''}`}
                       draggable
                       onDragStart={(e)=> onDragStart(e, idx, entry._id)}
                       onDragOver={(e)=> onDragOver(e, entry._id)}
                       onDrop={(e)=> onDrop(e, idx)}
                       onDragEnd={onDragEnd}
                       onClick={()=> setActiveEntry(entry)}>
                    <div className="wpl-entry__top">
                      <span className="wpl-entry__subject">{subjectLabel}</span>
                      <div className={`wpl-entry__check ${entry.status==='completed'?'completed':''}`}
                        onClick={(e)=> { e.stopPropagation(); toggle(entry); }}>
                        <CheckOutlined />
                      </div>
                    </div>
                    <div className="wpl-entry__title">{displayTitle}</div>
                    {(entry.topic && entry.topic !== entry.customTitle) && <div className="wpl-entry__meta">{entry.topic}</div>}
                    {entry.notes && <div className="wpl-entry__notes">{entry.notes.length>60? entry.notes.slice(0,60)+'…': entry.notes}</div>}
                  </div>
                );
              }) : <div className="wpl-empty">Henüz eklenmedi</div>}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="wpl-modal-backdrop" onMouseDown={(e)=> { if(e.target===e.currentTarget) setShowAddModal(false); }}>
          <div className="wpl-modal" role="dialog" aria-modal="true">
            <div className="wpl-modal__header">
              <h3>{editingEntry? 'Dersi Düzenle':'Ders Ekle'}</h3>
              <button className="wpl-close" onClick={()=> setShowAddModal(false)}>×</button>
            </div>
            <div className="wpl-modal__body">
              <Form layout="vertical" form={form} className="wpl-form-grid">
                <div className="wpl-form-col">
                  <Form.Item name="day" label="Gün" rules={[{ required:true }]} className="wpl-field"> 
                    <Select className="wpl-select" dropdownClassName="wpl-select-dropdown" options={DAY_LABELS.map((l,i)=>({ label:l, value:i }))} popupClassName="wpl-select" />
                  </Form.Item>
                </div>
                <div className="wpl-form-col">
                  <Form.Item name="subject" label="Ders" rules={[{ required:true }]} className="wpl-field"> 
                    <Select showSearch className="wpl-select" dropdownClassName="wpl-select-dropdown" options={SUBJECTS} popupClassName="wpl-select" />
                  </Form.Item>
                </div>
                <div className="wpl-form-col">
                  <Form.Item name="type" label="Tür" rules={[{ required:true }]} className="wpl-field"> 
                    <Select className="wpl-select" dropdownClassName="wpl-select-dropdown" options={[{value:'konu_anlatim', label:'Konu Anlatım'},{ value:'soru_cozum', label:'Soru Çözüm'}]} popupClassName="wpl-select" />
                  </Form.Item>
                </div>
                <div className="wpl-form-col">
                  <Form.Item name="topic" label="Konu" className="wpl-field"> <Input className="wpl-input" maxLength={80} placeholder="Örn: Limit" /> </Form.Item>
                </div>
                <div className="wpl-form-col span-2">
                  <Form.Item name="customTitle" label="Özel Başlık" className="wpl-field"> <Input className="wpl-input" maxLength={120} placeholder="Opsiyonel" /> </Form.Item>
                </div>
                {/* Öneri alanları kaldırıldı */}
                <div className="wpl-form-col span-2">
                  <Form.Item name="notes" label="Not" className="wpl-field"> <Input.TextArea className="wpl-textarea" rows={3} maxLength={300} /> </Form.Item>
                </div>
              </Form>
            </div>
            <div className="wpl-modal__footer">
              <button className="wpl-btn" onClick={()=> setShowAddModal(false)}>Vazgeç</button>
              <button className="wpl-btn wpl-btn--primary" onClick={submitAdd}>Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {activeEntry && (
        <div className="wpl-modal-backdrop" onMouseDown={(e)=> { if(e.target===e.currentTarget) setActiveEntry(null); }}>
          <div className="wpl-modal wpl-detail-modal" role="dialog" aria-modal="true">
            <div className="wpl-modal__header">
              <h3>Ders Detayı</h3>
              <button className="wpl-close" onClick={()=> setActiveEntry(null)}>×</button>
            </div>
            <div className="wpl-modal__body">
              <div className="wpl-detail-head">
                <div className="wpl-badge">{SUBJECT_LABEL_MAP[activeEntry.subject] || activeEntry.subject}</div>
                <div className={`wpl-status wpl-status--${activeEntry.status}`}>{activeEntry.status==='completed'?'Tamamlandı': activeEntry.status==='in_progress'?'Devam Ediyor':'Planlandı'}</div>
              </div>
              <div className="wpl-detail-grid">
                <div className="wpl-field-row">
                  <span className="wpl-field-label">Başlık</span>
                  <span className="wpl-field-value">{activeEntry.customTitle || activeEntry.topic || activeEntry.suggestion || '-'}</span>
                </div>
                <div className="wpl-field-row">
                  <span className="wpl-field-label">Tür</span>
                  <span className="wpl-field-value">{activeEntry.type==='konu_anlatim'?'Konu Anlatım':'Soru Çözüm'}</span>
                </div>
                <div className="wpl-field-row">
                  <span className="wpl-field-label">Gün</span>
                  <span className="wpl-field-value">{DAY_LABELS[activeEntry.day]}</span>
                </div>
                <div className="wpl-field-row">
                  <span className="wpl-field-label">Konu</span>
                  <span className="wpl-field-value">{activeEntry.topic || '-'}</span>
                </div>
                {activeEntry.suggestion && (
                  <div className="wpl-field-row span-2">
                    <span className="wpl-field-label">Öneri</span>
                    <span className="wpl-field-value multiline">{activeEntry.suggestion}</span>
                  </div>
                )}
                <div className="wpl-field-row span-2">
                  <span className="wpl-field-label">Not</span>
                  <span className="wpl-field-value multiline">{activeEntry.notes || '-'}</span>
                </div>
              </div>
            </div>
            <div className="wpl-modal__footer wpl-detail-footer">
              <button className="wpl-btn" onClick={()=> { setEditingEntry(activeEntry); form.setFieldsValue({ day: activeEntry.day, subject: activeEntry.subject, type: activeEntry.type, topic: activeEntry.topic, customTitle: activeEntry.customTitle, notes: activeEntry.notes }); setShowAddModal(true); setActiveEntry(null); }}>Düzenle</button>
              <button className="wpl-btn" onClick={async ()=> { try { const ws = monday.format('YYYY-MM-DD'); await apiRequest(`/weekly-plans/${ws}/entries/${activeEntry._id}/toggle-status`, { method:'PATCH', body: JSON.stringify({}) }); fetchPlan(); setActiveEntry(null); } catch(err:any){ message.error(err.message); } }}>{activeEntry.status==='completed'?'Geri Al':'Tamamla'}</button>
              <button className="wpl-btn wpl-btn--danger" onClick={async ()=> { try { const ws = monday.format('YYYY-MM-DD'); await apiRequest(`/weekly-plans/${ws}/entries/${activeEntry._id}`, { method:'DELETE' }); message.success('Silindi'); setActiveEntry(null); fetchPlan(); } catch(e:any){ message.error(e.message); } }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanView;
