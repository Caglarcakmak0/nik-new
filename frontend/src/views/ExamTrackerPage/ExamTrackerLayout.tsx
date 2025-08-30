import React from 'react';
import { AttemptsList, MOCK_ATTEMPTS } from './bones/AttemptsList.tsx';
import { InsightsColumn } from './bones/InsightsColumn.tsx';
import { useExamTracker } from './bones/state/useExamTracker.ts';
import { TopicHistoryModal } from './bones/TopicHistoryModal.tsx';
import { AggregateHistoryModal } from './bones/AggregateHistoryModal.tsx';
import { AddAttemptDrawer } from './bones/AddAttemptDrawer.tsx';
import { DualNetSummaryCard } from './bones/DualNetSummaryCard.tsx';
import '../ExamTrackerPage/bones/examTrackerLayout.scss';
import AISuggestionsPanel from '../../components/AISuggestions/AISuggestionsPanel';

export const ExamTrackerLayout: React.FC = () => {
  const [useRemote, setUseRemote] = React.useState(()=> {
    const ls = localStorage.getItem('examTrackerMock');
    return ls === '1' ? false : true;
  });
  React.useEffect(()=> { localStorage.setItem('examTrackerMock', useRemote ? '0':'1'); }, [useRemote]);
  React.useEffect(()=> {
    const handler = (e: any) => {
      const enabled = !!e.detail?.enabled;
      // globalMock true => mock veri (remote kapalı)
      setUseRemote(!enabled);
    };
    window.addEventListener('global-mock-mode', handler);
    return ()=> window.removeEventListener('global-mock-mode', handler);
  }, []);
  const tracker = useExamTracker(MOCK_ATTEMPTS.sort((a,b)=> new Date(b.date).getTime() - new Date(a.date).getTime()), { enableRemote: useRemote });
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [aggKind, setAggKind] = React.useState<'TYT'|'AYT'|null>(null);
  return (
      
  <div className="exam-tracker-layout">
        {tracker.error && (
          <div className="et-error-banner">
          <span>{tracker.error}</span>
          <button onClick={tracker.clearError} className="et-close">×</button>
        </div>
      )}
  <div className="exam-tracker-layout__header">
        <div className="exam-tracker-layout__title-block">
          <h1 className="etl-heading">Deneme Takibi</h1>
          <p className="etl-desc">Denemelerini ekle, zayıf konularını analiz et, önerileri takip et.</p>
          <div style={{marginTop:4}}>
            <span style={{
              display:'inline-block',
              fontSize:11,
              fontWeight:600,
              padding:'2px 8px',
              borderRadius:12,
              background: useRemote ? 'linear-gradient(145deg,#2563eb,#1d4ed8)' : 'linear-gradient(145deg,#d97706,#b45309)',
              color:'#fff',
              letterSpacing:0.5
            }}>{useRemote ? 'REAL API' : 'MOCK DATA'}</span>
          </div>
        </div>
        <div className="exam-tracker-layout__actions" style={{ display:'flex', flexDirection:'column', gap:12, alignItems:'flex-end' }}>
          <button className="etl-btn etl-btn--primary" type="button" onClick={()=> tracker.setShowAdd(true)}>+ Deneme Ekle</button>
          <div style={{ width:260 }}>
            <AISuggestionsPanel scope="exam_tracker" />
          </div>
        </div>
      </div>
      <div className="exam-tracker-layout__columns">
        <div className="exam-tracker-layout__list-wrapper">
          <DualNetSummaryCard tyt={tracker.tytNet} ayt={tracker.aytNet} onSelect={(k)=> { setAggKind(k); tracker.setAggregateKind(k); }} />
          {tracker.attempts.length === 0 && !tracker.loading && (
            <div className="et-empty-state">
              <p>Henüz deneme eklenmedi.</p>
              <button className="etl-btn etl-btn--primary" onClick={()=> tracker.setShowAdd(true)}>Deneme Ekle</button>
            </div>
          )}
          {tracker.loading && tracker.attempts.length === 0 && (
            <div className="et-skeleton-list">
              {Array.from({length:3}).map((_,i)=> <div key={i} className="et-skel-card" />)}
            </div>
          )}
          {tracker.attempts.length>0 && <AttemptsList attempts={tracker.attempts} onTopic={tracker.setTopicHistoryTopic} onEdit={(a)=> { tracker.setEditing(a); tracker.setShowAdd(true); }} onDelete={(id)=> setDeleteId(id)} />}
          <div className="overall-stats-box">
            <div className="osb-item">
              <span className="osb-label">Son Deneme Başarı</span>
              <span className="osb-value">%{Math.round(tracker.overallStats.lastAccuracy*100)}</span>
              <span className={`osb-delta ${tracker.overallStats.delta>=0? 'pos':'neg'}`}>{tracker.overallStats.delta>=0? '+':''}{(tracker.overallStats.delta*100).toFixed(1)}%</span>
            </div>
            <div className="osb-item">
              <span className="osb-label">Ortalama Başarı</span>
              <span className="osb-value">%{Math.round(tracker.overallStats.averageAccuracy*100)}</span>
            </div>
            <div className="osb-item">
              <span className="osb-label">Toplam Deneme</span>
              <span className="osb-value">{tracker.attempts.length}</span>
            </div>
          </div>
          <div className="top-mistakes-bar">
            <h4 className="tmb-title">En Çok Yanlış Yapılan Konular <span className="tmb-badge">{tracker.remoteFrequentActive? 'Sunucu':'Lokal'}</span>
              <button className="tmb-refresh" title="Yenile" onClick={()=> tracker.refreshOverviewAndFrequent()}>⟳</button>
            </h4>
            <div className="tmb-tags">
              {tracker.frequentTopics.map(t => (
                <span key={t.topic} className="tmb-tag" onClick={()=> tracker.setTopicHistoryTopic(t.topic)}>{t.topic} <em>{(t as any).total}</em></span>
              ))}
              {!tracker.frequentTopics.length && !tracker.loading && <span className="tmb-empty">Öneri / konu verisi yok</span>}
            </div>
          </div>
        </div>
        <InsightsColumn suggestions={tracker.suggestions} frequent={tracker.frequentTopics} onTopic={tracker.setTopicHistoryTopic} />
      </div>
  <TopicHistoryModal topic={tracker.topicHistoryTopic} points={tracker.topicHistory} activeRange={tracker.topicHistoryRange} onRangeChange={r=> tracker.setTopicHistoryRange(r)} loading={tracker.analyticsLoading} onClose={()=> tracker.setTopicHistoryTopic(null)} />
  <AggregateHistoryModal kind={aggKind} points={tracker.aggregateHistory.map(p=> ({ attemptId:p.bucket, date:p.bucket, wrong:p.wrong, accuracy:p.accuracy, net:p.netAvg }))} range={tracker.aggregateRange} bucket={tracker.aggregateBucket} loading={tracker.analyticsLoading} onRangeChange={r=> tracker.setAggregateRange(r)} onBucketChange={b=> tracker.setAggregateBucket(b)} onClose={()=> { setAggKind(null); tracker.setAggregateKind(null); }} />
  <AddAttemptDrawer attempts={tracker.attempts} open={tracker.showAdd} initial={tracker.editing ?? undefined} onClose={()=> { tracker.setShowAdd(false); tracker.setEditing(null); }} onSubmit={(a)=> tracker.editing ? tracker.updateAttempt({ ...a, id: tracker.editing.id }) : tracker.addAttempt(a)} />
      {deleteId && (
        <div className="et-modal-backdrop" onClick={()=> setDeleteId(null)}>
          <div className="et-modal" onClick={e=> e.stopPropagation()}>
            <div className="et-modal__header">
              <h3>Deneme Silinsin mi?</h3>
              <button className="et-close" onClick={()=> setDeleteId(null)}>×</button>
            </div>
            <div className="et-modal__body">
              <p style={{margin:0,fontSize:14,fontWeight:500}}>Bu denemeyi silmek istediğinden emin misin? Geri alamazsın.</p>
            </div>
            <div style={{display:'flex', justifyContent:'flex-end', gap:12, marginTop:12}}>
              <button className="etl-btn" type="button" onClick={()=> setDeleteId(null)}>Vazgeç</button>
              <button className="etl-btn etl-btn--primary" style={{background:'linear-gradient(145deg,#dc2626,#b91c1c)'}} type="button" onClick={()=> { tracker.removeAttempt(deleteId); setDeleteId(null); }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
