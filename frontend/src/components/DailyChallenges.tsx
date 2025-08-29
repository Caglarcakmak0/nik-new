import React from 'react';
import { Progress, Button } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { apiRequest } from '../services/api';
import './dailyChallenges.scss';

interface Props { data: any; onClaimed?: () => void; loading?: boolean }

const DailyChallenges: React.FC<Props> = ({ data, onClaimed, loading }) => {
  if (loading) return <div className="daily-challenges daily-challenges--loading">Yükleniyor...</div>;
  if (!data) return null;
  const challenges = Array.isArray(data.challenges) ? data.challenges : [];
  if (!challenges.length) return <div className="daily-challenges daily-challenges--empty">Bugün için görev yok.</div>;

  const claim = async (key: string) => {
    await apiRequest('/gamification/claim-challenge', { method: 'POST', body: JSON.stringify({ key }) });
    onClaimed?.();
  };

  return (
    <div className="daily-challenges">
      <div className="daily-challenges__head">
        <h3 className="dc-title"><ThunderboltOutlined /> Günlük Meydan Okumalar</h3>
        <div className="dc-count">{challenges.length} görev</div>
      </div>
      <div className="daily-challenges__list">
        {challenges.map((c: any) => {
          const percent = c.target > 0 ? (c.current / c.target) * 100 : 0;
          const status = c.isCompleted ? (c.claimed ? 'claimed' : 'ready') : 'progress';
          return (
            <div key={c.key} className={`dc-item dc-item--${status}`}>
              <div className="dc-item__main">
                <div className="dc-item__top">
                  <span className="dc-item__title">{c.title}</span>
                  <span className={`dc-badge dc-badge--${status}`}>
                    {c.isCompleted ? (c.claimed ? 'Alındı' : 'Hazır') : `${Math.round(percent)}%`}
                  </span>
                </div>
                <p className="dc-item__desc">{c.description}</p>
                <div className="dc-progress-wrap">
                  <Progress
                    percent={Math.min(100, percent)}
                    size="small"
                    strokeColor={c.isCompleted ? '#10b981' : '#1890ff'}
                    showInfo={false}
                  />
                  <div className="dc-progress-meta">
                    <span>{c.current}/{c.target}</span>
                    <span className="dc-xp">+{c.xpReward} XP</span>
                  </div>
                </div>
              </div>
              <div className="dc-item__actions">
                {c.isCompleted && !c.claimed && (
                  <Button size="small" type="primary" className="dc-claim-btn" onClick={() => claim(c.key)}>Ödülü Al</Button>
                )}
                {c.isCompleted && c.claimed && <span className="dc-claimed-label">✓</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DailyChallenges;
