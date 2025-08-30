import React, { useEffect, useState } from 'react';
import { Button, Tooltip, Select, message } from 'antd';
import { getAISuggestions, generateAISuggestions, dismissAISuggestion, acceptAISuggestion, AISuggestion } from '../../services/api';
import './aisuggestions.scss';

interface Props {
  scope: string; // e.g. 'weekly_plan'
  onAccepted?: () => void; // refresh callback
}

const DAY_LABELS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

const AISuggestionsPanel: React.FC<Props> = ({ scope, onAccepted }) => {
  const [list, setList] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [targetDay, setTargetDay] = useState<number | undefined>(undefined);

  async function load(){
    try { setLoading(true); const res = await getAISuggestions(scope); setList(res.data||[]); } catch(e:any){ /* ignore */ } finally { setLoading(false); }
  }

  const [cooldown, setCooldown] = useState<number>(0);
  useEffect(()=>{
    if(cooldown>0){
      const t = setTimeout(()=> setCooldown(cooldown-1), 1000);
      return ()=> clearTimeout(t);
    }
  },[cooldown]);

  async function handleGenerate(){
    if(cooldown>0) return;
    try { setGenerating(true); const res = await generateAISuggestions(); await load();
      if(res.devNoLimit){ setCooldown(0); }
      else if(res.rateLimitSeconds) setCooldown(res.rateLimitSeconds);
      message.success('Öneriler güncellendi');
    } catch(e:any){
      // try to parse remainingSeconds if available in error message json (apiRequest throws Error only with message)
      const m = e.message;
      const match = m.match(/(\d+)s sonra/);
      if(match){ setCooldown(parseInt(match[1],10)); }
      message.error(m);
    } finally { setGenerating(false); }
  }

  async function handleDismiss(id:string){
    try { await dismissAISuggestion(id, scope); setList(ls=> ls.filter(s=> s._id!==id)); } catch(e:any){ message.error(e.message); }
  }

  async function handleAccept(id:string){
    try { await acceptAISuggestion(id, { targetDay }); message.success('Eklendi'); setList(ls=> ls.filter(s=> s._id!==id));
      if(typeof window !== 'undefined' && (window as any).__refreshWeeklyPlan){
        try { (window as any).__refreshWeeklyPlan(); } catch(_){ /* ignore */ }
      }
      onAccepted && onAccepted();
    } catch(e:any){ message.error(e.message); }
  }

  useEffect(()=>{ load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  },[scope]);

  return (
    <div className="ai-sug-panel">
      <div className="ai-sug-panel__head">
        <h3>AI Önerileri</h3>
        <div className="ai-sug-panel__actions">
          <Select
            size="small"
            allowClear
            placeholder="Gün"
            value={targetDay as any}
            onChange={(v)=> setTargetDay(v)}
            style={{ width:90 }}
            options={DAY_LABELS.map((l,i)=>({ label:l, value:i }))}
          />
          <Tooltip title="Önerileri yeniden oluştur">
            <Button size="small" loading={generating} disabled={cooldown>0} onClick={handleGenerate}>{cooldown>0?`Bekle ${cooldown}s`:'Yenile'}</Button>
          </Tooltip>
        </div>
      </div>
      {loading && <div className="ai-sug-empty">Yükleniyor...</div>}
      {!loading && list.length===0 && <div className="ai-sug-empty">Öneri yok</div>}
      <div className="ai-sug-list">
        {list.map(s=> {
          const title = s.topic || s.subject || s.type;
          const msg = (s.messages && (s.messages[scope] || s.messages['default'])) || '';
          return (
            <div key={s._id} className="ai-sug-item">
              <div className="ai-sug-item__main">
                <div className="ai-sug-item__title">{title}</div>
                {msg && <div className="ai-sug-item__msg">{msg}</div>}
              </div>
              <div className="ai-sug-item__buttons">
                <Button size="small" onClick={()=> handleAccept(s._id)} type="primary">Ekle</Button>
                <Button size="small" onClick={()=> handleDismiss(s._id)}>Kapat</Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AISuggestionsPanel;