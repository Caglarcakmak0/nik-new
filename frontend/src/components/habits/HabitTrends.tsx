import React, { useEffect, useState } from 'react';
import { HabitTrendPoint, getHabitTrends } from '../../services/habits';

const MOCK_SERIES: HabitTrendPoint[] = [
  { date:'2025-08-21', planned:5, completed:4, successRate:80 },
  { date:'2025-08-22', planned:5, completed:5, successRate:100 },
  { date:'2025-08-23', planned:4, completed:3, successRate:75 },
  { date:'2025-08-24', planned:4, completed:2, successRate:50 },
  { date:'2025-08-25', planned:5, completed:5, successRate:100 },
  { date:'2025-08-26', planned:5, completed:4, successRate:80 },
  { date:'2025-08-27', planned:5, completed:3, successRate:60 },
];

interface Props { mockMode?: boolean; }

export const HabitTrends: React.FC<Props> = ({ mockMode }) => {
  const [series, setSeries] = useState<HabitTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  useEffect(()=> { (async()=> { if(mockMode){ setSeries(MOCK_SERIES); return; } setLoading(true); try { const res = await getHabitTrends(30); setSeries(res.data.series); } catch(e:any){ setError(e.message||'Hata'); } finally { setLoading(false); } })(); }, [mockMode]);

  const maxRate = 100;

  return (
    <div className="hb-trends-panel">
      <div className="hb-trends-head"><h3>Trendler (30g)</h3>{loading && <span className="hb-badge-inline">Yükleniyor…</span>}</div>
      {error && <div className="hb-error-mini" style={{marginBottom:8}}>{error}</div>}
      <div className="hb-trends-chart">
        {series.map(p => {
          const h = (p.successRate/maxRate)*100;
          return (
            <div key={p.date} className="hb-trends-bar" title={`${p.date}\nBaşarı %${p.successRate}`}>
              <div className="inner" style={{height:`${h}%`}} />
              <span className="lbl">{p.date.slice(5,10)}</span>
            </div>
          );
        })}
        {series.length===0 && !loading && <div className="hb-trends-empty">Veri yok</div>}
      </div>
    </div>
  );
};
