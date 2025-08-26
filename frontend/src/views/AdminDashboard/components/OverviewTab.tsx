import React from 'react';
import { Card, Row, Col, Typography, Progress, Statistic, Form, Input, Space, Button, Alert } from 'antd';
import { TeamOutlined, LineChartOutlined, PieChartOutlined, CloudServerOutlined, EditOutlined } from '@ant-design/icons';
import { SystemMetrics } from '../types';

const { Text } = Typography;

interface OverviewTabProps {
  systemMetrics: SystemMetrics;
  motivationText: string;
  motivationAuthor: string;
  savingMotivation: boolean;
  derived: {
    usersProgress: number; // öğrencilerin toplam kullanıcılara oranı
    sessionsProgress: number; // aktif kullanıcıların toplam kullanıcılara oranı
    questionsProgress: number; // soru/öğrenci hedef oranı
  };
  onChangeMotivation(text: string): void;
  onChangeAuthor(text: string): void;
  onSave(): Promise<void> | void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  systemMetrics,
  motivationText,
  motivationAuthor,
  savingMotivation,
  derived,
  onChangeMotivation,
  onChangeAuthor,
  onSave
}) => {
  // Helper: format & truncate floating numbers (avoid overflowing long decimal chains)
  const formatAndTruncate = (value: number | undefined, opts: { decimals?: number; maxLen?: number } = {}) => {
    const { decimals = 2, maxLen = 8 } = opts;
    if (value === undefined || value === null || isNaN(value)) return '-';
    const fixed = Number(value).toFixed(decimals);
    // Drop trailing zeros after decimal intelligently
    const cleaned = fixed.replace(/\.(\d*?)0+$/,'.$1').replace(/\.$/, '');
    if (cleaned.length > maxLen) {
      return cleaned.slice(0, maxLen - 1) + '…';
    }
    return cleaned;
  };

  const formattedResponseTime = formatAndTruncate(systemMetrics.responseTime, { decimals: 2, maxLen: 10 });
  const formattedSystemLoad = formatAndTruncate(systemMetrics.systemLoad, { decimals: 1, maxLen: 6 });
  const formattedAvgSession = formatAndTruncate(systemMetrics.avgSessionTime, { decimals: 1, maxLen: 8 });

  return (
    <>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24}>
          <Card title="Haftalık Motivasyon Sözü" extra={<Text type="secondary">Giriş ekranında gösterilir</Text>}>
            <Form layout="vertical" onFinish={onSave}>
              <Form.Item label="Söz" required>
                <Input.TextArea
                  value={motivationText}
                  onChange={(e) => onChangeMotivation(e.target.value)}
                  rows={3}
                  maxLength={500}
                  showCount
                  placeholder="Haftalık motivasyon sözünü yazın"
                />
              </Form.Item>
              <Form.Item label="Yazar">
                <Input
                  value={motivationAuthor}
                  onChange={(e) => onChangeAuthor(e.target.value)}
                  maxLength={100}
                  placeholder="İsteğe bağlı"
                />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={savingMotivation} icon={<EditOutlined />}>Kaydet</Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
      <Alert
        message="🟢 Sistem Durumu: Sağlıklı"
        description="Tüm servisler normal çalışıyor. Son kontrol: 2 dakika önce"
        type="success"
        showIcon
        style={{ marginBottom: '24px', borderRadius: '8px' }}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} md={8} lg={6}>
          <Card size="small" className="metric-card users">
            <Statistic title="Toplam Kullanıcı" value={systemMetrics.totalUsers} prefix={<TeamOutlined />} valueStyle={{ color: '#1890ff' }} />
            <Progress percent={Math.round(derived.usersProgress)} size="small" showInfo={false} strokeColor="#1890ff" />
            <Text type="secondary" style={{ fontSize: '11px' }}>Öğrenci oranı</Text>
          </Card>
        </Col>
        <Col xs={12} md={8} lg={6}>
          <Card size="small" className="metric-card sessions">
            <Statistic title="Toplam Oturum" value={systemMetrics.totalSessions} prefix={<LineChartOutlined />} valueStyle={{ color: '#52c41a' }} />
            <Progress percent={Math.round(derived.sessionsProgress)} size="small" showInfo={false} strokeColor="#52c41a" />
            <Text type="secondary" style={{ fontSize: '11px' }}>Aktif kullanıcı oranı</Text>
          </Card>
        </Col>
        <Col xs={12} md={8} lg={6}>
          <Card size="small" className="metric-card questions">
            <Statistic title="Çözülen Soru" value={systemMetrics.totalQuestions} prefix={<PieChartOutlined />} valueStyle={{ color: '#faad14' }} />
            <Progress percent={Math.round(derived.questionsProgress)} size="small" showInfo={false} strokeColor="#faad14" />
            <Text type="secondary" style={{ fontSize: '11px' }}>Kişi başı oran</Text>
          </Card>
        </Col>
        <Col xs={12} md={8} lg={6}>
          <Card size="small" className="metric-card load">
            <Statistic
              title="Sistem Yükü"
              value={Number.isFinite(systemMetrics.systemLoad) ? Number(systemMetrics.systemLoad) : 0}
              suffix="%"
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: systemMetrics.systemLoad > 70 ? '#ff4d4f' : '#52c41a' }}
              formatter={() => <span title={String(systemMetrics.systemLoad)}>{formattedSystemLoad}</span>}
            />
            <Progress percent={systemMetrics.systemLoad} size="small" showInfo={false} strokeColor={systemMetrics.systemLoad > 70 ? '#ff4d4f' : '#52c41a'} />
            <Text type="secondary" style={{ fontSize: '11px' }}>Optimize edildi</Text>
          </Card>
        </Col>
      </Row>
      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="Sistem Performansı">
            <Row gutter={16}>
              <Col span={12}>
                <div className="performance-metric">
                  <Text strong>Aktif Kullanıcılar</Text>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                    {systemMetrics.activeUsers}
                  </div>
                  <Text type="secondary">Şu anda online</Text>
                </div>
              </Col>
              <Col span={12}>
                <div className="performance-metric">
                  <Text strong>Yanıt Süresi</Text>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                    <span title={String(systemMetrics.responseTime)}>{formattedResponseTime}ms</span>
                  </div>
                  <Text type="secondary">Ortalama API yanıtı</Text>
                </div>
              </Col>
              <Col span={12} style={{ marginTop: '16px' }}>
                <div className="performance-metric">
                  <Text strong>Veritabanı</Text>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                    {systemMetrics.databaseSize} GB
                  </div>
                  <Text type="secondary">Toplam boyut</Text>
                </div>
              </Col>
              <Col span={12} style={{ marginTop: '16px' }}>
                <div className="performance-metric">
                  <Text strong>Oturum Süresi</Text>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#faad14' }}>
                    <span title={String(systemMetrics.avgSessionTime)}>{formattedAvgSession}dk</span>
                  </div>
                  <Text type="secondary">Ortalama süre</Text>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default OverviewTab;
