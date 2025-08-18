import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, Calendar, Badge, Typography } from 'antd';
import type { CalendarProps } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { getAdminStudentPrograms } from '../../services/api';

const { Title, Text } = Typography;

type Props = {
  studentId: string;
  selectedDate?: Dayjs;
  onDateSelect?: (date: Dayjs) => void;
  title?: string;
};

const StudentMonthlyCalendar: React.FC<Props> = ({ studentId, selectedDate: selectedDateProp, onDateSelect, title = 'Aylık Çalışma Takvimi' }) => {
  const [selectedDate, setSelectedDate] = useState<Dayjs>(selectedDateProp || dayjs());
  const [monthlyStats, setMonthlyStats] = useState<Record<string, { completionRate: number; netScore: number }>>({});
  const monthKey = useMemo(() => selectedDate.format('YYYY-MM'), [selectedDate]);

  useEffect(() => {
    if (selectedDateProp) setSelectedDate(selectedDateProp);
  }, [selectedDateProp]);

  const fetchMonthly = useCallback(async (baseDate: Dayjs) => {
    if (!studentId) {
      setMonthlyStats({});
      return;
    }
    try {
      const start = baseDate.startOf('month').toDate().toISOString();
      const end = baseDate.endOf('month').toDate().toISOString();
      const res = await getAdminStudentPrograms(studentId, { from: start, to: end, limit: 200, source: 'coach' });
      const items: Array<any> = res?.data || [];
      const map: Record<string, { completionRate: number; netScore: number }> = {};
      items.forEach((p: any) => {
        const key = dayjs(p.date).format('YYYY-MM-DD');
        const completionRate = Number(p?.stats?.completionRate) || 0;
        const netScore = Number(p?.stats?.netScore) || 0;
        map[key] = { completionRate, netScore };
      });
      setMonthlyStats(map);
    } catch {
      setMonthlyStats({});
    }
  }, [studentId]);

  useEffect(() => {
    fetchMonthly(selectedDate);
  }, [fetchMonthly, monthKey]);

  const dateCellRender = (value: Dayjs) => {
    const dateString = value.format('YYYY-MM-DD');
    const dayData = monthlyStats[dateString];
    if (dayData) {
      const status = dayData.completionRate >= 90 ? 'success' :
        dayData.completionRate >= 70 ? 'processing' :
          dayData.completionRate >= 50 ? 'warning' : 'error';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '9px' }}>
          <Badge
            status={status as any}
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
    setSelectedDate(value);
    fetchMonthly(value);
  };

  const onSelect: CalendarProps<Dayjs>['onSelect'] = (value) => {
    setSelectedDate(value);
    if (onDateSelect) onDateSelect(value);
  };

  return (
    <Card title={title} size="small">
      <Calendar
        value={selectedDate}
        onSelect={onSelect}
        onPanelChange={onPanelChange}
        dateCellRender={dateCellRender}
        headerRender={({ value }) => (
          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
            <Title level={5} style={{ margin: 0 }}>
              {value.format('MMMM YYYY')}
            </Title>
          </div>
        )}
      />
      <div style={{ marginTop: '12px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="success" />
          <Text type="secondary">90%+</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="processing" />
          <Text type="secondary">70-89%</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="warning" />
          <Text type="secondary">50-69%</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Badge status="error" />
          <Text type="secondary">0-49%</Text>
        </div>
      </div>
    </Card>
  );
};

export default StudentMonthlyCalendar;


