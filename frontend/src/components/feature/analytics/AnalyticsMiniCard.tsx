import React from 'react';
import { Card, Skeleton, Switch, Tooltip } from 'antd';
// Recharts retained as fallback; we add a native SVG option for a cleaner custom design
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './AnalyticsMiniCard.scss';

export interface AnalyticsMiniCardProps {
  title: string;
  subValue: string | number; // primary display
  data?: number[]; // sparkline series
  loading?: boolean;
  height?: number;
  positive?: boolean; // for color hint if no color provided
  deltaValue?: string | number; // optional delta tag (e.g., rank)
  deltaPercent?: number; // optional delta %
  deltaPositive?: boolean; // override delta color polarity
  previousValue?: number | string; // previous state for auto change pills
  useFallbackWhenEmpty?: boolean; // show demo sparkline if data empty
  fallbackData?: number[]; // custom fallback series
  fallbackPattern?: 'mixed' | 'up' | 'down' | 'volatile' | 'flat'; // pattern for auto mock
  mockMode?: boolean; // force mock (overrides real data)
  enableMockSwitch?: boolean; // show internal toggle switch
  onMockModeChange?: (mock: boolean) => void; // callback when toggled
}

const AnalyticsMiniCard: React.FC<AnalyticsMiniCardProps> = ({
  title,
  subValue,
  data = [],
  loading,
  height = 74,
  positive,
  deltaValue,
  deltaPercent,
  deltaPositive,
  previousValue,
  useFallbackWhenEmpty = true,
  fallbackData,
  fallbackPattern = 'mixed',
  mockMode,
  enableMockSwitch = false,
  onMockModeChange,
}) => {
  const defaultFallback = React.useMemo(() => {
    const len = 12;
    const patterns: Record<string, number[]> = {
      mixed: [-3, 2, -1, 4, -2, 5, -4, 6, -3, 7, -1, 5],
      up: Array.from({ length: len }, (_, i) => 2 + i * 2 + (i % 2 ? 1 : 0)),
      down: Array.from({ length: len }, (_, i) => 30 - i * 2 - (i % 2 ? 1 : 0)),
      volatile: (() => { let v = 5; const arr:number[] = []; for (let i=0;i<len;i++){ v += (Math.random()*8 - 4); arr.push(Math.round(v)); } return arr; })(),
      flat: Array.from({ length: len }, () => 5)
    };
    return patterns[fallbackPattern] || patterns.mixed;
  }, [fallbackPattern]);
  const [mockOn, setMockOn] = React.useState<boolean>(!!mockMode);
  React.useEffect(() => {
    if (mockMode !== undefined) setMockOn(!!mockMode);
  }, [mockMode]);

  // Global navbar mock switch listener (uncontrolled mode only)
  React.useEffect(() => {
    if (mockMode !== undefined) return; // controlled; ignore global
    const handler = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (detail && typeof detail.enabled === 'boolean') {
        setMockOn(detail.enabled);
      }
    };
    window.addEventListener('global-mock-mode', handler as any);
    return () => window.removeEventListener('global-mock-mode', handler as any);
  }, [mockMode]);

  const computeMockSeries = () => (fallbackData && fallbackData.length ? fallbackData : defaultFallback);
  const noRealData = !data || data.length === 0;
  const shouldUseMock = mockOn || (noRealData && useFallbackWhenEmpty);
  const sourceData = shouldUseMock ? computeMockSeries() : (data || []);
  const isFallback = shouldUseMock;
  const series = sourceData.map((v, i) => ({ x: i, y: v }));

  let isPositive = positive;
  if (subValue !== undefined && subValue !== null) {
    const num = parseFloat(String(subValue).replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(num)) {
      if (num > 0) isPositive = true;
      if (num < 0) isPositive = false;
    }
  }
  // stroke rengi daha sonra trend yönüne göre atanacak
  let stroke: string = '#2563eb'; // default flat mavi
  const gradientId = 'amcGrad-' + title.replace(/\s+/g, '-').toLowerCase();
  const showDelta = deltaValue !== undefined || deltaPercent !== undefined;
  const deltaColor = deltaPositive === false ? '#dc2626' : '#16a34a';

  // Auto change computation (previousValue -> arrow + percent);
  // Eğer previousValue yoksa data serisinin son 2 noktasından türet.
  let autoPercent: number | null = null;
  let direction: 'up' | 'down' | 'flat' = 'flat';
  const currParsed = parseFloat(String(subValue).replace(/[^0-9.-]/g, ''));
  if (previousValue !== undefined && previousValue !== null) {
    const prevParsed = parseFloat(String(previousValue).replace(/[^0-9.-]/g, ''));
    if (!Number.isNaN(currParsed) && !Number.isNaN(prevParsed)) {
      if (prevParsed === 0) {
        if (currParsed === 0) {
          autoPercent = 0;
        } else {
          autoPercent = 100;
        }
      } else {
        autoPercent = ((currParsed - prevParsed) / Math.abs(prevParsed)) * 100;
      }
    }
  } else if (series.length >= 2) {
    const last = series[series.length - 1].y;
    const prev = series[series.length - 2].y;
    if (prev === 0) {
      autoPercent = last === 0 ? 0 : 100;
    } else {
      autoPercent = ((last - prev) / Math.abs(prev)) * 100;
    }
  }
  if (autoPercent !== null) {
    if (autoPercent > 0.0001) direction = 'up';
    else if (autoPercent < -0.0001) direction = 'down';
    else direction = 'flat';
  }
  const arrowSymbol = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '⟷';
  const arrowColor = direction === 'up' ? '#16a34a' : direction === 'down' ? '#dc2626' : '#2563eb';
  const percentColor = arrowColor;

  // İSTENEN: artış = yeşil, düşüş = kırmızı, düz = mavi
  const directionColorMap: Record<typeof direction, string> = {
    up: '#16a34a',
    down: '#dc2626',
    flat: '#2563eb'
  };
  stroke = directionColorMap[direction];

  // Display value: if in mock mode and original subValue not meaningful, derive from mock series last point
  const displayValue = (mockOn && series.length > 0 && (subValue === null || subValue === undefined))
    ? series[series.length - 1].y
    : subValue;

  return (
    <Card
      className={`analytics-mini-card ${isPositive ? 'is-positive' : 'is-negative'} ${isFallback ? 'is-fallback' : ''}`}
  size="small"
  styles={{ body: { padding: 0, position: 'relative', minHeight: height } }}
  variant="borderless"
      data-fallback={isFallback || undefined}
    >
      {loading ? (
        <div style={{ padding: 12 }}><Skeleton active paragraph={false} title /></div>
      ) : (
        <div className="amc-content">
          <div className="amc-chart-side">
            <div className="amc-chart-wrapper">
              {series.length > 0 && (
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
              )}
            </div>
            <div className="amc-title-overlay">{title}</div>
          </div>
          <div className="amc-stat-side">
            {enableMockSwitch && (
              <div className="amc-mock-switch">
                <Tooltip title={mockOn ? 'Mock veri açık' : 'Gerçek veri'}>
                  <Switch
                    size="small"
                    checked={mockOn}
                    onChange={(v) => { setMockOn(v); onMockModeChange?.(v); }}
                  />
                </Tooltip>
              </div>
            )}
            <div className="amc-main-value">{displayValue ?? '-'}</div>
            {autoPercent !== null ? (
              <div className="amc-pills-row">
                <span className="amc-pill amc-pill-arrow" style={{ background: arrowColor }} aria-label={`direction ${direction}`}>{arrowSymbol}</span>
                <span className="amc-pill amc-pill-percent" style={{ background: percentColor }} aria-label={`change ${(autoPercent).toFixed(2)}%`}>
                  {(autoPercent > 0 ? '+' : autoPercent < 0 ? '' : '') + autoPercent.toFixed(1) + '%'}
                </span>
              </div>
            ) : showDelta ? (
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
            ) : null}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AnalyticsMiniCard;
