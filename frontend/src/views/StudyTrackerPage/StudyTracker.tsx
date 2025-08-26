import React, { useEffect } from "react";
import { Typography, Space, Card, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HistoryOutlined, CalendarOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import './StudyTracker.scss';
import dayjs from "dayjs";  
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr"; // Türkçe locale

// Plugins'leri aktif et
dayjs.extend(relativeTime);
dayjs.locale("tr");

// Basit redirect component
const StudyTracker: React.FC = () => {
  const navigate = useNavigate();
  useAuth(); // kullanıcı bilgisi başka yerlerde tetikleyebilir; label artık conditional değil
  useEffect(() => {
    // Legacy route: redirect to sessions page
    navigate('/study-tracker/sessions', { replace: true });
  }, [navigate]);

  return (
    <div className="study-tracker">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
  <Typography.Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: '24px' }}>Çalışma Zamanlayıcı</Typography.Title>
        <Card>
          <Space wrap>
            <Button icon={<HistoryOutlined />} onClick={() => navigate('/study-tracker/timer')}>Serbest Zamanlayıcı</Button>
            <Button icon={<HistoryOutlined />} onClick={() => navigate('/study-tracker/sessions')}>Oturum Geçmişi</Button>
            <Button icon={<CalendarOutlined />} onClick={() => navigate('/study-tracker/calendar')}>Takvim</Button>
            <Button icon={<TrophyOutlined />} onClick={() => navigate('/study-tracker/study-room')}>Çalışma Odası</Button>
            <Button icon={<UserOutlined />} onClick={() => navigate('/study-tracker/coach-programs')}>Günlük Programlar</Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default StudyTracker;
