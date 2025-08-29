import React from 'react';

interface NetAggregate { net:number; correct:number; wrong:number; accuracy:number; }

export const DualNetSummaryCard: React.FC<{
  tyt: NetAggregate;
  ayt: NetAggregate;
  onSelect: (kind:'TYT'|'AYT')=>void;
}> = ({ tyt, ayt, onSelect }) => {
  return (
    <div className="exam-tracker-layout__card dual-net-summary-card">
      <h4 className="card-title" style={{marginTop:0}}>Genel Net Özeti</h4>
      <div className="exam-tracker-layout__dual-net">
        <div className="dual-net-card dual-net-card--tyt" role="button" tabIndex={0} onClick={()=> onSelect('TYT')} onKeyDown={e=> { if(e.key==='Enter') onSelect('TYT'); }}>
          <div className="dnc-head">TYT Net</div>
          <div className="dnc-value">{tyt.net.toFixed(2)}</div>
          <div className="dnc-sub">Doğru {tyt.correct} | Yanlış {tyt.wrong} | İsabet %{Math.round(tyt.accuracy*100)}</div>
        </div>
        <div className="dual-net-card dual-net-card--ayt" role="button" tabIndex={0} onClick={()=> onSelect('AYT')} onKeyDown={e=> { if(e.key==='Enter') onSelect('AYT'); }}>
          <div className="dnc-head">AYT Net</div>
          <div className="dnc-value">{ayt.net.toFixed(2)}</div>
          <div className="dnc-sub">Doğru {ayt.correct} | Yanlış {ayt.wrong} | İsabet %{Math.round(ayt.accuracy*100)}</div>
        </div>
      </div>
    </div>
  );
};
