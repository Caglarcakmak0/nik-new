import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  Badge, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Empty, 
  Spin,
  Tabs,
  Avatar,
  Divider,
  Tooltip
} from 'antd';
import { 
  BellOutlined, 
  CheckOutlined, 
  CloseOutlined,
  TrophyOutlined,
  UserOutlined,
  BarChartOutlined,
  SettingOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { 
  getNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  AppNotification 
} from '../../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import "./NotificationCenter.scss"

const { Text, Title } = Typography;
const { TabPane } = Tabs;

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  visible,
  onClose,
  unreadCount,
  onUnreadCountChange
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Bildirimleri yükle
  const loadNotifications = async (unreadOnly = false, cursor?: string) => {
    try {
      setLoading(true);
      const response = await getNotifications({ 
        unreadOnly, 
        limit: 20, 
        cursor 
      });
      
      if (cursor) {
        setNotifications(prev => [...prev, ...response.data]);
      } else {
        setNotifications(response.data);
      }
      
      setHasMore(response.paging.hasMore);
      setNextCursor(response.paging.nextCursor || null);
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bildirimi okundu olarak işaretle
  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
      updateUnreadCount();
    } catch (error) {
      console.error('Bildirim okundu işaretlenemedi:', error);
    }
  };

  // Tümünü okundu işaretle
  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
      );
      updateUnreadCount();
    } catch (error) {
      console.error('Tüm bildirimler okundu işaretlenemedi:', error);
    }
  };

  // Okunmamış sayısını güncelle
  const updateUnreadCount = () => {
    const newUnreadCount = notifications.filter(n => !n.readAt).length;
    onUnreadCountChange(newUnreadCount);
  };

  // Bildirim tıklama
  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.readAt) {
      markAsRead(notification._id);
    }
    
    if (notification.actionUrl) {
      if (notification.actionUrl.startsWith('http')) {
        window.open(notification.actionUrl, '_blank');
      } else {
        navigate(notification.actionUrl);
        onClose();
      }
    }
  };

  // Kategori bilgilerini al
  const getCategoryInfo = (category: string) => {
    switch (category) {
      case 'coach':
        return { icon: <UserOutlined />, color: '#1890ff', label: 'Koç' };
      case 'gamification':
        return { icon: <TrophyOutlined />, color: '#faad14', label: 'Başarı' };
      case 'performance':
        return { icon: <BarChartOutlined />, color: '#52c41a', label: 'Performans' };
      case 'system':
        return { icon: <SettingOutlined />, color: '#722ed1', label: 'Sistem' };
      default:
        return { icon: <BellOutlined />, color: 'default', label: 'Genel' };
    }
  };

  // Önem seviyesi rengini al
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return 'red';
      case 'low':
        return 'blue';
      default:
        return 'default';
    }
  };

  // Zaman formatla
  const formatTime = (dateString: string) => {
    const date = dayjs(dateString);
    const now = dayjs();
    
    if (date.isSame(now, 'day')) {
      return date.format('HH:mm');
    } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
      return 'Dün';
    } else if (date.isAfter(now.subtract(7, 'day'))) {
      return date.format('dddd');
    } else {
      return date.format('DD.MM.YYYY');
    }
  };

  // Filtrelenmiş bildirimler
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'unread') return !notification.readAt;
    if (activeTab === 'all') return true;
    return notification.category === activeTab;
  });

  // Tab değiştiğinde bildirimleri yükle
  useEffect(() => {
    if (visible) {
      const unreadOnly = activeTab === 'unread';
      loadNotifications(unreadOnly);
    }
  }, [visible, activeTab]);

  // Okunmamış sayısını güncelle
  useEffect(() => {
    updateUnreadCount();
  }, [notifications]);

  return (
    <Drawer
      title={
        <Space>
          <BellOutlined />
          <span>Bildirimler</span>
          {unreadCount > 0 && (
            <Badge count={unreadCount} size="small" />
          )}
        </Space>
      }
      placement="right"
      width={400}
      open={visible}
      onClose={onClose}
      extra={
        unreadCount > 0 ? (
          <Button 
            type="link" 
            size="small" 
            onClick={markAllAsRead}
            icon={<CheckOutlined />}
          >
            Tümünü okundu işaretle
          </Button>
        ) : null
      }
    >
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        size="small"
        style={{ marginBottom: 16 }}
      >
        <TabPane tab="Tümü" key="all" />
        <TabPane 
          tab={
            <Badge count={unreadCount} size="small">
              <span>Okunmamış</span>
            </Badge>
          } 
          key="unread" 
        />
        <TabPane tab="Koç" key="coach" />
        <TabPane tab="Başarı" key="gamification" />
        <TabPane tab="Performans" key="performance" />
        <TabPane tab="Sistem" key="system" />
      </Tabs>

      {loading && notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            activeTab === 'unread' 
              ? 'Okunmamış bildirimin yok'
              : 'Henüz bildirim yok'
          }
        />
      ) : (
        <div className="notification-list">
          {filteredNotifications.map((notification) => {
            const categoryInfo = getCategoryInfo(notification.category);
            const isUnread = !notification.readAt;
            
            return (
              <div
                key={notification._id}
                className={`notification-item ${isUnread ? 'unread' : ''}`}
                onClick={() => handleNotificationClick(notification)}
              >
                {/* Sol yeşil şerit */}
                <div className="notification-accent" />
                
                {/* Başarı ikonu */}
                <div className="notification-icon">
                  <CheckOutlined />
                </div>
                
                {/* İçerik */}
                <div className="notification-content">
                  <div className="notification-header">
                    <Text className="notification-title" strong={isUnread}>
                      {notification.title}
                    </Text>
                    <div className="notification-actions">
                      <Text type="secondary" className="notification-time">
                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                        {formatTime(notification.createdAt)}
                      </Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<CloseOutlined />}
                        className="notification-close"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification._id);
                        }}
                      />
                    </div>
                  </div>
                  
                  {notification.body && (
                    <Text className="notification-body">
                      {notification.body}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button 
            type="dashed" 
            onClick={() => loadNotifications(activeTab === 'unread', nextCursor)}
            loading={loading}
          >
            Daha fazla yükle
          </Button>
        </div>
      )}
    </Drawer>
  );
};

export default NotificationCenter;
