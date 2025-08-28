import React from 'react';
import { Button, Select, Segmented, Space } from 'antd';

export interface PracticeSelectorProps {
  topics: string[];
  practiceTopic?: string;
  practiceCount: number;
  mode: 'manage' | 'practice';
  setPracticeTopic: (v: string|undefined)=>void;
  setPracticeCount: (n:number)=>void;
  setMode: (m:'manage'|'practice')=>void;
  beginPractice: ()=>void;
}

const PracticeSelector: React.FC<PracticeSelectorProps> = ({ topics, practiceTopic, practiceCount, mode, setPracticeTopic, setPracticeCount, setMode, beginPractice }) => (
  <Space direction="vertical" style={{ width:'100%' }}>
    <Select
      placeholder="Konu Seç"
      options={topics.map(t => ({ value:t, label:t }))}
      value={practiceTopic}
      onChange={v => setPracticeTopic(v)}
      allowClear
    />
    <Select
      value={practiceCount}
      onChange={v => setPracticeCount(v)}
      options={[5,10,15,20].map(n => ({ value:n, label: `${n} kart` }))}
    />
    <Button block type="primary" onClick={beginPractice} disabled={!practiceTopic}>Başlat</Button>
    <Segmented
      options={[{ label:'Kartlar', value:'manage' }, { label:'Alıştırma', value:'practice' }]}
      value={mode}
      onChange={v => setMode(v as any)}
    />
  </Space>
);

export default PracticeSelector;
