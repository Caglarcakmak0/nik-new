import React from 'react';
import { Popover } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import './AnalyticsRangeCard.scss';

export type AnalyticsRange = 'daily' | 'weekly' | 'monthly' | 'all';

export interface AnalyticsRangeCardProps {
  value: AnalyticsRange;
  onChange: (val: AnalyticsRange) => void;
}

const options: { label: string; value: AnalyticsRange }[] = [
  { label: 'Günlük', value: 'daily' },
  { label: 'Haftalık', value: 'weekly' },
  { label: 'Aylık', value: 'monthly' },
  { label: 'Tümü', value: 'all' },
];

const labelMap: Record<AnalyticsRange, string> = {
  daily: 'Günlük',
  weekly: 'Haftalık',
  monthly: 'Aylık',
  all: 'Tümü'
};

const AnalyticsRangeCard: React.FC<AnalyticsRangeCardProps> = ({ value, onChange }) => {
  const content = (
    <div className="arc-menu" data-range-menu>
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          className={`arc-menu-item ${o.value === value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <Popover trigger={["click"]} placement="bottomLeft" content={content} overlayClassName="analytics-range-pop">
      <button type="button" className="analytics-range-trigger">
        <FilterOutlined className="arc-icon" />
        <span className="arc-label">{labelMap[value]}</span>
      </button>
    </Popover>
  );
};

export default AnalyticsRangeCard;
