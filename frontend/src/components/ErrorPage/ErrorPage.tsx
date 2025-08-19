import React from 'react';
import { Button, Typography, Space, Card } from 'antd';
import { 
  ReloadOutlined, 
  HomeOutlined, 
  ExclamationCircleOutlined,
  WifiOutlined,
  LockOutlined,
  SearchOutlined,
  CloudServerOutlined
} from '@ant-design/icons';
import logoNik from '../../assets/logoNik.png';
import './ErrorPage.scss';

const { Title, Text } = Typography;

interface ErrorPageProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  showHomeButton?: boolean;
  errorType?: 'general' | 'network' | 'auth' | 'notFound' | 'server';
  errorCode?: string | number;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  title,
  message,
  onRetry,
  onGoHome,
  showHomeButton = true,
  errorType = 'general',
  errorCode
}) => {
  // Error type based defaults
  const getErrorDefaults = () => {
    switch (errorType) {
      case 'network':
        return {
          title: 'Bağlantı Hatası',
          message: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
          icon: 'wifi'
        };
      case 'auth':
        return {
          title: 'Yetkilendirme Hatası',
          message: 'Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.',
          icon: 'lock'
        };
      case 'notFound':
        return {
          title: 'Sayfa Bulunamadı',
          message: 'Aradığınız sayfa mevcut değil veya taşınmış olabilir.',
          icon: 'search'
        };
      case 'server':
        return {
          title: 'Sunucu Hatası',
          message: 'Sunucuda bir sorun oluştu. Lütfen daha sonra tekrar deneyin.',
          icon: 'server'
        };
      default:
        return {
          title: 'Bir şeyler ters gitti',
          message: 'Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.',
          icon: 'exclamation'
        };
    }
  };

  // Get appropriate icon component
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
        return <WifiOutlined />;
      case 'auth':
        return <LockOutlined />;
      case 'notFound':
        return <SearchOutlined />;
      case 'server':
        return <CloudServerOutlined />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  const defaults = getErrorDefaults();
  const finalTitle = title || defaults.title;
  const finalMessage = message || defaults.message;
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="error-page">
      <div className="error-container">
        <Card className="error-card">
          <div className="error-content">
            {/* Logo */}
            <div className="error-logo">
              <img src={logoNik} alt="Nik Logo" className="logo-image" />
            </div>

            {/* Error Title */}
            <Title level={2} className="error-title">
              {finalTitle}
            </Title>

            {/* Error Code */}
            {errorCode && (
              <div className="error-code">
                <Text type="secondary" className="code-text">
                  Hata Kodu: {errorCode}
                </Text>
              </div>
            )}

            {/* Error Message */}
            <Text className="error-message">
              {finalMessage}
            </Text>

            {/* Action Buttons */}
            <Space size="middle" className="error-actions">
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                className="retry-button"
              >
                Sayfayı Yenile
              </Button>
              
              {showHomeButton && (
                <Button
                  size="large"
                  icon={<HomeOutlined />}
                  onClick={handleGoHome}
                  className="home-button"
                >
                  Ana Sayfaya Dön
                </Button>
              )}
            </Space>

            {/* Additional Help */}
            <div className="error-help">
              <Text type="secondary" className="help-text">
                Sorun devam ederse lütfen destek ekibimizle iletişime geçin.
              </Text>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ErrorPage;
