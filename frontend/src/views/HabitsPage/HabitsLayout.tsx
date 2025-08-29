import React from 'react';
import './habitsLayout.scss';

export interface HabitRoutineVM {
  _id: string;
  name: string;
  schedule: { timeStart: string; recurrence: string };
  metrics?: { currentStreak?: number; longestStreak?: number };
  todayLog?: any;
  status?: 'active'|'paused'|'archived';
}

interface HabitsLayoutProps {
  routines: HabitRoutineVM[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCreate: () => void;
  onDone: (id: string) => void;
  onSkip: (id: string) => void;
  mockMode?: boolean;
  onToggleMock?: () => void;
  onEdit?: (id: string) => void;
  onStatusChange?: (id: string, status: 'active'|'paused'|'archived') => void;
  // Filters
  filterQuery?: string; onFilterQueryChange?: (v:string)=>void;
  filterStatus?: string; onFilterStatusChange?: (v:string)=>void;
  filterRecurrence?: string; onFilterRecurrenceChange?: (v:string)=>void;
  // Undo archive
  recentlyArchivedName?: string | null; onUndoArchive?: () => void;
}

export const HabitsLayout: React.FC<HabitsLayoutProps> = ({ routines, loading, error, onRefresh, onCreate, onDone, onSkip, mockMode, onToggleMock, onEdit, onStatusChange, filterQuery, onFilterQueryChange, filterStatus, onFilterStatusChange, filterRecurrence, onFilterRecurrenceChange, recentlyArchivedName, onUndoArchive }) => {
  return (
    <div className="habits-layout">
      {error && (
        <div className="hb-error-banner">
          <span>{error}</span>
          <button className="hb-close" onClick={onRefresh}>⟳</button>
        </div>
      )}
      {recentlyArchivedName && (
        <div className="hb-undo-banner">
          <span>Arşivlendi: <strong>{recentlyArchivedName}</strong></span>
          <button onClick={onUndoArchive} className="hb-btn-mini" style={{width:'auto', padding:'4px 10px'}}>Geri Al</button>
        </div>
      )}
      <div className="habits-layout__header">
        <div className="habits-layout__title-block">
          <h1 className="hb-heading">Alışkanlıklarım</h1>
          <p className="hb-desc">Rutinlerini yönet, streak’ini koru, risk oluşmadan harekete geç.</p>
          <div style={{marginTop:4, display:'flex', gap:6}}>
            <span className="hb-env-badge">{mockMode? 'MOCK':'API'}</span>
            {onToggleMock && <button className="hb-btn" style={{padding:'4px 8px', fontSize:11}} onClick={onToggleMock}>{mockMode? 'Gerçek Veriye Geç':'Mock Veriye Geç'}</button>}
          </div>
        </div>
        <div className="habits-layout__actions">
          <button className="hb-btn hb-btn--primary" onClick={onCreate}>+ Rutin Ekle</button>
          <button className="hb-btn" onClick={onRefresh} style={{marginLeft:8}}>Yenile</button>
        </div>
      </div>
      <div className="hb-filters-row">
        <input className="hb-filter-input" placeholder="Ara..." value={filterQuery||''} onChange={e=> onFilterQueryChange?.(e.target.value)} />
        <select className="hb-filter-select" value={filterStatus||''} onChange={e=> onFilterStatusChange?.(e.target.value)}>
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="paused">Duraklatılmış</option>
        </select>
        <select className="hb-filter-select" value={filterRecurrence||''} onChange={e=> onFilterRecurrenceChange?.(e.target.value)}>
          <option value="">Tüm Tekrarlar</option>
          <option value="daily">Her gün</option>
          <option value="weekdays">Hafta içi</option>
          <option value="weekends">Hafta sonu</option>
        </select>
      </div>
      <div className="habits-layout__list-wrapper">
        {loading && routines.length===0 && (
          <div className="hb-skeleton-list">
            {Array.from({length:3}).map((_,i)=> <div key={i} className="hb-skel-card" />)}
          </div>
        )}
        {!loading && routines.length===0 && (
          <div className="hb-empty-state">
            <p>Henüz rutin eklenmedi.</p>
            <button className="hb-btn hb-btn--primary" onClick={onCreate}>Rutin Ekle</button>
          </div>
        )}
        {routines.length>0 && (
          <div className="hb-grid">
            {routines.map(r => {
              const status = r.todayLog?.status || 'pending';
              return (
                <div key={r._id} className={`hb-card status-${status}`}>
                  <div className="hb-card__top">
                    <h3 className="hb-card__title">{r.name}</h3>
                    <span className="hb-time-badge">{r.schedule.timeStart}</span>
                  </div>
                  <div className="hb-card__meta">
                    <span className="hb-tag">{r.schedule.recurrence}</span>
                    <span className={`hb-tag streak streak-lvl-${!r.metrics?.currentStreak?0: r.metrics.currentStreak>=30?4: r.metrics.currentStreak>=14?3: r.metrics.currentStreak>=7?2:1}`} title={`Streak: ${r.metrics?.currentStreak||0}`}>🔥 {r.metrics?.currentStreak || 0}</span>
                  </div>
          <div className="hb-card__status-row" style={{flexWrap:'wrap', gap:6}}>
                    <span className={`hb-status-pill pill-${status}`}>{status}</span>
                    <div className="hb-card__actions">
                      {status==='pending' && (
                        <>
                          <button className="hb-btn-mini" onClick={()=> onDone(r._id)}>✓</button>
                          <button className="hb-btn-mini" onClick={()=> onSkip(r._id)}>✕</button>
                        </>
                      )}
            {onEdit && <button className="hb-btn-mini" title="Düzenle" onClick={()=> onEdit(r._id)}>✎</button>}
            {onStatusChange && (r.status||'active')!=='archived' && <button className="hb-btn-mini" title={(r.status||'active')==='paused'?'Aktifleştir':'Duraklat'} onClick={()=> onStatusChange(r._id, (r.status||'active')==='paused'?'active':'paused')}>{(r.status||'active')==='paused'?'▶':'Ⅱ'}</button>}
            {onStatusChange && (r.status||'active')!=='archived' && <button className="hb-btn-mini" title="Arşivle" onClick={()=> onStatusChange(r._id,'archived')}>🗂</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
