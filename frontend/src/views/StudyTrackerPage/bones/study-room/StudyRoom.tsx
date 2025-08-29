import React, { useEffect, useState } from 'react';
import { Card, List, Button, Segmented, Tag, Space, Popconfirm, Tabs, App, Modal } from 'antd';
import { ThunderboltOutlined, HistoryOutlined, TrophyOutlined, RiseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/tr';
import { getStudyRoomActivity, getActiveDuels, inviteDuel, respondDuel, apiRequest, type Duel } from '../../../../services/api';
import { useGamification } from '../../../../hooks/useGamification';
import DailyChallenges from '../../../../components/DailyChallenges';
import { useAuth } from '../../../../contexts/AuthContext';
import Leaderboard from '../../../StudyPlanPage/bones/Leaderboard/Leaderboard';
import './studyRoomLayout.scss';

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
  // Removed unused 'loading' and 'activity' after refactor
  const [duels, setDuels] = useState<Duel[]>([]);
  const [studyRoomSessions, setStudyRoomSessions] = useState<any[]>([]);
  // Sadeleştirilmiş sürüm: geniş istatistik state'leri kaldırıldı
  const { user } = useAuth();
  const { events: xpEvents, challenges, refetch } = useGamification();
  const [eventsVisible, setEventsVisible] = useState(false);
  const { message } = App.useApp();

  const fetchData = async () => {
    try {
      const [_, activeDuels, sessions] = await Promise.all([
        getStudyRoomActivity(period),
        getActiveDuels(),
        fetchStudyRoomSessions()
      ]);
      setDuels(activeDuels.data || []);
      setStudyRoomSessions(sessions);
    } catch (e: any) {
      message.error(e?.message || 'Veri alınamadı');
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

  // Kaldırılan: geniş program toplamı hesaplamaları (basitleştirilmiş)

  // Timer kaldırıldı: study room oturumları yalnızca geçmişten okunur

  useEffect(() => {
    fetchData();
  }, [period]);

  // handleInvite logic centralized in Leaderboard prop usage

  // İstatistik hesapları bu versiyonda kullanılmıyor (tasarım sadeleştirildi)

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div className="study-room-performance">
        <div className="srp__header">
          <div className="srp__head-left">
            <h2 className="srp__title"><TrophyOutlined /> Benim Çalışma Odası Performansım</h2>
            <p className="srp__subtitle">Günlük ilerlemeni, toplam süreyi ve kalite ortalamanı tek bakışta gör.</p>
          </div>
        </div>
        <div className="srp__body">
          <div className="srp__main">
            {/* Buraya ileride özet istatistikler, XP bar vs. yeniden eklenebilir */}
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
          </div>
              <DailyChallenges data={{ challenges: challenges?.challenges || [] }} loading={!challenges} onClaimed={refetch} />
            
          
        </div>
      </div>

  

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
      <Modal title="XP Olayları" open={eventsVisible} onCancel={() => setEventsVisible(false)} footer={null} width={520}>
        <List
          size="small"
          dataSource={xpEvents}
          renderItem={(e) => (
            <List.Item>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>{e.type}</span>
                <Tag color={e.amount > 0 ? 'green' : 'red'}> {e.amount > 0 ? '+' : ''}{e.amount} XP</Tag>
              </Space>
            </List.Item>
          )}
        />
      </Modal>
    </Space>
  );
};

export default StudyRoom;


