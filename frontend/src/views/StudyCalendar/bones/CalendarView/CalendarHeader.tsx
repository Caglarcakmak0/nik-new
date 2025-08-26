import React from 'react';
import { Select, Button, Space, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import { ViewMode } from '../../types';

const { Option } = Select;

interface CalendarHeaderProps {
  value: Dayjs;
  onChange: (date: Dayjs) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  value,
  onChange,
  viewMode,
  setViewMode
}) => {
  const start = 0;
  const end = 12;
  const monthOptions: JSX.Element[] = [];
  const months = [
    'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
    'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'
  ];
  
  for (let i = start; i < end; i++) {
    monthOptions.push(<Option key={i} value={i}>{months[i]}</Option>);
  }
  
  const month = value.month();
  const year = value.year();

  return (
    <div style={{
      padding: '16px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderRadius: 12,
      marginBottom: 16
    }}>
      <Space size="middle">
        <Button
          type="text"
          size="small"
          icon={<LeftOutlined />}
          onClick={() => onChange(value.clone().subtract(1, viewMode))}
          style={{ color: '#6b7280' }}
        />
        <Select
          size="small"
          value={month}
          onChange={(m) => onChange(value.clone().month(m))}
          style={{ minWidth: 100 }}
        >
          {monthOptions}
        </Select>
        <Select
          size="small"
          value={year}
          onChange={(y) => onChange(value.clone().year(y))}
          style={{ minWidth: 80 }}
        >
          {Array.from({ length: 10 }, (_, i) => year - 5 + i).map(y => (
            <Option key={y} value={y}>{y}</Option>
          ))}
        </Select>
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={() => onChange(value.clone().add(1, viewMode))}
          style={{ color: '#6b7280' }}
        />
      </Space>
      
      <Space size="middle">
        <Select
          size="small"
          value={viewMode}
          onChange={setViewMode}
          style={{ minWidth: 120 }}
        >
          <Option value="month">Ay Görünümü</Option>
          <Option value="year">Yıl Görünümü</Option>
        </Select>
        
        {viewMode === 'month' && (
          <Tooltip
            placement="bottomRight"
            title={
              <div style={{ padding: '8px 0' }}>
                <div style={{ marginBottom: 6, fontWeight: 600, color: '#fff' }}>Çalışma Yoğunluk</div>
                {[
                  ['0 dk', '#f8fafc', '#e2e8f0'],
                  ['0-30 dk', '#e0f2fe', '#bae6fd'],
                  ['30-60 dk', '#bae6fd', '#7dd3fc'],
                  ['60-90 dk', '#7dd3fc', '#38bdf8'],
                  ['90+ dk', '#38bdf8', '#0ea5e9']
                ].map(([label, bg, border]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ 
                      width: 16, 
                      height: 16, 
                      backgroundColor: bg, 
                      border: `1px solid ${border}`, 
                      borderRadius: 4 
                    }} />
                    <span style={{ fontSize: 11, color: '#fff' }}>{label}</span>
                  </div>
                ))}
                <div style={{ margin: '8px 0 4px', fontWeight: 600, color: '#fff' }}>Plan Tamamlama</div>
                {[
                  ['Mükemmel 90%+', '#10b981'],
                  ['İyi 70-89%', '#3b82f6'],
                  ['Orta 50-69%', '#f59e0b'],
                  ['Düşük <50%', '#ef4444']
                ].map(([label, color]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <div style={{ width: 16, height: 16, background: color, borderRadius: 4 }} />
                    <span style={{ fontSize: 11, color: '#fff' }}>{label}</span>
                  </div>
                ))}
                <div style={{ marginTop: 8, fontSize: 10, color: '#94a3b8' }}>
                  Çerçeve rengi plan tamamlama seviyesini gösterir.
                </div>
              </div>
            }
          >
            <Button 
              type="text" 
              size="small" 
              icon={<InfoCircleOutlined />} 
              style={{ color: '#6b7280' }} 
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default CalendarHeader;
