import React, { useRef, useState } from 'react';
import { Layout, Menu, Button, Avatar, Typography, Dropdown, Badge, Tooltip, Segmented } from 'antd';
import {
  AimOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  BellOutlined,
  UserOutlined,
  SunOutlined,
  MoonOutlined,
  
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { getPageTitle, getRouteMenuByRole } from '../../../routes/routeMenu';
import { toAbsoluteUrl } from '../../../services/api';
import { useDesign } from '../../../contexts/DesignContext';
import OnboardingTour from '../../common/OnboardingTour';
import './AppLayout.scss';

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
  const { user, logout, updateUser } = useAuth();
  // Tutorial refs
  const siderRef = useRef<HTMLDivElement | null>(null);
  const collapseBtnRef = useRef<HTMLButtonElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const themeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Turu yeniden başlatmak için state (menüden tetiklenecek)
  const [forceOpenKey, setForceOpenKey] = useState<number>(0);
  const { themeMode, isDark, toggleTheme } = useTheme();
  const { designMode, setDesignMode } = useDesign();
  const isDevEnv = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  
  // Get role-based menu items
  const menuItems = getRouteMenuByRole(user?.role);

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
      key: 'restart-tour',
      icon: <AimOutlined />,
      label: 'Turu Yeniden Başlat',
      onClick: () => setForceOpenKey(Date.now())
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
    } else {
      setOpenKeys([]);
    }
  }, [location.pathname]);



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
    <Layout className={`app-layout ${isDark ? 'dark' : 'light'}`}>
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
        <div className={`sider-logo ${collapsed ? 'collapsed' : 'expanded'}`}>
          {collapsed ? (
            <AimOutlined className="logo-icon" />
          ) : (
            <div className="logo-text">
              <Text strong className="brand-text">
                NİK YKS
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
            {/* Design switch (deneysel) */}
            <Segmented
              value={designMode}
              onChange={(val) => setDesignMode(val as any)}
              options={[
                { label: 'Soft', value: 'soft' },
                { label: 'Neon', value: 'neon' },
              ]}
              size="small"
            />
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

            {isDevEnv && (
              <>
                <Tooltip title="Genel Tur (Geliştirme)">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<AimOutlined />}
                    onClick={() => setForceOpenKey(Date.now())}
                  >
                    Tur
                  </Button>
                </Tooltip>
                <Tooltip title="Study Plan Turu (Geliştirme)">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<AimOutlined />}
                    onClick={() => {
                      window.dispatchEvent(new Event('open-study-plan-tour' as any));
                      // Study Plan sayfasında değilsek yönlendirme opsiyonu
                      if (!location.pathname.startsWith('/study-plan')) {
                        navigate('/study-plan');
                        // Sayfaya gidince event yeniden tetiklenmesi gerekebilir; session guard zaten ilk açılışı yapar
                      }
                    }}
                  >
                    Study Plan Tur
                  </Button>
                </Tooltip>
                <Tooltip title="Koçum Turu (Geliştirme)">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<AimOutlined />}
                    onClick={() => {
                      window.dispatchEvent(new Event('open-student-coach-tour' as any));
                      if (!location.pathname.startsWith('/student/coach')) {
                        navigate('/student/coach');
                      }
                    }}
                  >
                    Koçum Tur
                  </Button>
                </Tooltip>
              </>
            )}

            {/* Notifications */}
            {/* Gizli değerlendirme bekleniyor rozeti - sadece öğrenci için opsiyonel */}
            <Badge count={user?.role === 'student' ? 1 : 0} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="notification-button"
                aria-label="Bildirimler"
                // İleride tıklayınca /student/coach sayfasına yönlendirilebilir
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
          </div>
        </Header>

        {/* Content */}
        <Content className={`app-content ${contentClassName}`}>
          {children}
          <OnboardingTour
            userId={user?._id}
            hasSeenTutorial={user?.hasSeenTutorial}
            role={user?.role as any}
            forceOpenKey={forceOpenKey}
            targets={{
              getSiderEl: () => (siderRef.current as any) || null,
              getCollapseButtonEl: () => (collapseBtnRef.current as any) || null,
              getThemeButtonEl: () => (themeBtnRef.current as any) || null,
              getProfileEl: () => (profileRef.current as any) || null,
            }}
            onCompleted={() => updateUser({ hasSeenTutorial: true })}
          />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;