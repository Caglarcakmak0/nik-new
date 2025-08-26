import React from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { minutesToDisplay } from '../useAdvancedAnalytics';

interface Props {
  data: Array<{ label: string; minutes: number; sessions: number; avgQuality: number }>;
}

const LineTimeSeriesChart: React.FC<Props> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis yAxisId="left" />
        <Tooltip formatter={(value: any, name: string) => {
          if (name === 'Süre (dk)') return [minutesToDisplay(value as number), name];
          return [value, name];
        }} />
        <Legend />
        <Line type="monotone" dataKey="minutes" name="Süre (dk)" stroke="#1890ff" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="sessions" name="Oturum" stroke="#52c41a" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="avgQuality" name="Kalite" stroke="#faad14" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineTimeSeriesChart;