import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Card, Calendar, Badge, Typography } from 'antd';
import type { CalendarProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { getStudentPrograms } from '../../../../services/api';
import { useIsStudent } from '../../../../contexts/AuthContext';

const { Title, Text } = Typography;

interface MonthlyCalendarProps {
  selectedDate: Dayjs;
  onDateSelect: (date: Dayjs) => void;
  currentPlan?: any;
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  selectedDate,
  onDateSelect,
  currentPlan
}) => {
  const isStudent = useIsStudent();
  const [monthlyStats, setMonthlyStats] = useState<Record<string, { completionRate: number; netScore: number }>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const monthKey = useMemo(() => selectedDate.format('YYYY-MM'), [selectedDate]);

  const fetchMonthly = useCallback(async (baseDate: Dayjs) => {
    if (!isStudent) {
      setMonthlyStats({});
      return;
    }
    try {
      setIsLoading(true);
      const start = baseDate.startOf('month').toDate().toISOString();
      const end = baseDate.endOf('month').toDate().toISOString();
      const res = await getStudentPrograms({ from: start, to: end, limit: 200 });
      const items: Array<any> = res?.data || [];
      const map: Record<string, { completionRate: number; netScore: number }> = {};
      items.forEach((p) => {
        const key = dayjs(p.date).format('YYYY-MM-DD');
        const completionRate = Number(p?.stats?.completionRate) || 0;
        const netScore = Number(p?.stats?.netScore) || 0;
        map[key] = { completionRate, netScore };
      });
      setMonthlyStats(map);
    } catch (e) {
      // Arayüzde sessizce devam et
      setMonthlyStats({});
      // console.error('Aylık veriler alınamadı', e);
    } finally {
      setIsLoading(false);
    }
  }, [isStudent]);

  useEffect(() => {
    fetchMonthly(selectedDate);
  }, [fetchMonthly, monthKey]);
  
  const dateCellRender = (value: Dayjs) => {
    const dateString = value.format('YYYY-MM-DD');
    const today = dayjs().format('YYYY-MM-DD');
    const dayData = monthlyStats[dateString];

    // Bugün ise ve currentPlan varsa güncel değerleri göster
    if (dateString === today && currentPlan) {
      const completionRate = currentPlan.stats?.completionRate || 0;
      const netScore = currentPlan.stats?.netScore || 0;
      const status = completionRate >= 90 ? 'success' : 
                     completionRate >= 70 ? 'processing' : 
                     completionRate >= 50 ? 'warning' : 'error';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '9px' }}>
          <Badge 
            status={status} 
            text={`${Math.round(completionRate)}%`}
            style={{ fontSize: '9px', marginBottom: '2px' }}
          />
          <span style={{ color: '#666', fontSize: '8px' }}>
            Net: {netScore.toFixed(1)}
          </span>
        </div>
      );
    }

    if (dayData) {
      const status = dayData.completionRate >= 90 ? 'success' : 
                     dayData.completionRate >= 70 ? 'processing' : 
                     dayData.completionRate >= 50 ? 'warning' : 'error';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '9px' }}>
          <Badge 
            status={status} 
            text={`${Math.round(dayData.completionRate)}%`}
            style={{ fontSize: '9px', marginBottom: '2px' }}
          />
          <span style={{ color: '#666', fontSize: '8px' }}>
            Net: {Math.round(dayData.netScore * 10) / 10}
          </span>
        </div>
      );
    }
    return null;
  };

  const onPanelChange: CalendarProps<Dayjs>['onPanelChange'] = (value) => {
    fetchMonthly(value);
  };

  const onSelect: CalendarProps<Dayjs>['onSelect'] = (value) => {
    onDateSelect(value);
  };

  return (
    <Card title="Aylık Çalışma Takvimi">
      <Calendar
        value={selectedDate}
        onSelect={onSelect}
        onPanelChange={onPanelChange}
        dateCellRender={dateCellRender}
        headerRender={({ value, type, onChange, onTypeChange }) => (
          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>
              {value.format('MMMM YYYY')}
            </Title>
          </div>
        )}
      />
      
      {/* Legend */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '16px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="success" />
          <Text type="secondary">Mükemmel (90%+)</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="processing" />
          <Text type="secondary">İyi (70-89%)</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="warning" />
          <Text type="secondary">Orta (50-69%)</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="error" />
          <Text type="secondary">Zayıf (50%+)</Text>
        </div>
      </div>
    </Card>
  );
};

export default MonthlyCalendar;