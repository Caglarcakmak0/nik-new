import React, { useEffect, useState } from 'react';
import { HabitRoutineDto } from '../../services/habits';

interface Props {
  open: boolean;
  routine?: HabitRoutineDto | null;
  onClose: () => void;
  onUpdated: (patch: Partial<HabitRoutineDto>) => void | Promise<void>;
}

export const HabitEditModal: React.FC<Props> = ({ open, routine, onClose, onUpdated }) => {
  const [name, setName] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [recurrence, setRecurrence] = useState('daily');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(()=> {
    if (routine) {
      setName(routine.name||'');
      setTimeStart(routine.schedule?.timeStart || '08:00');
      setRecurrence(routine.schedule?.recurrence || 'daily');
      setError(null);
    }
  }, [routine]);

  if(!open) return null;
  const submit = async () => {
    setSaving(true); setError(null);
    try {
      await onUpdated({ name, schedule: { timeStart, recurrence } as any });
    } catch(e:any){ setError(e.message||'Hata'); } finally { setSaving(false); }
  };

  return (
    <div className="hb-modal-backdrop">
      <div className="hb-modal">
        <h3>Rutin Düzenle</h3>
        {error && <div className="hb-error-mini" style={{marginBottom:4}}>{error}</div>}
        <label>İsim
          <input value={name} onChange={e=> setName(e.target.value)} />
        </label>
        <label>Saat (HH:MM)
          <input value={timeStart} onChange={e=> setTimeStart(e.target.value)} />
        </label>
        <label>Tekrar
          <select value={recurrence} onChange={e=> setRecurrence(e.target.value)}>
            <option value="daily">Her gün</option>
            <option value="weekdays">Hafta içi</option>
            <option value="weekends">Hafta sonu</option>
          </select>
        </label>
        <div className="hb-modal__actions">
          <button disabled={saving} onClick={onClose}>Kapat</button>
          <button disabled={saving || !name.trim()} onClick={submit}>Kaydet</button>
        </div>
      </div>
    </div>
  );
};
