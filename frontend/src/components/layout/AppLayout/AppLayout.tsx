import React, { useRef, useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography, Dropdown, Badge, Tooltip, Switch, message } from 'antd';
import { SettingOutlined, LogoutOutlined, MenuUnfoldOutlined, MenuFoldOutlined, BellOutlined, UserOutlined, SunOutlined, MoonOutlined, CopyOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getRouteMenuByRole } from '../../../routes/routeMenu';
import { toAbsoluteUrl, getNotifications } from '../../../services/api';
import { useDesign } from '../../../contexts/DesignContext';
import logoImage from '../../../assets/logoNik.png'; // NİK logo dosyası
import './AppLayout.scss';
import NotificationCenter from '../../notifications/NotificationCenter';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  // Tutorial refs
  const siderRef = useRef<HTMLDivElement | null>(null);
  const collapseBtnRef = useRef<HTMLButtonElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationCenterVisible, setNotificationCenterVisible] = useState(false);
  const { themeMode, isDark, toggleTheme } = useTheme();
  const { designMode } = useDesign();
  const menuItems = getRouteMenuByRole(user?.role);
  const planLabel = user?.role === 'student' ? ((user?.plan?.tier as any) === 'premium' ? 'Premium' : 'Free') : null;
  const [globalMock, setGlobalMock] = useState(false);

  // Menu click handler
  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key);
    }
  };

  // User dropdown menu
  const userMenuItems = [
    {
      key: 'profile-settings',
      icon: <UserOutlined />,
      label: 'Profil Ayarları',
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Ayarlar',
      disabled: true // Henüz hazır değil
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Çıkış Yap',
      onClick: () => {
        logout();
        navigate('/login');
      }
    }
  ];

  // Tema toggle butonu
  const getThemeIcon = () => (themeMode === 'light' ? <SunOutlined /> : <MoonOutlined />);

  const getThemeTooltip = () => (themeMode === 'light' ? "Light Mode - Dark'a geç" : "Dark Mode - Light'a geç");

  // Aktif menü key'ini belirle
  const getSelectedMenuKey = () => {
    return [location.pathname];
  };

  // Submenu açık tutma handler
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  // Sayfa değiştiğinde ilgili submenu'yu aç
  React.useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/profile') || path.startsWith('/education') || path.startsWith('/goals')) {
      setOpenKeys(['profile']);
    } else if (path.startsWith('/study-tracker/')) {
      setOpenKeys(['/study-tracker']);
    } else if (path.startsWith('/study-plan/')) {
      setOpenKeys(['/study-plan']);
    } else {
      setOpenKeys([]);
    }
  }, [location.pathname]);

  // Bildirimleri yükle
  const loadNotifications = async (unreadOnly = false) => {
    try {
  const response = await getNotifications({ unreadOnly, limit: 10 });
  setUnreadCount(response.data.filter(n => !n.readAt).length);
    } catch (error) {
      console.error('Bildirimler yüklenemedi:', error);
    }
  };

  // Bildirim sayısını güncelle
  const updateUnreadCount = (count: number) => {
    setUnreadCount(count);
  };

  // Periyodik bildirim kontrolü
  React.useEffect(() => {
    loadNotifications(true); // Sadece okunmamışları yükle
    
    const interval = setInterval(() => {
      loadNotifications(true);
    }, 45000); // 45 saniyede bir

    return () => clearInterval(interval);
  }, []);





  const headerClassName = React.useMemo(() => {
    switch (designMode) {
      case 'neon':
        return 'neon-header';
      case 'soft':
        return 'soft-header';
      default:
        return 'soft-header';
    }
  }, [designMode]);

  const contentClassName = React.useMemo(() => {
    const base = 'app-fade-in';
    switch (designMode) {
      case 'neon':
        return `${base} neon-content`;
      case 'soft':
        return `${base} soft-content`;
      default:
        return `${base} soft-content`;
    }
  }, [designMode]);

  const siderClassName = React.useMemo(() => {
    switch (designMode) {
      case 'neon':
        return 'neon-sider';
      case 'soft':
        return 'soft-sider';
      default:
        return 'soft-sider';
    }
  }, [designMode]);



  return (
    <Layout className={`app-layout ${isDark ? 'theme-dark' : 'theme-light'}`}>
      {/* Sidebar */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={250}
        className={`app-sider ${siderClassName}`}
        ref={siderRef as any}
      >
        {/* Logo/Brand */}
        <div 
          className={`sider-logo ${collapsed ? 'collapsed' : 'expanded'}`}
          onClick={() => {
            // Kullanıcı rolüne göre dashboard'a yönlendir
            if (user?.role === 'student') {
              navigate('/dashboard');
            } else if (user?.role === 'coach') {
              navigate('/coach-dashboard');
            } else if (user?.role === 'admin') {
              navigate('/admin-dashboard');
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          {collapsed ? (
            <img src={logoImage} alt="NİK Logo" className="logo-image" />
          ) : (
            <div className="logo-text">
              <Text strong className="brand-text">
                NİK YKS{planLabel ? (
                  <>
                      {' '}<span className={`plan-label${isDark ? ' plan-label-dark' : ''}`}>{String(planLabel).toUpperCase()}</span>
                  </>
                ) : null}
              </Text>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedMenuKey()}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          items={menuItems}
          onClick={handleMenuClick}
          className="sider-menu"
        />
      </Sider>

      {/* Main Layout */}
      <Layout>
        {/* Header */}
        <Header className={`app-header ${headerClassName}`}>
          {/* Sol taraf - Collapse button */}
          <div className="header-left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="collapse-button"
              aria-label={collapsed ? 'Menüyü aç' : 'Menüyü kapat'}
              ref={collapseBtnRef as any}
            />
            

          </div>
              
          {/* Sağ taraf - User info */}
          <div className="header-right">
            <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:12 }}>
              <Tooltip title={globalMock ? 'Mock veri aktif - kapatmak için tıkla' : 'Mock veriye geç'}>
                <Switch
                  size="small"
                  checked={globalMock}
                  onChange={(v) => {
                    setGlobalMock(v);
                    // Uygulama genelinde dinlemek için custom event
                    window.dispatchEvent(new CustomEvent('global-mock-mode', { detail: { enabled: v } }));
                  }}
                />
              </Tooltip>
              <Text style={{ fontSize:11, opacity:0.75 }}>{globalMock ? 'MOCK' : 'REAL'}</Text>
            </div>
            {/* Theme Toggle */}
            <Tooltip title={getThemeTooltip()}>
              <Button
                type="text"
                icon={getThemeIcon()}
                onClick={toggleTheme}
                className="theme-button"
                aria-label="Tema değiştir"
                ref={themeBtnRef as any}
              />
            </Tooltip>


            {/* Notifications Button */}
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="notification-button"
                aria-label="Bildirimler"
                onClick={() => setNotificationCenterVisible(true)}
              />
            </Badge>

            {/* User Dropdown */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              arrow
            >
              <div 
                className="user-dropdown"
                ref={profileRef as any}
              >
                <Avatar size={32} src={toAbsoluteUrl(user?.avatar) || undefined} icon={<UserOutlined />} />
                <div className="user-info">
                  <Text className="user-name">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email
                    }
                  </Text>
                  <Text type="secondary" className="user-role">
                    {user?.role === 'student' ? 'Öğrenci' : 
                     user?.role === 'coach' ? 'Koç' : 'Admin'}
                  </Text>
                </div>
              </div>
            </Dropdown>

            {/* Lorem Ipsum Copy Button */}
            <Tooltip title="Lorem Ipsum'u kopyala">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum');
                  message.success('Lorem Ipsum kopyalandı!');
                }}
                aria-label="Lorem Ipsum'u kopyala"
              />
            </Tooltip>
          </div>
        </Header>

        <Content className={`app-content ${contentClassName}`}>
          {children}
        </Content>
      </Layout>

      {/* Bildirim Merkezi */}
      <NotificationCenter
        visible={notificationCenterVisible}
        onClose={() => setNotificationCenterVisible(false)}
        unreadCount={unreadCount}
        onUnreadCountChange={updateUnreadCount}
      />
    </Layout>
  );
};

export default AppLayout;