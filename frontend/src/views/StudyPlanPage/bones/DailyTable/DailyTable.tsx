import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiRequest } from '../../../../services/api';
import { 
  Table, 
  Card, 
  Button, 
  Progress, 
  Tag, 
  Space, 
  Typography, 
  Statistic,
  Row,
  Col,
  message,
  Badge,
  Tooltip,
  notification,
  Alert,
  Input,
  InputNumber,
  Slider,
  Divider,
  Pagination,
  Select
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { 
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  SyncOutlined,
  WifiOutlined,
  BellOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth, useIsStudent } from '../../../../contexts/AuthContext';
import SubjectEditModal from './SubjectEditModal';
import './DailyTable.scss';
import DailyTableTour from '../../../../components/tour/StudentTour/DailyTableTour';

const { Title, Text } = Typography;

interface Subject {
  subject: string;
  targetQuestions: number;
  targetTime?: number;
  topics: string[];
  description?: string;
  
  priority: number;
  completedQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  blankAnswers: number;
  studyTime: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
  sessionIds: string[];
}

interface DailyTableProps {
  plan: {
    _id: string;
    date: string;
    title: string;
    subjects: Subject[];
    stats: {
      totalTargetQuestions: number;
      totalCompletedQuestions: number;
      totalTargetTime: number;
      totalStudyTime: number;
      completionRate: number;
      netScore: number;
      successRate: number;
    };
    status: string;
  };
  onSubjectUpdate: (subjectIndex: number, updateData: any) => void;
  onPlanUpdate: (updateData: any) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const DailyTable: React.FC<DailyTableProps> = ({
  plan,
  onSubjectUpdate,
  onPlanUpdate: _onPlanUpdate,
  onRefresh,
  loading = false
}) => {
  const isStudent = useIsStudent();
  const { user } = useAuth();
  // Not used currently
  // const [selectedSubject, setSelectedSubject] = useState<{index: number, subject: Subject} | null>(null);
  const [previewSubjectIndex, setPreviewSubjectIndex] = useState<number | null>(null);
  const [editingSubject, setEditingSubject] = useState<{index: number, subject: Subject} | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sorterState, setSorterState] = useState<{ orderBy?: keyof Subject | 'completed' | 'net' | 'progress'; orderDirection?: 'ascend' | 'descend' } | undefined>();

  const GRID_STORAGE_KEY = 'grid:dailyTable';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GRID_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.pageSize) setPageSize(parsed.pageSize);
        if (parsed?.page) setPage(parsed.page);
        if (parsed?.sorter) setSorterState(parsed.sorter);
      }
    } catch (_) {}
  }, []);
  
  // Student feedback states
  const [dailyFeedback, setDailyFeedback] = useState<string>('');
  const [motivationScore, setMotivationScore] = useState<number>(5);
  const [subjectInputs, setSubjectInputs] = useState<{[key: string]: {correct: number, wrong: number, blank: number}}>({});
  
  // Real-time sync states
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<number>(0);

  // Advanced notifications state
  
  const [showMotivationalAlert, setShowMotivationalAlert] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Smart notification system
  // notifications reserved: currently disabled in tutorial phase

  // Check for milestones and achievements
  // Placeholder for future use (kept intentionally for tour/actions extensions)

  // Daily motivation system
  useEffect(() => {
    const checkDailyMotivation = () => {
      const completionRate = plan.stats.completionRate;
      const hour = new Date().getHours();
      
      // Morning motivation (8-10 AM)
      if (hour >= 8 && hour <= 10 && completionRate < 25) {
        setShowMotivationalAlert(true);
      }
      
      // Evening motivation (18-20 PM) 
      if (hour >= 18 && hour <= 20 && completionRate < 75) {
        notification.info({
          message: '🌅 Akşam Motivasyonu',
          description: 'Günü güçlü bir şekilde tamamlamak için son spurt!',
          icon: <BellOutlined style={{ color: '#722ed1' }} />,
          duration: 5,
          placement: 'topRight'
        });
      }
    };

    const motivationTimer = setTimeout(checkDailyMotivation, 1000);
    return () => clearTimeout(motivationTimer);
  }, [plan.stats.completionRate]);

  // Real-time sync effects
  useEffect(() => {
    // Online/offline status monitoring
    const handleOnline = () => {
      setIsOnline(true);
      message.success('Bağlantı tekrar kuruldu!');
      if (pendingUpdates > 0) {
        handleManualRefresh();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      message.warning('İnternet bağlantısı kesildi. Değişiklikler kaydedilecek.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingUpdates]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshEnabled && isOnline) {
      refreshIntervalRef.current = setInterval(() => {
        if (onRefresh) {
          onRefresh();
          setLastSync(new Date());
        }
      }, 30000); // 30 saniyede bir yenile
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, isOnline, onRefresh]);

  // Manual refresh handler
  const handleManualRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
        setLastSync(new Date());
        setPendingUpdates(0);
        message.success('Veriler güncellendi!');
      } catch (error) {
        message.error('Güncelleme başarısız');
      }
    }
  };

  // Toggle auto refresh
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
    message.info(
      autoRefreshEnabled 
        ? 'Otomatik güncelleme kapatıldı' 
        : 'Otomatik güncelleme açıldı'
    );
  };

  // Subject name mapping
  const getSubjectDisplayName = (subject: string): string => {
    const names: Record<string, string> = {
      matematik: '📐 Matematik',
              turkce: 'Türkçe', 
      kimya: '🧪 Kimya',
      fizik: '🔬 Fizik',
      biyoloji: '🌱 Biyoloji',
              tarih: 'Tarih',
      cografya: '🌍 Coğrafya',
      felsefe: '🤔 Felsefe',
      geometri: '📐 Geometri',
              edebiyat: 'Edebiyat',
      ingilizce: '🇬🇧 İngilizce',
      matematik_ayt: '📐 Matematik (AYT)',
      fizik_ayt: '🔬 Fizik (AYT)',
      kimya_ayt: '🧪 Kimya (AYT)',
      biyoloji_ayt: '🌱 Biyoloji (AYT)',
    };
    return names[subject] || subject.charAt(0).toUpperCase() + subject.slice(1);
  };

  // Status color mapping
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      not_started: 'default',
      in_progress: 'processing', 
      completed: 'success',
      skipped: 'error'
    };
    return colors[status] || 'default';
  };

  // Status text mapping
  const getStatusText = (status: string): string => {
    const texts: Record<string, string> = {
      not_started: 'Başlanmadı',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      skipped: 'Atlandı'
    };
    return texts[status] || status;
  };

  // Net score calculation
  const calculateNet = (correct: number, wrong: number): number => {
    return Math.max(correct - (wrong / 4), 0);
  };

  // Completion percentage
  const getCompletionPercentage = (completed: number, target: number): number => {
    if (!target || target <= 0) return 0;
    const ratio = completed / target;
    if (!isFinite(ratio) || isNaN(ratio)) return 0;
    return Math.round(ratio * 100);
  };

  // Success rate
  


  

  // Handle subject edit
  const handleSubjectEdit = (subjectIndex: number, updatedSubject: Subject) => {
    const subjectWithDefaults = {
      ...updatedSubject,
      sessionIds: updatedSubject.sessionIds || []
    };
    
    onSubjectUpdate(subjectIndex, subjectWithDefaults);
    setEditingSubject(null);
    message.success('Ders bilgileri güncellendi!');
    
    // Real-time sync
    if (isOnline) {
      setLastSync(new Date());
    } else {
      setPendingUpdates(prev => prev + 1);
    }
  };

  const HeaderWithTooltip: React.FC<{ title: string; tooltip?: string }> = ({ title, tooltip }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{title}</span>
      {tooltip && (
        <Tooltip title={tooltip} placement="top">
          <InfoCircleOutlined style={{ color: '#999', fontSize: '12px' }} />
        </Tooltip>
      )}
    </div>
  );

  const columnTooltips: Record<string, string> = {
    subject: 'Çalışılacak ders ve öncelik seviyesi',
    completed: 'Toplam çözülen soru sayısı',
    correct: 'Doğru cevap sayısı',
    wrong: 'Yanlış cevap sayısı',
    blank: 'Boş bırakılan soru sayısı',
    net: 'Net puan (doğru - yanlış/4)',
    progress: 'Hedefin tamamlanma yüzdesi',
    status: 'Ders çalışma durumu'
  };

  // Table columns
  const columns: ColumnsType<Subject & { index: number }> = useMemo(() => [
    {
      title: <HeaderWithTooltip title="Ders" tooltip={columnTooltips.subject} />,
      dataIndex: 'subject',
      key: 'subject',
      width: 150,
      fixed: 'left',
      render: (subject: string, record) => (
        <div className="subject-cell">
          <div className="subject-name">
            {getSubjectDisplayName(subject)}
          </div>
          <span
            className={`priority-badge ${
              record.priority <= 3 ? 'high' : record.priority <= 6 ? 'medium' : 'low'
            }`}
          >
            <span className="priority-dot" />
            Öncelik {record.priority}
          </span>
        </div>
      ),
      sorter: (a, b) => a.subject.localeCompare(b.subject),
      sortOrder: sorterState?.orderBy === 'subject' ? sorterState.orderDirection : undefined,
      filters: [
        { text: 'Yüksek Öncelik (1-3)', value: 'high' },
        { text: 'Orta Öncelik (4-6)', value: 'medium' },
        { text: 'Düşük Öncelik (7-10)', value: 'low' },
      ],
      onFilter: (value: any, record) => {
        if (value === 'high') return record.priority <= 3;
        if (value === 'medium') return record.priority >= 4 && record.priority <= 6;
        if (value === 'low') return record.priority >= 7;
        return true;
      },
    },
    {
      title: <HeaderWithTooltip title="Yapılan" tooltip={columnTooltips.completed} />,
      key: 'completed',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const completed = record.correctAnswers + record.wrongAnswers + record.blankAnswers;
        return (
          <Text 
            strong 
            style={{ 
              fontSize: '16px',
              color: completed >= record.targetQuestions ? '#52c41a' : '#1890ff'
            }}
          >
            {completed}
          </Text>
        );
      },
      sorter: (a, b) => {
        const aCompleted = a.correctAnswers + a.wrongAnswers + a.blankAnswers;
        const bCompleted = b.correctAnswers + b.wrongAnswers + b.blankAnswers;
        return aCompleted - bCompleted;
      },
      sortOrder: sorterState?.orderBy === 'completed' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="D" tooltip={columnTooltips.correct} />,
      dataIndex: 'correctAnswers',
      key: 'correct',
      width: 60,
      align: 'center',
      render: (correct: number, record) => {
        if (isStudent) {
          return (
            <InputNumber
              min={0}
              max={999}
              value={subjectInputs[record.subject]?.correct ?? correct}
              onChange={(value) => {
                const newInputs = { ...subjectInputs };
                if (!newInputs[record.subject]) newInputs[record.subject] = { correct: 0, wrong: 0, blank: 0 };
                newInputs[record.subject].correct = value || 0;
                setSubjectInputs(newInputs);
              }}
              size="small"
              style={{ width: '60px' }}
            />
          );
        }
        return <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>{correct}</Text>;
      },
      sorter: (a, b) => a.correctAnswers - b.correctAnswers,
      sortOrder: sorterState?.orderBy === 'correctAnswers' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Y" tooltip={columnTooltips.wrong} />,
      dataIndex: 'wrongAnswers',
      key: 'wrong',
      width: 60,
      align: 'center',
      render: (wrong: number, record) => {
        if (isStudent) {
          return (
            <InputNumber
              min={0}
              max={999}
              value={subjectInputs[record.subject]?.wrong ?? wrong}
              onChange={(value) => {
                const newInputs = { ...subjectInputs };
                if (!newInputs[record.subject]) newInputs[record.subject] = { correct: 0, wrong: 0, blank: 0 };
                newInputs[record.subject].wrong = value || 0;
                setSubjectInputs(newInputs);
              }}
              size="small"
              style={{ width: '60px' }}
            />
          );
        }
        return <Text style={{ color: '#ff4d4f', fontWeight: 'bold' }}>{wrong}</Text>;
      },
      sorter: (a, b) => a.wrongAnswers - b.wrongAnswers,
      sortOrder: sorterState?.orderBy === 'wrongAnswers' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="B" tooltip={columnTooltips.blank} />,
      dataIndex: 'blankAnswers', 
      key: 'blank',
      width: 60,
      align: 'center',
      render: (blank: number, record) => {
        if (isStudent) {
          return (
            <InputNumber
              min={0}
              max={999}
              value={subjectInputs[record.subject]?.blank ?? blank}
              onChange={(value) => {
                const newInputs = { ...subjectInputs };
                if (!newInputs[record.subject]) newInputs[record.subject] = { correct: 0, wrong: 0, blank: 0 };
                newInputs[record.subject].blank = value || 0;
                setSubjectInputs(newInputs);
              }}
              size="small"
              style={{ width: '60px' }}
            />
          );
        }
        return <Text style={{ color: '#8c8c8c', fontWeight: 'bold' }}>{blank}</Text>;
      },
      sorter: (a, b) => a.blankAnswers - b.blankAnswers,
      sortOrder: sorterState?.orderBy === 'blankAnswers' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Net" tooltip={columnTooltips.net} />,
      key: 'net',
      width: 80,
      align: 'center',
      render: (_, record) => {
        const net = calculateNet(record.correctAnswers, record.wrongAnswers);
        return (
          <Text strong style={{ 
            color: net >= 10 ? '#52c41a' : net >= 5 ? '#faad14' : '#ff4d4f', 
            fontSize: '16px' 
          }}>
            {net.toFixed(1)}
          </Text>
        );
      },
      sorter: (a, b) => {
        const netA = calculateNet(a.correctAnswers, a.wrongAnswers);
        const netB = calculateNet(b.correctAnswers, b.wrongAnswers);
        return netA - netB;
      },
      sortOrder: sorterState?.orderBy === 'net' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="İlerleme" tooltip={columnTooltips.progress} />,
      key: 'progress',
      width: 120,
      render: (_, record) => {
        const completed = record.correctAnswers + record.wrongAnswers + record.blankAnswers;
        const percentage = getCompletionPercentage(completed, record.targetQuestions);
        return (
          <Progress
            percent={percentage}
            size="small"
            status={percentage === 100 ? 'success' : 'active'}
            format={() => `${percentage}%`}
          />
        );
      },
      sorter: (a, b) => {
        const aCompleted = a.correctAnswers + a.wrongAnswers + a.blankAnswers;
        const bCompleted = b.correctAnswers + b.wrongAnswers + b.blankAnswers;
        const aPercentage = getCompletionPercentage(aCompleted, a.targetQuestions);
        const bPercentage = getCompletionPercentage(bCompleted, b.targetQuestions);
        return aPercentage - bPercentage;
      },
      sortOrder: sorterState?.orderBy === 'progress' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Durum" tooltip={columnTooltips.status} />,
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      filters: [
        { text: 'Başlanmadı', value: 'not_started' },
        { text: 'Devam Ediyor', value: 'in_progress' },
        { text: 'Tamamlandı', value: 'completed' },
        { text: 'Atlandı', value: 'skipped' },
      ],
      onFilter: (value: any, record) => record.status === value,
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => setEditingSubject({ index: record.index, subject: record })}
          />
        </Space>
      ),
    },
  ], [subjectInputs, isStudent, sorterState]);

  const sortedSubjects = useMemo(() => {
    const dataSource = plan.subjects.map((subject, index) => ({
      ...subject,
      index,
      key: index
    }));
    
    if (!sorterState?.orderBy || !sorterState.orderDirection) return dataSource;
    const { orderBy, orderDirection } = sorterState;
    const sorted = [...dataSource].sort((a, b) => {
      let av, bv;
      
      if (orderBy === 'completed') {
        av = a.correctAnswers + a.wrongAnswers + a.blankAnswers;
        bv = b.correctAnswers + b.wrongAnswers + b.blankAnswers;
      } else if (orderBy === 'net') {
        av = calculateNet(a.correctAnswers, a.wrongAnswers);
        bv = calculateNet(b.correctAnswers, b.wrongAnswers);
      } else if (orderBy === 'progress') {
        const aCompleted = a.correctAnswers + a.wrongAnswers + a.blankAnswers;
        const bCompleted = b.correctAnswers + b.wrongAnswers + b.blankAnswers;
        av = getCompletionPercentage(aCompleted, a.targetQuestions);
        bv = getCompletionPercentage(bCompleted, b.targetQuestions);
      } else {
        av = (a as any)[orderBy];
        bv = (b as any)[orderBy];
      }
      
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return av - bv;
      }
      return String(av).localeCompare(String(bv));
    });
    return orderDirection === 'ascend' ? sorted : sorted.reverse();
  }, [plan.subjects, sorterState]);

  const totalCount = sortedSubjects.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagedSubjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedSubjects.slice(start, end);
  }, [sortedSubjects, currentPage, pageSize]);

  const handleTableChange: TableProps<Subject & { index: number }>['onChange'] = useCallback((
    _pagination: any,
    _filters: any,
    sorter: any
  ) => {
    if (!Array.isArray(sorter) && sorter?.field) {
      setSorterState({ orderBy: sorter.field as keyof Subject | 'completed' | 'net' | 'progress', orderDirection: sorter.order || undefined });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        GRID_STORAGE_KEY,
        JSON.stringify({ page: currentPage, pageSize, sorter: sorterState })
      );
    } catch (_) {}
  }, [currentPage, pageSize, sorterState]);

  return (
    <div className="daily-table">
      {/* Subjects Table - En üste taşındı */}
      <Card title="Günlük Ders Programı" className="subjects-table">
        {previewSubjectIndex === null && (
          <Alert
            type="info"
            showIcon
            message="Çalışacağın dersin detaylarını görmek icin tabloda ilgili satıra tıkla"
            style={{ marginBottom: '12px' }}
          />
        )}
        {/* Üst bilgi: Seçili ders açıklaması */}
        {typeof previewSubjectIndex === 'number' && plan.subjects[previewSubjectIndex] && (
          <div className="subject-preview">
            <div className="subject-preview-header">
              <Text strong>
                {getSubjectDisplayName(plan.subjects[previewSubjectIndex].subject)} • Açıklama
              </Text>
              <span
                className={`priority-badge ${
                  plan.subjects[previewSubjectIndex].priority <= 3
                    ? 'high'
                    : plan.subjects[previewSubjectIndex].priority <= 6
                    ? 'medium'
                    : 'low'
                }`}
              >
                <span className="priority-dot" />
                Öncelik {plan.subjects[previewSubjectIndex].priority}
              </span>
            </div>
            <div className="subject-preview-body">
              <Text>
                {plan.subjects[previewSubjectIndex].description || 'Sistemsel hata tespit edildi, koçunuzu bilgilendiriniz.'}
              </Text>
            </div>
          </div>
        )}

        <div className="subjects-table-content" ref={tableContainerRef as any}>
          <div className="table-info">
            <Typography.Text type="secondary">
              {totalCount} ders listeleniyor
            </Typography.Text>
          </div>

          <Table
            className="daily-subjects-table"
            columns={columns}
            dataSource={pagedSubjects}
            loading={{ spinning: loading, tip: 'Yükleniyor...' }}
            pagination={false}
            size="small"
            onChange={handleTableChange}
            sticky
            scroll={{ x: 'max-content', y: '60vh' }}
            onRow={(record) => ({
              onClick: () => setPreviewSubjectIndex(record.index)
            })}
          />

          {/* Custom Pagination */}
          {totalCount > pageSize && (
            <div className="pagination-container">
              <div className="pagination-info">
                <Typography.Text style={{ color: '#64748b', fontSize: '13px' }}>
                  Toplam Kayıt Sayısı: {totalCount}
                </Typography.Text>

                <Pagination
                  current={currentPage}
                  total={totalCount}
                  pageSize={pageSize}
                  showSizeChanger={false}
                  showQuickJumper
                  onChange={(p) => setPage(p)}
                  size="small"
                />

                <div className="page-size-selector">
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Kayıt Göster:</span>
                  <Select
                    value={pageSize}
                    onChange={(val) => {
                      setPageSize(val);
                      setPage(1);
                    }}
                    style={{ width: 80 }}
                    size="small"
                    options={[5, 10, 20, 50].map(v => ({ label: v, value: v }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Plan Summary with Real-time Status */}
      <Card className="plan-summary" size="small">
        {/* Real-time Sync Header */}
        <div className="sync-header">
          <div className="sync-status">
            <Badge 
              status={isOnline ? 'success' : 'error'} 
              text={isOnline ? 'Çevrimiçi' : 'Çevrimdışı'} 
            />
            {pendingUpdates > 0 && (
              <Badge 
                count={pendingUpdates} 
                style={{ backgroundColor: '#f59e0b' }} 
                title="Bekleyen güncelleme"
              />
            )}
            <span className="sync-text">
              {isOnline ? 'Bağlantı aktif' : 'Çevrimdışı mod'}
            </span>
          </div>
          
          <div className="sync-controls">
            <Tooltip title={`Son güncelleme: ${lastSync.toLocaleTimeString()}`}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <WifiOutlined /> {lastSync.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Tooltip>
            
            <Tooltip title="Verileri yenile">
              <Button
                type="text"
                size="small"
                icon={<SyncOutlined spin={loading} />}
                onClick={handleManualRefresh}
                loading={loading}
                disabled={!isOnline}
              />
            </Tooltip>
            
            <Tooltip title={autoRefreshEnabled ? 'Otomatik güncellemeyi durdur' : 'Otomatik güncellemeyi başlat'}>
              <Button
                type="text"
                size="small"
                icon={<WifiOutlined />}
                onClick={toggleAutoRefresh}
                style={{ color: autoRefreshEnabled ? '#10b981' : '#64748b' }}
              />
            </Tooltip>
          </div>
        </div>

        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Statistic
              title="Toplam Hedef"
              value={plan.stats.totalTargetQuestions ?? 0}
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Tamamlanan"
              value={plan.stats.totalCompletedQuestions ?? 0}
              suffix={`/${plan.stats.totalTargetQuestions ?? 0}`}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Toplam Net"
              value={Number(plan.stats.netScore ?? 0).toFixed(1)}
              prefix={<FireOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Süre"
              value={`${Math.round((plan.stats.totalStudyTime ?? 0) / 60)}s`}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
        
        <div className="overall-progress">
          <Text strong>Genel İlerleme</Text>
          <Progress
            percent={plan.stats.completionRate}
            status={plan.stats.completionRate === 100 ? 'success' : 'active'}
          />
        </div>
        
        {/* Motivational Alert */}
        {showMotivationalAlert && (
          <Alert
            message="🌅 Günaydın! Yeni Gün Yeni Umutlar"
            description="Bugünkü hedeflerinize ulaşmak için harika bir gün! Küçük adımlarla büyük başarılar elde edebilirsiniz."
            type="info"
            showIcon
            closable
            onClose={() => setShowMotivationalAlert(false)}
            style={{ 
              marginTop: '12px'
            }}
            action={
              <Button
                type="primary"
                size="small"
                onClick={() => {
                  setShowMotivationalAlert(false);
                  notification.success({
                    message: 'Motivasyon Yüklendi!',
                    description: 'Başarıya giden yolda her adım değerli!',
                    duration: 3
                  });
                }}
              >
                Başlayalım!
              </Button>
            }
          />
        )}
      </Card>

      {/* Student Feedback Section - Only visible to students */}
      {isStudent && (
        <Card title="Günlük Değerlendirme" style={{ marginTop: '16px' }}>
          <Row gutter={16}>
            {/* Feedback Text Area */}
            <Col xs={24} md={16}>
              <div style={{ marginBottom: '16px' }}>
                <Title level={5} style={{ marginBottom: '8px' }}>
                  Program nasıl geçti, verimli miydi?
                </Title>
                <Input.TextArea
                  value={dailyFeedback}
                  onChange={(e) => setDailyFeedback(e.target.value)}
                  placeholder="Bugünkü çalışma programınız hakkında düşüncelerinizi yazın..."
                  rows={4}
                  maxLength={500}
                  showCount
                  
                />
              </div>
            </Col>

            {/* Motivation Score */}
            <Col xs={24} md={8}>
              <div style={{ marginBottom: '16px' }}>
                <Title level={5} style={{ marginBottom: '16px' }}>
                  Bugün 10 üzerinden kaç motive hissediyorsun?
                </Title>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    {motivationScore}/10
                  </Text>
                </div>
                <Slider
                  min={1}
                  max={10}
                  step={1}
                  value={motivationScore}
                  onChange={setMotivationScore}
                  marks={{
                    1: '😔',
                    3: '😐',
                    5: '🙂',
                    7: '😊',
                    10: ''
                  }}
                  tooltip={{ formatter: (value) => `${value}/10` }}
                />
              </div>
            </Col>
          </Row>

          {/* Submit Button */}
          <Divider />
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              onClick={async () => {
                try {
                  // Gather all subject data from inputs
                  const feedbackData: any[] = [];
                  
                  // Process each subject
                  plan.subjects.forEach((subject, index) => {
                    const inputData = subjectInputs[subject.subject];
                    if (inputData && (inputData.correct > 0 || inputData.wrong > 0 || inputData.blank > 0)) {
                      feedbackData.push({
                        subjectIndex: index,
                        correctAnswers: inputData.correct,
                        wrongAnswers: inputData.wrong,
                        blankAnswers: inputData.blank,
                        feedbackText: dailyFeedback,
                        motivationScore: motivationScore
                      });
                    }
                  });
                  
                  if (feedbackData.length === 0) {
                    message.warning('En az bir ders için D-Y-B değerlerini girmelisiniz');
                    return;
                  }
                  
                  // Send feedback for each subject
                  for (const data of feedbackData) {
                    await apiRequest(`/daily-plans/${plan._id}/student-feedback`, {
                      method: 'POST',
                      body: JSON.stringify(data)
                    });
                  }
                  
                  message.success('Günlük değerlendirmeniz koçunuza gönderildi!');
                  
                  // Clear inputs after successful submit
                  setSubjectInputs({});
                  setDailyFeedback('');
                  setMotivationScore(5);
                  
                  // Refresh plan data
                  if (onRefresh) {
                    onRefresh();
                  }
                  
                } catch (error: any) {
                  console.error('Feedback submit error:', error);
                  message.error(error.message || 'Feedback gönderilirken hata oluştu');
                }
              }}
              style={{
                minWidth: '200px',
                height: '40px',
                borderRadius: '8px'
              }}
            >
              Raporu Koça Gönder
            </Button>
          </div>
        </Card>
      )}


      {/* Subject Edit Modal */}
      {editingSubject && (
        <SubjectEditModal
          visible={true}
          subject={editingSubject.subject}
          onSave={(updatedSubject) => {
            const normalized: Subject = {
              ...editingSubject.subject,
              ...updatedSubject,
              description: updatedSubject.description ?? editingSubject.subject.description ?? '',
              sessionIds: updatedSubject.sessionIds ?? editingSubject.subject.sessionIds ?? []
            };
            handleSubjectEdit(editingSubject.index, normalized);
          }}
          onCancel={() => setEditingSubject(null)}
        />
      )}
      {/* Table specific tour */}
      <DailyTableTour
        userId={user?._id}
        targets={{
          getFirstRowEl: () => (tableContainerRef.current?.querySelector('.ant-table-tbody tr') as HTMLElement | null) || null,
          getTableEl: () => (tableContainerRef.current as any) || null,
        }}
      />
    </div>
  );
};

export default DailyTable;