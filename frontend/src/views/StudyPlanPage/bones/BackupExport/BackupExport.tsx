import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Row,
  Col,
  Progress,
  Alert,
  Modal,
  Form,
  Select,
  DatePicker,
  message,
  List,
  Tag,
  Tooltip,
  Upload,
  Divider,
  Statistic
} from 'antd';
import {
  CloudDownloadOutlined,
  CloudUploadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  DeleteOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../../contexts/AuthContext';
import { apiRequest } from '../../../../services/api';
import dayjs from 'dayjs';
import './BackupExport.scss';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

interface BackupData {
  id: string;
  type: 'auto' | 'manual';
  createdAt: string;
  size: number;
  dataTypes: string[];
  status: 'completed' | 'processing' | 'failed';
  downloadUrl?: string;
  expiresAt: string;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'json';
  dataTypes: string[];
  dateRange: [string, string];
  includeStats: boolean;
  includeCharts: boolean;
}

const BackupExport: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [exportProgress, setExportProgress] = useState(0);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [form] = Form.useForm();

  // Backup listesini getir
  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await apiRequest('/backup/list');
      setBackups(response.data || []);
    } catch (error) {
      console.error('Backups fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Otomatik backup durumunu getir
  const fetchAutoBackupStatus = async () => {
    try {
      const response = await apiRequest('/backup/auto-status');
      setAutoBackupEnabled(response.data.enabled);
    } catch (error) {
      console.error('Auto backup status error:', error);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchAutoBackupStatus();
  }, []);

  // Manuel backup oluştur
  const createManualBackup = async () => {
    try {
      setLoading(true);
      message.loading('Backup oluşturuluyor...', 0);
      
      const response = await apiRequest('/backup/create', {
        method: 'POST',
        body: JSON.stringify({
          type: 'manual',
          dataTypes: ['study-sessions', 'daily-plans', 'achievements', 'settings']
        })
      });

      message.destroy();
      message.success('Backup başarıyla oluşturuldu!');
      fetchBackups();
    } catch (error) {
      message.destroy();
      console.error('Create backup error:', error);
      message.error('Backup oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Data export
  const exportData = async (values: any) => {
    try {
      setLoading(true);
      setExportProgress(0);
      
      const exportOptions: ExportOptions = {
        format: values.format,
        dataTypes: values.dataTypes,
        dateRange: [
          values.dateRange[0].toISOString(),
          values.dateRange[1].toISOString()
        ],
        includeStats: values.includeStats || false,
        includeCharts: values.includeCharts || false
      };

      // Progress simulation
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const response = await apiRequest('/export/data', {
        method: 'POST',
        body: JSON.stringify(exportOptions)
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      // Download file
      const blob = new Blob([response.data], { 
        type: getContentType(values.format) 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `study-data-${dayjs().format('YYYY-MM-DD')}.${values.format}`;
      link.click();
      window.URL.revokeObjectURL(url);

      message.success('Veriler başarıyla export edildi!');
      setExportModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Export error:', error);
      message.error('Export işlemi sırasında hata oluştu');
    } finally {
      setLoading(false);
      setExportProgress(0);
    }
  };

  // Backup restore
  const restoreBackup = async (backupId: string) => {
    Modal.confirm({
      title: 'Backup Geri Yükle',
      content: 'Bu işlem mevcut verilerinizi backup ile değiştirecek. Devam etmek istediğinizden emin misiniz?',
      okText: 'Geri Yükle',
      cancelText: 'İptal',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          setRestoreProgress(0);

          const progressInterval = setInterval(() => {
            setRestoreProgress(prev => {
              if (prev >= 90) {
                clearInterval(progressInterval);
                return prev;
              }
              return prev + 15;
            });
          }, 800);

          await apiRequest(`/backup/restore/${backupId}`, {
            method: 'POST'
          });

          clearInterval(progressInterval);
          setRestoreProgress(100);
          
          message.success('Backup başarıyla geri yüklendi!');
          
          // Sayfa yenileme önerisi
          Modal.info({
            title: 'Geri Yükleme Tamamlandı',
            content: 'Değişikliklerin görünmesi için sayfayı yenilemeniz önerilir.',
            onOk: () => window.location.reload()
          });
          
        } catch (error) {
          console.error('Restore error:', error);
          message.error('Backup geri yükleme sırasında hata oluştu');
        } finally {
          setLoading(false);
          setRestoreProgress(0);
        }
      }
    });
  };

  // Backup sil
  const deleteBackup = async (backupId: string) => {
    try {
      await apiRequest(`/backup/delete/${backupId}`, {
        method: 'DELETE'
      });
      message.success('Backup silindi');
      fetchBackups();
    } catch (error) {
      console.error('Delete backup error:', error);
      message.error('Backup silinirken hata oluştu');
    }
  };

  // Otomatik backup toggle
  const toggleAutoBackup = async () => {
    try {
      await apiRequest('/backup/auto-toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: !autoBackupEnabled })
      });
      setAutoBackupEnabled(!autoBackupEnabled);
      message.success(
        `Otomatik backup ${!autoBackupEnabled ? 'açıldı' : 'kapatıldı'}`
      );
    } catch (error) {
      console.error('Toggle auto backup error:', error);
      message.error('Ayar değiştirilirken hata oluştu');
    }
  };

  // Content type belirleme
  const getContentType = (format: string) => {
    switch (format) {
      case 'pdf': return 'application/pdf';
      case 'excel': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'json': return 'application/json';
      default: return 'text/plain';
    }
  };

  // Format icon belirleme
  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FilePdfOutlined style={{ color: '#f5222d' }} />;
      case 'excel': return <FileExcelOutlined style={{ color: '#52c41a' }} />;
      case 'json': return <FileTextOutlined style={{ color: '#1890ff' }} />;
      default: return <FileTextOutlined />;
    }
  };

  // Backup boyutunu formatla
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="backup-export-page">
      {/* Header Stats */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic
              title="Toplam Backup"
              value={backups.length}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic
              title="Son Backup"
              value={backups.length > 0 ? dayjs(backups[0].createdAt).fromNow() : 'Hiç'}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic
              title="Otomatik Backup"
              value={autoBackupEnabled ? 'Açık' : 'Kapalı'}
              prefix={<SyncOutlined />}
              valueStyle={{ color: autoBackupEnabled ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card title="Hızlı İşlemler" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              onClick={createManualBackup}
              loading={loading}
              block
              size="large"
            >
              Manuel Backup
            </Button>
          </Col>
          <Col span={6}>
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => setExportModalVisible(true)}
              block
              size="large"
            >
              Export Data
            </Button>
          </Col>
          <Col span={6}>
            <Button
              icon={<SyncOutlined />}
              onClick={toggleAutoBackup}
              type={autoBackupEnabled ? 'default' : 'primary'}
              block
              size="large"
            >
              Otomatik Backup {autoBackupEnabled ? 'Kapat' : 'Aç'}
            </Button>
          </Col>
          <Col span={6}>
            <Button
              icon={<CloudUploadOutlined />}
              onClick={() => setRestoreModalVisible(true)}
              block
              size="large"
            >
              Restore
            </Button>
          </Col>
        </Row>

        {autoBackupEnabled && (
          <Alert
            message="Otomatik Backup Aktif"
            description="Verileriniz her gün otomatik olarak yedeklenmektedir. Son 30 gün saklanır."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {/* Backup List */}
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>Backup Geçmişi</span>
          </Space>
        }
        loading={loading}
      >
        <List
          dataSource={backups}
          renderItem={(backup) => (
            <List.Item
              key={backup.id}
              actions={[
                <Tooltip title="İndir">
                  <Button
                    type="link"
                    icon={<CloudDownloadOutlined />}
                    href={backup.downloadUrl}
                    target="_blank"
                  />
                </Tooltip>,
                <Tooltip title="Geri Yükle">
                  <Button
                    type="link"
                    icon={<CloudUploadOutlined />}
                    onClick={() => restoreBackup(backup.id)}
                  />
                </Tooltip>,
                <Tooltip title="Sil">
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => deleteBackup(backup.id)}
                  />
                </Tooltip>
              ]}
            >
              <List.Item.Meta
                avatar={
                  backup.status === 'completed' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                  ) : backup.status === 'processing' ? (
                    <SyncOutlined spin style={{ color: '#1890ff', fontSize: 20 }} />
                  ) : (
                    <WarningOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                  )
                }
                title={
                  <Space>
                    <Text strong>
                      {backup.type === 'auto' ? 'Otomatik' : 'Manuel'} Backup
                    </Text>
                    <Tag color={backup.type === 'auto' ? 'blue' : 'green'}>
                      {backup.type.toUpperCase()}
                    </Tag>
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">
                      {dayjs(backup.createdAt).format('DD MMMM YYYY, HH:mm')}
                    </Text>
                    <Space>
                      <Text type="secondary">Boyut: {formatSize(backup.size)}</Text>
                      <Divider type="vertical" />
                      <Text type="secondary">
                        Süre: {dayjs(backup.expiresAt).format('DD MMM')} tarihinde sona eriyor
                      </Text>
                    </Space>
                    <div>
                      {backup.dataTypes.map(type => (
                        <Tag key={type}>
                          {type}
                        </Tag>
                      ))}
                    </div>
                  </Space>
                }
              />
            </List.Item>
          )}
          locale={{
            emptyText: 'Henüz backup oluşturulmamış'
          }}
        />
      </Card>

      {/* Export Modal */}
      <Modal
        title="Data Export"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        width={600}
      >
        {exportProgress > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text>Export işlemi devam ediyor...</Text>
            <Progress percent={exportProgress} />
          </div>
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={exportData}
        >
          <Form.Item
            name="format"
            label="Format"
            rules={[{ required: true, message: 'Format seçin' }]}
          >
            <Select>
              <Option value="excel">
                <Space>
                  <FileExcelOutlined style={{ color: '#52c41a' }} />
                  Excel (.xlsx)
                </Space>
              </Option>
              <Option value="pdf">
                <Space>
                  <FilePdfOutlined style={{ color: '#f5222d' }} />
                  PDF (.pdf)
                </Space>
              </Option>
              <Option value="json">
                <Space>
                  <FileTextOutlined style={{ color: '#1890ff' }} />
                  JSON (.json)
                </Space>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dataTypes"
            label="Export Edilecek Veriler"
            rules={[{ required: true, message: 'En az bir veri türü seçin' }]}
          >
            <Select mode="multiple">
              <Option value="study-sessions">Çalışma Oturumları</Option>
              <Option value="daily-plans">Günlük Planlar</Option>
              <Option value="achievements">Başarılar</Option>
              <Option value="statistics">İstatistikler</Option>
              <Option value="settings">Ayarlar</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Tarih Aralığı"
            rules={[{ required: true, message: 'Tarih aralığı seçin' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="includeStats" valuePropName="checked">
                <Button type="dashed" block>
                  İstatistikleri Dahil Et
                </Button>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="includeCharts" valuePropName="checked">
                <Button type="dashed" block>
                  Grafikleri Dahil Et
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Restore Modal */}
      <Modal
        title="Backup Geri Yükle"
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        footer={null}
        width={500}
      >
        {restoreProgress > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text>Geri yükleme işlemi devam ediyor...</Text>
            <Progress percent={restoreProgress} />
          </div>
        )}

        <Dragger
          name="backup"
          multiple={false}
          accept=".backup,.json"
          action="/api/backup/upload"
          onChange={(info) => {
            if (info.file.status === 'done') {
              message.success('Backup dosyası yüklendi');
            } else if (info.file.status === 'error') {
              message.error('Backup yüklenirken hata oluştu');
            }
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Backup dosyasını buraya sürükleyin</p>
          <p className="ant-upload-hint">
            .backup veya .json formatında dosya yükleyebilirsiniz
          </p>
        </Dragger>

        <Alert
          message="Dikkat"
          description="Backup geri yüklemesi mevcut tüm verilerinizi değiştirecektir. Bu işlem geri alınamaz."
          type="warning"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default BackupExport;