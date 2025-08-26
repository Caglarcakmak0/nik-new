import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell } from 'recharts';
import { chartPalette } from '../chartConstants';

interface Props {
  data: Array<{ technique: string; minutes: number }>;
}

const TechniquePieChart: React.FC<Props> = ({ data }) => (
  <ResponsiveContainer width="100%" height={280}>
    <PieChart>
      <Pie
        data={data}
        dataKey="minutes"
        nameKey="technique"
        cx="50%"
        cy="50%"
        outerRadius={90}
        label
      >
        {data.map((_, index) => (
          <Cell key={`cell-tech-${index}`} fill={chartPalette[index % chartPalette.length]} />
        ))}
      </Pie>
      <Tooltip formatter={(value: any, _name, info) => [`${value} dk`, info.payload.technique]} />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

export default TechniquePieChart;