import React, { useEffect, useMemo, useState } from 'react';
import { Card, List, Avatar, Button, Segmented, Tag, Space, message, Popconfirm, Modal, Statistic, Row, Col, Progress } from 'antd';
import { RocketOutlined, ThunderboltOutlined, PlayCircleOutlined, HistoryOutlined, TrophyOutlined, FireOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';
import { getStudyRoomActivity, getActiveDuels, inviteDuel, respondDuel, apiRequest, type StudyRoomActivityItem, type Duel } from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import StudyTimer from '../StudyTimer/StudyTimer';

dayjs.extend(relativeTime);
dayjs.locale('tr');

const formatMinutes = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} dk`;
  return `${h}s ${m}d`;
};

const StudyRoom: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<StudyRoomActivityItem[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [showStudyTimer, setShowStudyTimer] = useState(false);
  const [studyRoomSessions, setStudyRoomSessions] = useState<any[]>([]);
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [act, activeDuels, sessions] = await Promise.all([
        getStudyRoomActivity(period),
        getActiveDuels(),
        fetchStudyRoomSessions()
      ]);
      setActivity(act.data || []);
      setDuels(activeDuels.data || []);
      setStudyRoomSessions(sessions);
    } catch (e: any) {
      message.error(e?.message || 'Veri alınamadı');
    } finally {
      setLoading(false);
    }
  };

  // Çalışma odası oturumlarını getir
  const fetchStudyRoomSessions = async () => {
    try {
      const response = await apiRequest('/study-sessions', { method: 'GET' });
      return response.filter((session: any) => session.location === 'study_room' || session.studyRoom === true);
    } catch (error) {
      console.error('Study room sessions fetch error:', error);
      return [];
    }
  };

  // Çalışma odası timer oturumu tamamlandığında
  const handleStudyRoomSessionComplete = async (sessionData: any) => {
    try {
      const studyRoomSessionData = {
        ...sessionData,
        location: 'study_room',
        studyRoom: true,
        competitiveMode: true
      };
      
      const response = await apiRequest('/study-sessions', {
        method: 'POST',
        body: JSON.stringify(studyRoomSessionData),
      });
      
              message.success('Çalışma odası oturumu kaydedildi!');
      setShowStudyTimer(false);
      await fetchData(); // Verileri yenile
    } catch (error) {
      console.error('Study room session save error:', error);
      message.error('Oturum kaydedilemedi');
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const handleInvite = async (opponentId: string) => {
    try {
      if (!opponentId || opponentId === user?._id) return;
      await inviteDuel(opponentId, period);
      message.success('Düello daveti gönderildi');
      fetchData();
    } catch (e: any) {
      message.error(e?.message || 'Davet gönderilemedi');
    }
  };

  // Kendi study room istatistikleri
  const myStudyRoomStats = useMemo(() => {
    const today = dayjs();
    const todaySessions = studyRoomSessions.filter(s => 
      dayjs(s.date).isSame(today, 'day')
    );
    const weekSessions = studyRoomSessions.filter(s => 
      dayjs(s.date).isSame(today, 'week')
    );
    
    return {
      todayTime: todaySessions.reduce((sum, s) => sum + s.duration, 0),
      todayCount: todaySessions.length,
      weekTime: weekSessions.reduce((sum, s) => sum + s.duration, 0),
      weekCount: weekSessions.length,
      totalTime: studyRoomSessions.reduce((sum, s) => sum + s.duration, 0),
      avgQuality: studyRoomSessions.length > 0 
        ? studyRoomSessions.reduce((sum, s) => sum + s.quality, 0) / studyRoomSessions.length 
        : 0
    };
  }, [studyRoomSessions]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Kişisel Çalışma Odası Stats */}
      <Card
        title={
          <Space>
            <TrophyOutlined /> Benim Çalışma Odası Performansım
          </Space>
        }
        extra={
          <Button 
            type="primary" 
            icon={<PlayCircleOutlined />}
            onClick={() => setShowStudyTimer(true)}
          >
            Çalışma Başlat
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Statistic
              title="Bugün"
              value={formatMinutes(myStudyRoomStats.todayTime)}
              prefix={<FireOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {myStudyRoomStats.todayCount} oturum
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Bu Hafta"
              value={formatMinutes(myStudyRoomStats.weekTime)}
              prefix={<RocketOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>
              {myStudyRoomStats.weekCount} oturum
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Toplam Süre"
              value={formatMinutes(myStudyRoomStats.totalTime)}
              prefix={<HistoryOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title="Ortalama Kalite"
              value={myStudyRoomStats.avgQuality.toFixed(1)}
              suffix="/5"
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <RocketOutlined /> Liderlik Tablosu
          </Space>
        }
        extra={
          <Segmented
            options={[{ label: 'Günlük', value: 'daily' }, { label: 'Haftalık', value: 'weekly' }]}
            value={period}
            onChange={(v) => setPeriod(v as any)}
          />
        }
        loading={loading}
      >
        <List
          itemLayout="horizontal"
          dataSource={activity}
          renderItem={(item, index) => (
            <List.Item actions={[
              <Tag color="blue" key="rank">#{index + 1}</Tag>,
              user?._id !== item.userId ? (
                <Button size="small" type="primary" key="invite" onClick={() => handleInvite(item.userId)}>
                  Düello Davet Et
                </Button>
              ) : null
            ]}> 
              <List.Item.Meta
                avatar={<Avatar src={item.avatar || undefined}>{(item.name || 'K').charAt(0)}</Avatar>}
                title={item.name}
                description={
                  <Space size="small">
                    <Tag color="green">Süre: {formatMinutes(item.totalTime)}</Tag>
                    <Tag>Oturum: {item.sessions}</Tag>
                    <Tag color="default">Son: {dayjs(item.lastActivity).fromNow()}</Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Card title={<Space><ThunderboltOutlined /> Aktif Düellolar</Space>} loading={loading}>
        <List
          dataSource={duels}
          renderItem={(d) => (
            <List.Item
              actions={
                d.status === 'pending' && typeof d.opponent !== 'string' && d.opponent?._id === user?._id
                  ? [
                      <Button key="accept" size="small" type="primary" onClick={async () => { await respondDuel(d._id, true); message.success('Kabul edildi'); fetchData(); }}>Kabul Et</Button>,
                      <Popconfirm key="decline" title="Reddet?" onConfirm={async () => { await respondDuel(d._id, false); message.info('Reddedildi'); fetchData(); }}>
                        <Button size="small" danger>Reddet</Button>
                      </Popconfirm>
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={`${(typeof d.challenger === 'string' ? d.challenger : d.challenger?.name) || 'Kullanıcı'} vs ${(typeof d.opponent === 'string' ? d.opponent : d.opponent?.name) || 'Kullanıcı'} (${d.period === 'daily' ? 'Günlük' : 'Haftalık'})`}
                description={
                  <Space>
                    <Tag color="purple">{formatMinutes(d.liveScores?.challengerStudyTimeMin || 0)}</Tag>
                    <span>—</span>
                    <Tag color="volcano">{formatMinutes(d.liveScores?.opponentStudyTimeMin || 0)}</Tag>
                    <Tag color="default">Bitiş: {dayjs(d.endDate).fromNow()}</Tag>
                    <Tag color={d.status === 'pending' ? 'orange' : 'green'}>{d.status.toUpperCase()}</Tag>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Son Çalışma Odası Oturumları */}
      {studyRoomSessions.length > 0 && (
        <Card 
          title={
            <Space>
              <HistoryOutlined /> Son Çalışma Odası Oturumlarım
            </Space>
          }
        >
          <List
            dataSource={studyRoomSessions.slice(0, 5)}
            renderItem={(session) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color="blue">{session.subject?.charAt(0).toUpperCase() + session.subject?.slice(1)}</Tag>
                      <span>{formatMinutes(session.duration)}</span>
                      <Tag color="gold">{session.quality}</Tag>
                    </Space>
                  }
                  description={
                    <Space size="small">
                      <Tag>{session.technique}</Tag>
                      <Tag color="cyan">Çalışma Odası</Tag>
                      <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                        {dayjs(session.date).format('DD/MM/YYYY HH:mm')}
                      </span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Study Timer Modal */}
      <Modal
        title="Çalışma Odası - Rekabetçi Çalışma"
        open={showStudyTimer}
        onCancel={() => setShowStudyTimer(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16
          }}>
            <h4 style={{ color: 'white', margin: 0 }}>🚀 Rekabetçi Mod Aktif!</h4>
            <p style={{ color: 'white', margin: '8px 0 0 0', fontSize: 13 }}>
              Bu oturum çalışma odası leaderboard'una kaydedilecek ve diğer öğrencilerle rekabet edebileceksin.
            </p>
          </div>
        </div>
        <StudyTimer
          size="large"
          onSessionComplete={handleStudyRoomSessionComplete}
        />
      </Modal>
    </Space>
  );
};

export default StudyRoom;


