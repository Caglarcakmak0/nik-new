import React, { useEffect, useState } from 'react';
import { HabitRiskItem, getHabitRisk } from '../../services/habits';

const MOCK_RISK: HabitRiskItem[] = [
  { habitId:'m1', name:'Sabah tekrar', streak:5, riskScore:22, riskLevel:'low', successRate7:86 },
  { habitId:'m2', name:'Paragraf seti', streak:2, riskScore:58, riskLevel:'medium', successRate7:54 },
  { habitId:'m3', name:'Akşam deneme analizi', streak:15, riskScore:71, riskLevel:'high', successRate7:42 }
];

export const HabitRiskPanel: React.FC<{ mockMode?: boolean }> = ({ mockMode }) => {
  const [items, setItems] = useState<HabitRiskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  useEffect(()=> { (async()=>{ if(mockMode){ setItems(MOCK_RISK); return; } setLoading(true); try { const res = await getHabitRisk(); setItems(res.data); } catch(e:any){ setError(e.message||'Hata'); } finally { setLoading(false); } })(); }, [mockMode]);
  return (
    <div className="hb-risk-panel">
      <div className="hb-risk-panel__head">
        <h3>Risk Durumu</h3>
        {loading && <span className="hb-badge-inline">Yükleniyor…</span>}
      </div>
      {error && <div className="hb-error-mini" style={{marginBottom:8}}>{error}</div>}
      <div className="hb-risk-list">
        {items.length === 0 && !loading && <div className="hb-risk-empty">Risk verisi yok</div>}
        {items.map(i => (
          <div key={i.habitId} className={`hb-risk-row risk-${i.riskLevel}`}>
            <div className="hb-risk-main">
              <strong>{i.name}</strong>
              <span className="hb-risk-score">%{i.riskScore}</span>
            </div>
            <div className="hb-risk-meta">
              <span>Streak {i.streak}</span>
              <span>7g %{i.successRate7}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
