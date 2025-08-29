import React, { useMemo, useState, useEffect } from 'react';
import { TopicHistoryPoint } from './state/useExamTracker.ts';
import { VALID_RANGES } from './state/examTrackerConstants';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

type RangeMode = 'ALL' | 'WEEK' | 'MONTH';

interface Props { topic: string | null; points: TopicHistoryPoint[]; onClose:()=>void; onRangeChange?:(r:string)=>void; activeRange?:string; loading?:boolean; }

export const TopicHistoryModal: React.FC<Props> = ({ topic, points, onClose, onRangeChange, activeRange='60d', loading }) => {
  const [viewMode, setViewMode] = useState<RangeMode>('ALL');
  useEffect(()=> { /* reset mode when topic changes */ setViewMode('ALL'); }, [topic]);

  // Ensure points sorted by date asc for aggregation
  const sorted = useMemo(()=> [...points].sort((a,b)=> new Date(a.date).getTime()-new Date(b.date).getTime()), [points]);

  const aggregated = useMemo(()=> {
    if (viewMode === 'ALL') return sorted.map(p => ({ key:p.attemptId, label: new Date(p.date).toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit' }), wrong: p.wrong, date: p.date }));
    const map = new Map<string,{ key:string; label:string; wrong:number; date:string }>();
    for (const p of sorted) {
      const d = new Date(p.date);
      if (viewMode === 'MONTH') {
        const key = d.getFullYear()+ '-' + (d.getMonth()+1);
        const label = d.toLocaleDateString('tr-TR', { month:'short', year:'2-digit' });
        const ex = map.get(key) || { key, label, wrong:0, date: p.date };
        ex.wrong += p.wrong; if (new Date(ex.date) > d) ex.date = p.date; // keep earliest date for ordering fallback
        map.set(key, ex);
      } else if (viewMode === 'WEEK') {
        // ISO week calc
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const day = tmp.getUTCDay() || 7; // 1..7
        if (day !== 1) tmp.setUTCDate(tmp.getUTCDate() - day + 1); // Monday as start
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(),0,1));
        const week = Math.ceil((((tmp.getTime()-yearStart.getTime())/86400000)+1)/7);
        const key = tmp.getUTCFullYear()+ '-W' + week;
        const label = 'H' + week + ' ' + String(tmp.getUTCFullYear()).slice(-2);
        const ex = map.get(key) || { key, label, wrong:0, date: p.date };
        ex.wrong += p.wrong; if (new Date(ex.date) > d) ex.date = p.date;
        map.set(key, ex);
      }
    }
    return Array.from(map.values()).sort((a,b)=> new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sorted, viewMode]);

  const data = useMemo(()=> aggregated.map(p => ({ date: p.label, wrong: p.wrong })), [aggregated]);
  if (!topic) return null;
  return (
    <div className="et-modal-backdrop" onClick={onClose}>
      <div className="et-modal" onClick={e=> e.stopPropagation()}>
        <div className="et-modal__header">
          <h3>{topic} - Hata Geçiş Trend</h3>
          <button onClick={onClose} className="et-close">×</button>
        </div>
        <div className="et-modal__body">
          <div className="et-filter-bar">
            <div className="et-filter-group">
              {VALID_RANGES.map(r=> <button key={r} className={"et-range-btn" + (activeRange===r?' active':'')} onClick={()=> onRangeChange?.(r)}>{r}</button>)}
            </div>
            {loading && <span className="et-inline-spinner" />}
          </div>
          {points.length > 0 && (
            <div className="et-timeframe">
              <button className={"et-timeframe__btn" + (viewMode==='ALL'?' active':'')} onClick={()=> setViewMode('ALL')}>Tümü</button>
              <button className={"et-timeframe__btn" + (viewMode==='WEEK'?' active':'')} onClick={()=> setViewMode('WEEK')}>Haftalık</button>
              <button className={"et-timeframe__btn" + (viewMode==='MONTH'?' active':'')} onClick={()=> setViewMode('MONTH')}>Aylık</button>
            </div>
          )}
          {points.length === 0 && <div className="et-empty">Kayıt bulunamadı.</div>}
          {aggregated.length > 0 && (
            <>
              <div style={{width:'100%', height:200}}>
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ top:10, right:10, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize:12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize:12 }} />
                    <Tooltip formatter={(v)=> v + ' yanlış'} />
                    <Line type="monotone" dataKey="wrong" stroke="#10b981" strokeWidth={3} dot={{ r:5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table className="et-history-table">
                <thead><tr><th>{viewMode==='ALL' ? 'Tarih' : (viewMode==='WEEK' ? 'Hafta' : 'Ay')}</th><th>Yanlış</th></tr></thead>
                <tbody>
                  {aggregated.map(p => (
                    <tr key={p.key}><td>{viewMode==='ALL' ? new Date(p.date).toLocaleDateString('tr-TR') : p.label}</td><td>{p.wrong}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
