import React, { useState } from 'react';
import { createHabitRoutine } from '../../services/habits';

interface Props { open: boolean; onClose: () => void; onCreated: () => void; }

const defaultForm = { name: '', timeStart: '08:00', recurrence: 'daily' };

export const HabitCreateModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  if(!open) return null;
  const validate = () => {
    if (form.name.trim().length < 3) return 'İsim en az 3 karakter olmalı';
    if (!/^\d{2}:\d{2}$/.test(form.timeStart)) return 'Saat HH:MM formatında olmalı';
    return null;
  };
  const submit = async () => {
    const v = validate(); if(v){ setError(v); return; }
    setLoading(true); setError(null);
    try {
      await createHabitRoutine({ name: form.name.trim(), schedule: { timeStart: form.timeStart, recurrence: form.recurrence } });
      onCreated(); onClose(); setForm(defaultForm);
    } catch(e:any){ setError(e.message || 'Hata'); }
    finally { setLoading(false); }
  };
  return (
    <div className="hb-modal-backdrop">
      <div className="hb-modal">
        <h3>Yeni Rutin</h3>
        {error && <div className="hb-error-mini">{error}</div>}
        <label>İsim
          <input value={form.name} onChange={e=> setForm(f=>({...f,name:e.target.value}))} placeholder="Örn: Sabah tekrar" />
          <small style={{opacity:.7}}>Kısa ve eylem odaklı bir isim verin.</small>
        </label>
        <label>Saat (HH:MM)
          <input value={form.timeStart} onChange={e=> setForm(f=>({...f,timeStart:e.target.value}))} />
          <small style={{opacity:.7}}>Planlanan başlangıç saati.</small>
        </label>
        <label>Tekrar
          <select value={form.recurrence} onChange={e=> setForm(f=>({...f,recurrence:e.target.value}))}>
            <option value="daily">Her gün</option>
            <option value="weekdays">Hafta içi</option>
            <option value="weekends">Hafta sonu</option>
            <option value="custom" disabled>Custom (yakında)</option>
          </select>
        </label>
        <div className="hb-modal__actions">
          <button onClick={onClose} disabled={loading}>İptal</button>
          <button onClick={submit} disabled={loading || !form.name.trim()}>Kaydet</button>
        </div>
      </div>
    </div>
  );
};
