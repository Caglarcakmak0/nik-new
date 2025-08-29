import React, { useMemo } from 'react';
import { SUBJECT_TOPIC_BANK } from '../../constants/subjectTopics';
import { Checkbox, Tag, Input, Space } from 'antd';

export interface TopicDetailed { topic: string; solveQuestions?: boolean; watchVideo?: boolean; durationMinutes?: number }

interface Props {
  subject: string;
  value: TopicDetailed[];
  onChange: (val: TopicDetailed[]) => void;
}

// Çoklu konu seçimi + her konu için çalışma türü (soru / video) işaretlenmesi
const TopicMultiSelect: React.FC<Props> = ({ subject, value, onChange }) => {
  const topics = SUBJECT_TOPIC_BANK[subject] || [];
  const map = useMemo(() => {
    const m: Record<string, TopicDetailed> = {};
    (value||[]).forEach(t=> { if (t.topic) m[t.topic] = t; });
    return m;
  }, [value]);

  const toggleTopic = (topic: string) => {
    const exists = map[topic];
    let next: TopicDetailed[];
    if (exists) {
      // remove
      next = value.filter(t=> t.topic !== topic);
    } else {
      next = [...value, { topic, solveQuestions: true, watchVideo: false }];
    }
    onChange(next);
  };

  const toggleField = (topic: string, field: 'solveQuestions' | 'watchVideo') => {
    const next = value.map(t => t.topic === topic ? { ...t, [field]: !t[field] } : t);
    onChange(next);
  };

  const applyDuration = (topic: string, minutes: number) => {
    const next = value.map(t => t.topic === topic ? { ...t, durationMinutes: minutes } : t);
    onChange(next);
  };

  const DURATION_PRESETS = [30,45,60,120,90]; // 90 will display as 1s 30dk

  const formatPreset = (m:number) => {
    if (m === 60) return '1s';
    if (m === 120) return '2s';
    if (m === 90) return '1s30d';
    return m + 'dk';
  };

  // Yeni konu ekleme (liste dışı serbest giriş)
  const addCustom = (name: string) => {
    const t = name.trim();
    if (!t) return;
    if (value.some(v=> v.topic.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, { topic: t, solveQuestions: true, watchVideo: false }]);
  };

  return (
    <div className="topic-multi-select">
      <div className="topic-bank">
        {topics.length === 0 && <div style={{ fontSize:12, color:'#888' }}>Konu bankası boş</div>}
        <div className="topic-list-grid">
          {topics.map(tp => {
            const active = !!map[tp];
            return (
              <Tag
                key={tp}
                color={active ? 'blue' : undefined}
                className={`topic-pill ${active ? 'is-active' : ''}`}
                onClick={()=> toggleTopic(tp)}
                style={{ cursor:'pointer', marginBottom:4 }}
              >{tp}</Tag>
            );
          })}
        </div>
      </div>
      {value.length > 0 && (
        <div className="selected-topics">
          {value.map(t => (
            <div key={t.topic} className="selected-topic-row">
              <span className="topic-name" onClick={()=> toggleTopic(t.topic)}>{t.topic}</span>
              <Space size={4} wrap>
                <Checkbox
                  checked={t.solveQuestions}
                  onChange={()=> toggleField(t.topic, 'solveQuestions')}
                >Soru</Checkbox>
                <div className="preset-bar">
                  {DURATION_PRESETS.map(p => (
                    <span
                      key={p}
                      className={`preset-pill ${t.durationMinutes===p ? 'is-active':''}`}
                      onClick={()=> applyDuration(t.topic, p)}
                    >{formatPreset(p)}</span>
                  ))}
                </div>
                <Checkbox
                  checked={t.watchVideo}
                  onChange={()=> toggleField(t.topic, 'watchVideo')}
                >Video</Checkbox>
              </Space>
            </div>
          ))}
        </div>
      )}
      <Input.Search
        size="small"
        allowClear
        placeholder="Özel konu ekle"
        onSearch={addCustom}
        style={{ marginTop:8 }}
      />
    </div>
  );
};

export default TopicMultiSelect;
