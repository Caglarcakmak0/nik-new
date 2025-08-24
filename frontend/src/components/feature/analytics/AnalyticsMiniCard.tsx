import React from 'react';
import { Card, Skeleton } from 'antd';
// Recharts retained as fallback; we add a native SVG option for a cleaner custom design
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './AnalyticsMiniCard.scss';

export interface AnalyticsMiniCardProps {
  title: string;
  subValue: string | number; // primary display
  color?: string;
  data?: number[]; // sparkline series
  loading?: boolean;
  height?: number;
  positive?: boolean; // for color hint if no color provided
  deltaValue?: string | number; // optional delta tag (e.g., rank)
  deltaPercent?: number; // optional delta %
  deltaPositive?: boolean; // override delta color polarity
  chartMode?: 'svg' | 'recharts'; // choose rendering implementation
  smooth?: boolean; // smooth line (svg mode)
}

const AnalyticsMiniCard: React.FC<AnalyticsMiniCardProps> = ({
  title,
  subValue,
  color,
  data = [],
  loading,
  height = 74,
  positive,
  deltaValue,
  deltaPercent,
  deltaPositive,
  chartMode = 'recharts',
  smooth = false,
}) => {
  const series = data.map((v, i) => ({ x: i, y: v }));
  let isPositive = positive;
  if (subValue !== undefined && subValue !== null) {
    const num = parseFloat(String(subValue).replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(num)) {
      if (num > 0) isPositive = true;
      if (num < 0) isPositive = false;
    }
  }
  const stroke = color || (isPositive ? '#16a34a' : '#dc2626');
  const gradientId = 'amcGrad-' + title.replace(/\s+/g, '-').toLowerCase();
  const showDelta = deltaValue !== undefined || deltaPercent !== undefined;
  const deltaColor = deltaPositive === false ? '#dc2626' : '#16a34a';


  return (
    <Card
      className={`analytics-mini-card ${isPositive ? 'is-positive' : 'is-negative'}`}
      size="small"
      bodyStyle={{ padding: 0, position: 'relative', minHeight: height }}
      bordered={false}
    >
      {loading ? (
        <div style={{ padding: 12 }}><Skeleton active paragraph={false} title /></div>
      ) : (
        <div className="amc-content">
          <div className="amc-chart-side">
            <div className="amc-chart-wrapper">
              {series.length > 0 && (
                chartMode === 'recharts' ? (
                  <ResponsiveContainer width="100%" height={75}>
                    <AreaChart data={series} margin={{ top: 30 , right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={stroke} stopOpacity={0.55} />
                          <stop offset="95%" stopColor={stroke} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke={stroke}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={false}
                        activeDot={{ r: 4, strokeWidth: 0, fill: stroke, fillOpacity: 0.9 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  svgContent
                )
              )}
            </div>
            <div className="amc-title-overlay">{title}</div>
          </div>
          <div className="amc-stat-side">
            <div className="amc-main-value">{subValue ?? '-'}</div>
            {showDelta && (
              <div className="amc-deltas-inline">
                {deltaValue !== undefined && (
                  <span className="amc-delta-pill" style={{ background: deltaColor }}>{deltaValue}</span>
                )}
                {deltaPercent !== undefined && (
                  <span className="amc-delta-pill" style={{ background: deltaColor }}>
                    {(deltaPercent > 0 ? '+' : '') + deltaPercent + '%'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AnalyticsMiniCard;
