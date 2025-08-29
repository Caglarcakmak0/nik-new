import React, { useEffect, useMemo, useState } from 'react';
import { HabitHeatmapCell, getHabitHeatmap } from '../../services/habits';

const dayOrder = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function parseKey(cell: HabitHeatmapCell){
  const [dow,h] = cell.key.split('-');
  return { dow, hour: h };
}

const MOCK_CELLS: HabitHeatmapCell[] = [
  { key:'Mon-08', planned:4, completed:3, successRate:75, missed:0, late:1, skipped:0 },
  { key:'Tue-08', planned:4, completed:4, successRate:100, missed:0, late:0, skipped:0 },
  { key:'Wed-08', planned:4, completed:2, successRate:50, missed:1, late:1, skipped:0 },
  { key:'Thu-10', planned:3, completed:1, successRate:33, missed:1, late:1, skipped:0 },
  { key:'Fri-20', planned:4, completed:3, successRate:75, missed:1, late:0, skipped:0 },
  { key:'Sat-20', planned:2, completed:1, successRate:50, missed:1, late:0, skipped:0 },
  { key:'Sun-20', planned:2, completed:2, successRate:100, missed:0, late:0, skipped:0 }
];

export const HabitHeatmap: React.FC<{ mockMode?: boolean }> = ({ mockMode }) => {
  const [cells, setCells] = useState<HabitHeatmapCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  useEffect(()=>{ (async()=>{ if(mockMode){ setCells(MOCK_CELLS); return; } setLoading(true); try { const res= await getHabitHeatmap(30); setCells(res.data.cells); } catch(e:any){ setError(e.message||'Hata'); } finally { setLoading(false); } })(); }, [mockMode]);

  const matrix = useMemo(()=>{
    const map: Record<string, Record<string, HabitHeatmapCell>> = {};
    for(const c of cells){ const { dow, hour } = parseKey(c); if(!map[dow]) map[dow] = {}; map[dow][hour]=c; }
    return map;
  }, [cells]);
  const hours = [...new Set(cells.map(c=> parseKey(c).hour))].sort();

  const colorFor = (c?: HabitHeatmapCell) => {
    if(!c) return '#1e293b';
    if(c.planned===0) return '#1e293b';
    const pct = c.successRate; // 0-100
    if (pct >= 80) return '#16a34a';
    if (pct >= 60) return '#65a30d';
    if (pct >= 40) return '#ca8a04';
    if (pct >= 20) return '#d97706';
    return '#dc2626';
  };

  return (
    <div className="hb-heatmap-panel">
      <div className="hb-heatmap-head"><h3>Heatmap</h3>{loading && <span className="hb-badge-inline">Yükleniyor…</span>}</div>
      {error && <div className="hb-error-mini" style={{marginBottom:8}}>{error}</div>}
      <div className="hb-heatmap-grid">
        <div className="hb-heatmap-row hb-heatmap-header">
          <div className="hb-heatmap-cell label" />
          {hours.map(h=> <div key={h} className="hb-heatmap-cell label hour">{h}</div>)}
        </div>
        {dayOrder.map(d=> (
          <div key={d} className="hb-heatmap-row">
            <div className="hb-heatmap-cell label dow">{d}</div>
            {hours.map(h=> {
              const cell = matrix[d]?.[h];
              return <div key={h} className="hb-heatmap-cell" title={cell?`${d} ${h}:00\nPlanned:${cell.planned}\nSuccess:%${cell.successRate}`:'—'} style={{background:colorFor(cell)}} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
