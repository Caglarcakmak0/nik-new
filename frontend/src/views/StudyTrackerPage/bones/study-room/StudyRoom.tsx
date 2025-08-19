import React, { useEffect, useMemo, useState } from 'react';
import { Card, List, Button, Segmented, Tag, Space, Popconfirm, Statistic, Row, Col, Tabs, App } from 'antd';
import { RocketOutlined, ThunderboltOutlined, HistoryOutlined, TrophyOutlined, FireOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';
import { getStudyRoomActivity, getActiveDuels, inviteDuel, respondDuel, apiRequest, getStudentPrograms, type StudyRoomActivityItem, type Duel } from '../../../../services/api';
import { useAuth } from '../../../../contexts/AuthContext';
import Leaderboard from '../../../StudyPlanPage/bones/Leaderboard/Leaderboard';

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
  const [studyRoomSessions, setStudyRoomSessions] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [programDailyTime, setProgramDailyTime] = useState<number>(0);
  const [programWeeklyTime, setProgramWeeklyTime] = useState<number>(0);
  const [programAllTime, setProgramAllTime] = useState<number>(0);
  const { user } = useAuth();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [act, activeDuels, sessions, allSess] = await Promise.all([
        getStudyRoomActivity(period),
        getActiveDuels(),
        fetchStudyRoomSessions(),
        fetchAllSessions()
      ]);
      setActivity(act.data || []);
      setDuels(activeDuels.data || []);
      setStudyRoomSessions(sessions);
      setAllSessions(allSess);
      await fetchCoachProgramTotals();
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

  const fetchAllSessions = async () => {
    try {
      const response = await apiRequest('/study-sessions', { method: 'GET' });
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('All sessions fetch error:', error);
      return [];
    }
  };

  const fetchCoachProgramTotals = async () => {
    try {
      const now = dayjs();
      const startOfToday = now.startOf('day').toDate().toISOString();
      const endOfToday = now.endOf('day').toDate().toISOString();
      const startOfWeek = now.startOf('week').toDate().toISOString();
      const endOfWeek = now.endOf('week').toDate().toISOString();

      const [dailyRes, weeklyRes, allRes] = await Promise.all([
        getStudentPrograms({ from: startOfToday, to: endOfToday, limit: 500 }),
        getStudentPrograms({ from: startOfWeek, to: endOfWeek, limit: 500 }),
        getStudentPrograms({ from: '1970-01-01T00:00:00.000Z', to: now.endOf('day').toDate().toISOString(), limit: 1000 })
      ]);

      const sumTime = (items: Array<any>) => (items || []).reduce((sum, p) => sum + (Number(p?.stats?.totalStudyTime) || 0), 0);

      setProgramDailyTime(sumTime(dailyRes?.data || []));
      setProgramWeeklyTime(sumTime(weeklyRes?.data || []));
      setProgramAllTime(sumTime(allRes?.data || []));
    } catch (error) {
      setProgramDailyTime(0);
      setProgramWeeklyTime(0);
      setProgramAllTime(0);
    }
  };

  // Timer kaldırıldı: study room oturumları yalnızca geçmişten okunur

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

  // Birleşik istatistikler: sol panel oturumları + koç programı toplamları (çift sayım önlenerek)
  const myStudyRoomStats = useMemo(() => {
    const today = dayjs();
    const todaySessions = allSessions.filter(s => dayjs(s.date).isSame(today, 'day'));
    const weekSessions = allSessions.filter(s => dayjs(s.date).isSame(today, 'week'));

    const sumDur = (arr: any[]) => arr.reduce((sum, s) => sum + (Number(s?.duration) || 0), 0);
    const todayLinked = todaySessions.filter(s => !!s.dailyPlanId);
    const weekLinked = weekSessions.filter(s => !!s.dailyPlanId);
    const allLinked = allSessions.filter(s => !!s.dailyPlanId);

    const adjustedProgramDaily = Math.max(0, programDailyTime - sumDur(todayLinked));
    const adjustedProgramWeekly = Math.max(0, programWeeklyTime - sumDur(weekLinked));
    const adjustedProgramAll = Math.max(0, programAllTime - sumDur(allLinked));
    
    return {
      todayTime: sumDur(todaySessions) + adjustedProgramDaily,
      todayCount: todaySessions.length,
      weekTime: sumDur(weekSessions) + adjustedProgramWeekly,
      weekCount: weekSessions.length,
      totalTime: sumDur(allSessions) + adjustedProgramAll,
      avgQuality: allSessions.length > 0 
        ? allSessions.reduce((sum, s) => sum + (Number(s?.quality) || 0), 0) / allSessions.length 
        : 0
    };
  }, [allSessions, programDailyTime, programWeeklyTime, programAllTime]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Kişisel Çalışma Odası Stats */}
      <Card
        title={
          <Space>
            <TrophyOutlined /> Benim Çalışma Odası Performansım
          </Space>
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
        title={<Space><TrophyOutlined /> Rekabet</Space>}
        extra={
          <Segmented
            options={[{ label: 'Günlük', value: 'daily' }, { label: 'Haftalık', value: 'weekly' }]}
            value={period}
            onChange={(v) => setPeriod(v as any)}
          />
        }
      >
        <Tabs
          items={[
            {
              key: 'leaderboard',
              label: <Space><RiseOutlined /> Liderlik Tablosu</Space>,
              children: (
                <Leaderboard
                  enableDuelActions
                  onInviteDuel={async (userId, duelPeriod) => {
                    // Aynı kişiyle mevcut pending/active düello var mı kontrolü (aktif/pending listeden)
                    const hasOngoing = duels.some(d => {
                      const a = typeof d.challenger === 'string' ? d.challenger : d.challenger?._id;
                      const b = typeof d.opponent === 'string' ? d.opponent : d.opponent?._id;
                      return (
                        ((a === user?._id && b === userId) || (a === userId && b === user?._id)) &&
                        (d.status === 'pending' || d.status === 'active')
                      );
                    });
                    if (hasOngoing) {
                      message.warning('Bu kullanıcı ile hali hazırda bekleyen/aktif bir düello var.');
                      return;
                    }
                    await inviteDuel(userId, duelPeriod);
                    // Listeyi yenile
                    await fetchData();
                  }}
                  duelPeriodResolver={(activeTab) => activeTab === 'weekly' ? 'weekly' : 'daily'}
                />
              )
            },
            {
              key: 'duels',
              label: <Space><ThunderboltOutlined /> Aktif Düellolar</Space>,
              children: (
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
              )
            }
          ]}
        />
      </Card>

      {/* Alt kısımdaki mükerrer Aktif Düellolar kartı kaldırıldı (Rekabet sekmeleri altında gösteriliyor) */}

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

      {/* Timer kaldırıldı */}
    </Space>
  );
};

export default StudyRoom;


