import React from 'react';
import './xpBar.scss';

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
  const neededForThis = Math.max(0, nextLevelXP - prevCum);
  const percent = neededForThis > 0 ? Math.min(100, (currentLevelXP / neededForThis) * 100) : 100;
  const remaining = Math.max(0, neededForThis - currentLevelXP);
  const isMaxed = neededForThis === 0 || percent >= 100;

  return (
    <div className="xp-bar" aria-label={`Seviye ${currentLevel} ilerleme çubuğu`}>
      <div className="xp-bar__head">
        <span className="xp-bar__level-badge">Lv {currentLevel}</span>
        <span className="xp-bar__numbers">{isMaxed ? 'MAX' : `${currentLevelXP} / ${neededForThis} XP`}</span>
      </div>
      <div className="xp-bar__track" role="progressbar" aria-valuemin={0} aria-valuemax={neededForThis || 100} aria-valuenow={isMaxed ? neededForThis || 100 : currentLevelXP} aria-valuetext={`%${Math.round(percent)}`}>
        <div className="xp-bar__fill" style={{ width: `${percent}%` }}>
          <span className="xp-bar__shine" />
        </div>
        {!isMaxed && <span className="xp-bar__percent">%{Math.round(percent)}</span>}
      </div>
      <div className="xp-bar__footer">
        <span className="xp-bar__total">Toplam {totalXP} XP</span>
        {!isMaxed && <span className="xp-bar__remaining">Kalan {remaining} XP</span>}
        {isMaxed && <span className="xp-bar__max">Seviye Tamamlandı</span>}
      </div>
    </div>
  );
};

export default XPBar;
