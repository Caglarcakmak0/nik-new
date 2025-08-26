import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Cell } from 'recharts';
import { minutesToDisplay } from '../useAdvancedAnalytics';
import { chartPalette } from '../chartConstants';

interface Props {
  data: Array<{ subject: string; minutes: number }>;
}

const SubjectBarChart: React.FC<Props> = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <BarChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="subject" />
      <YAxis />
      <Tooltip formatter={(value: any) => [minutesToDisplay(value as number), 'Süre (dk)']} />
      <Legend />
      <Bar dataKey="minutes" name="Süre (dk)">
        {data.map((_, index) => (
          <Cell key={`cell-sub-${index}`} fill={chartPalette[index % chartPalette.length]} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export default SubjectBarChart;