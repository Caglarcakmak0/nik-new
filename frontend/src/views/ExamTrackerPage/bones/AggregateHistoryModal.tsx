import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { VALID_RANGES } from './state/examTrackerConstants';

interface Point { attemptId:string; date:string; wrong:number; accuracy:number; net:number; }

interface Props { kind:'TYT'|'AYT'|null; points:Point[]; onClose:()=>void; range?:string; bucket?:'day'|'week'|'month'; loading?:boolean; onRangeChange?:(r:string)=>void; onBucketChange?:(b:'day'|'week'|'month')=>void; }

export const AggregateHistoryModal: React.FC<Props> = ({ kind, points, onClose, range='30d', bucket='day', loading, onRangeChange, onBucketChange }) => {
  if (!kind) return null;
  const chartData = points.map(p=> ({ date:p.date, wrong:p.wrong }));
  return (
    <div className="et-modal-backdrop" onClick={onClose}>
      <div className="et-modal" onClick={e=> e.stopPropagation()}>
        <div className="et-modal__header">
          <h3>{kind} Genel Hata Trend</h3>
          <button className="et-close" onClick={onClose}>×</button>
        </div>
        <div className="et-modal__body">
          <div className="et-filter-bar">
            <div className="et-filter-group">
              {VALID_RANGES.map(r=> <button key={r} className={"et-range-btn" + (range===r? ' active':'')} onClick={()=> onRangeChange?.(r)}>{r}</button>)}
            </div>
            <div className="et-filter-group et-buckets">
              {(['day','week','month'] as const).map(b=> <button key={b} className={"et-range-btn" + (bucket===b? ' active':'')} onClick={()=> onBucketChange?.(b)}>{b}</button>)}
            </div>
            {loading && <span className="et-inline-spinner" />}
          </div>
          {points.length === 0 && !loading && <div className="et-empty">Kayıt bulunamadı.</div>}
          {points.length > 0 && (
            <>
              <div style={{width:'100%', height:200}}>
                <ResponsiveContainer>
                  <LineChart data={chartData} margin={{ top:10,right:10,left:0,bottom:0 }} className="et-line-chart">
                    <CartesianGrid className="et-grid" strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize:12 }} stroke={"var(--et-axis-stroke,#94a3b8)"} tickLine={false} axisLine={{ stroke:"var(--et-axis-stroke,#cbd5e1)" }} />
                    <YAxis allowDecimals={false} tick={{ fontSize:12 }} stroke={"var(--et-axis-stroke,#94a3b8)"} tickLine={false} axisLine={{ stroke:"var(--et-axis-stroke,#cbd5e1)" }} />
                    <Tooltip formatter={(v)=> v + ' yanlış'} contentStyle={{ background:'var(--et-tooltip-bg,#ffffff)', border:'1px solid var(--et-tooltip-border,#e2e8f0)', borderRadius:12, boxShadow:'0 6px 22px -6px rgba(0,0,0,.35)' }} labelStyle={{ fontWeight:700 }} />
                    <Line type="monotone" dataKey="wrong" stroke={kind==='TYT' ? '#10b981' : '#7c3aed'} strokeWidth={3} dot={{ r:5 }} activeDot={{ r:6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table className="et-history-table">
                <thead><tr><th>Zaman</th><th>Yanlış</th></tr></thead>
                <tbody>
                  {points.map(p=> <tr key={p.attemptId}><td>{p.date}</td><td>{p.wrong}</td></tr>)}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
