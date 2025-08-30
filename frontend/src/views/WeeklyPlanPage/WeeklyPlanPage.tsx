import React from 'react';
import { DatePicker, Space, Alert } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import WeeklyPlanView from '../StudyPlanPage/bones/WeeklyPlan/WeeklyPlanView';
import AISuggestionsPanel from '../../components/AISuggestions/AISuggestionsPanel';
import './bones/weeklyPlanLayout.scss';
import { useAuth } from '../../contexts/AuthContext';

// Typography removed in redesign

const WeeklyPlanPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState<Dayjs>(dayjs());

  const isFree = user?.plan?.tier === 'free';

  return (
    <div style={{ padding: 12 }}>
      <div className="weekly-plan-layout">
        <div className="weekly-plan-layout__header">
          <div className="weekly-plan-layout__title-block">
            <h1 className="wpl-heading">Haftalık Çalışma Programı</h1>
            <p className="wpl-desc">Free plan öğrencileri için esnek haftalık planlama</p>
          </div>
          <div className="weekly-plan-layout__actions">
            <Space>
              <DatePicker value={selectedDate} onChange={(d)=> d && setSelectedDate(d)} format="DD MMM YYYY" />
            </Space>
          </div>
        </div>

        {!isFree && (
          <Alert type="warning" showIcon message="Bu sayfa ücretsiz kullanıcı alanı" description="Premium kullanıcılar günlük detaylı koç programı ekranını kullanır. Free plan ile haftalık basit planlama burada sunulur." style={{ marginBottom:20 }} />
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, alignItems:'start' }}>
          <WeeklyPlanView referenceDate={selectedDate} />
          <AISuggestionsPanel scope="weekly_plan" onAccepted={()=> {/* could refresh via event; rely on weekly plan fetch after accept */}} />
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlanPage;
