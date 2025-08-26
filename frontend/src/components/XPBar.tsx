import React from 'react';
import { Progress, Tooltip, Space, Tag } from 'antd';

interface XPBarProps {
  totalXP: number;
  currentLevel: number;
  currentLevelXP: number; // xp inside current level
  nextLevelXP: number; // cumulative threshold for next level
}

// We assume cumulative curve; need previous level cumulative for percent
function prevLevelCumulative(level: number) {
  if (level <= 1) return 0;
  // Mirror backend approximate (not perfect but UI only)
  let total = 0;
  for (let i = 1; i < level; i++) total += Math.round(250 * Math.pow(i, 1.6));
  return total;
}

const XPBar: React.FC<XPBarProps> = ({ totalXP, currentLevel, currentLevelXP, nextLevelXP }) => {
  const prevCum = prevLevelCumulative(currentLevel);
  const neededForThis = nextLevelXP - prevCum;
  const percent = neededForThis > 0 ? Math.min(100, (currentLevelXP / neededForThis) * 100) : 100;
  const remaining = Math.max(0, neededForThis - currentLevelXP);
  return (
    <Tooltip title={`Seviye ${currentLevel} • Kalan ${remaining} XP`}>
      <Space direction="vertical" style={{ width: '100%' }} size={4}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span>Seviye {currentLevel}</span>
          <span>{currentLevelXP} / {neededForThis} XP</span>
        </div>
        <Progress percent={percent} size="small" strokeColor="#faad14" showInfo={false} />
        <div style={{ display: 'flex', gap: 4 }}>
          <Tag color="gold" style={{ margin: 0 }}>Toplam {totalXP}</Tag>
        </div>
      </Space>
    </Tooltip>
  );
};

export default XPBar;
