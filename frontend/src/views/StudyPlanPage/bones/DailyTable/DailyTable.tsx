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
  BellOutlined,
  InfoCircleOutlined,
  StarOutlined,
  BulbOutlined
} from '@ant-design/icons';
import { useAuth, useIsStudent } from '../../../../contexts/AuthContext';
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
  


  

  // Inline D/Y/B kaydetme yardımcıları
  const getSubjectKey = useCallback((index: number) => String(index), []);

  const saveDYBForSubject = useCallback((subjectIndex: number) => {
    const key = getSubjectKey(subjectIndex);
    const data = subjectInputs[key];
    if (!data) return;
    onSubjectUpdate(subjectIndex, {
      correctAnswers: data.correct,
      wrongAnswers: data.wrong,
      blankAnswers: data.blank
    });
    if (isOnline) {
      setLastSync(new Date());
    } else {
      setPendingUpdates(prev => prev + 1);
    }
  }, [getSubjectKey, subjectInputs, onSubjectUpdate, isOnline]);

  const HeaderWithTooltip: React.FC<{ title: string; tooltip?: string }> = ({ title, tooltip }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{title}</span>
      {tooltip && (
        <Tooltip title={tooltip} placement="top">
          <InfoCircleOutlined className="header-tooltip-icon" />
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
      title: <HeaderWithTooltip title="Öncelik" tooltip="Ders öncelik seviyesi" />,
      dataIndex: 'priority',
      key: 'priority',
      width: 120,
      fixed: 'left',
      render: (priority: number) => (
        <div className="priority-cell">
          <span
            className={`priority-badge ${
              priority <= 3 ? 'high' : priority <= 6 ? 'medium' : 'low'
            }`}
          >
            <span className="priority-dot" />
            {priority}
          </span>
        </div>
      ),
      sorter: (a, b) => a.priority - b.priority,
      sortOrder: sorterState?.orderBy === 'priority' ? sorterState.orderDirection : undefined,
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
      title: <HeaderWithTooltip title="Ders" tooltip={columnTooltips.subject} />,
      dataIndex: 'subject',
      key: 'subject',
      width: 150,
      render: (subject: string) => (
        <div className="subject-cell">
          <div className="subject-name">
            {getSubjectDisplayName(subject)}
          </div>
        </div>
      ),
      sorter: (a, b) => a.subject.localeCompare(b.subject),
      sortOrder: sorterState?.orderBy === 'subject' ? sorterState.orderDirection : undefined,
    },
    {
      title: <HeaderWithTooltip title="Yapılan" tooltip={columnTooltips.completed} />,
      key: 'completed',
      width: 120,
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
              value={subjectInputs[getSubjectKey(record.index)]?.correct ?? correct}
              onChange={(value) => {
                const key = getSubjectKey(record.index);
                const newInputs = { ...subjectInputs } as typeof subjectInputs;
                if (!newInputs[key]) newInputs[key] = { correct: 0, wrong: 0, blank: 0 };
                newInputs[key].correct = value || 0;
                setSubjectInputs(newInputs);
              }}
              onBlur={() => saveDYBForSubject(record.index)}
              size="small"
              className="input-small"
            />
          );
        }
        return <Text className="text-correct">{correct}</Text>;
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
              value={subjectInputs[getSubjectKey(record.index)]?.wrong ?? wrong}
              onChange={(value) => {
                const key = getSubjectKey(record.index);
                const newInputs = { ...subjectInputs } as typeof subjectInputs;
                if (!newInputs[key]) newInputs[key] = { correct: 0, wrong: 0, blank: 0 };
                newInputs[key].wrong = value || 0;
                setSubjectInputs(newInputs);
              }}
              onBlur={() => saveDYBForSubject(record.index)}
              size="small"
              className="input-small"
            />
          );
        }
        return <Text className="text-wrong">{wrong}</Text>;
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
              value={subjectInputs[getSubjectKey(record.index)]?.blank ?? blank}
              onChange={(value) => {
                const key = getSubjectKey(record.index);
                const newInputs = { ...subjectInputs } as typeof subjectInputs;
                if (!newInputs[key]) newInputs[key] = { correct: 0, wrong: 0, blank: 0 };
                newInputs[key].blank = value || 0;
                setSubjectInputs(newInputs);
              }}
              onBlur={() => saveDYBForSubject(record.index)}
              size="small"
              className="input-small"
            />
          );
        }
        return <Text className="text-blank">{blank}</Text>;
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
      width: 160,
      render: (status: string, record) => (
        isStudent ? (
          <Select
            size="small"
            value={status}
            className="select-status"
            onChange={(val) => onSubjectUpdate(record.index, { status: val })}
            options={[
              { label: 'Başlanmadı', value: 'not_started' },
              { label: 'Devam Ediyor', value: 'in_progress' },
              { label: 'Tamamlandı', value: 'completed' },
              { label: 'Atlandı', value: 'skipped' },
            ]}
          />
        ) : (
          <Tag color={getStatusColor(status)}>
            {getStatusText(status)}
          </Tag>
        )
      ),
      filters: [
        { text: 'Başlanmadı', value: 'not_started' },
        { text: 'Devam Ediyor', value: 'in_progress' },
        { text: 'Tamamlandı', value: 'completed' },
        { text: 'Atlandı', value: 'skipped' },
      ],
      onFilter: (value: any, record) => record.status === value,
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
          <div className="interaction-guide">
            <div className="guide-content">
              <div className="guide-text">
                <Text type="secondary" className="text-secondary-small">
                  💡 Ders detaylarını görmek için satıra tıklayın
                </Text>
              </div>
            </div>
          </div>
        )}
        {/* Üst bilgi: Seçili ders açıklaması */}
        {typeof previewSubjectIndex === 'number' && plan.subjects[previewSubjectIndex] && (
          <div className="subject-preview">
            <div className="subject-preview-header">
              <Text strong>
                {getSubjectDisplayName(plan.subjects[previewSubjectIndex].subject)} • Açıklama
              </Text>
              {' '}
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
                {plan.subjects[previewSubjectIndex].description || 'Bu ders için henüz açıklama eklenmemiş.'}
              </Text>
            </div>
          </div>
        )}

        <div className="subjects-table-content" ref={tableContainerRef as any}>
          <div className="table-info">
            <Typography.Text type="secondary">
              {totalCount === 0 ? 'Ders bulunamadı' : `Toplam ${totalCount} ders`}
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
                <Typography.Text className="text-pagination">
                  Toplam Kayıt Sayısı: {totalCount}
                </Typography.Text>

                <Pagination
                  current={currentPage}
                  total={totalCount}
                  pageSize={pageSize}
                  showSizeChanger={false}
                  onChange={(p) => setPage(p)}
                  size="small"
                />

                <div className="page-size-selector">
                  <span className="text-pagination">Kayıt Göster:</span>
                  <Select
                    value={pageSize}
                    onChange={(val) => {
                      setPageSize(val);
                      setPage(1);
                    }}
                    className="select-pagesize"
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
              title="Toplam Süre"
              value={plan.stats.totalStudyTime ?? 0}
              suffix="dk"
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="Tamamlanma"
              value={Math.round(plan.stats.completionRate ?? 0)}
              suffix="%"
            />
          </Col>
        </Row>
      </Card>

      {/* Student Feedback Section - Only visible to students */}
      {isStudent && (
        <Card className="daily-evaluation-card" title={
          <div className="evaluation-header">
            <div className="evaluation-title">
              <StarOutlined className="evaluation-icon" />
              <span>Günlük Değerlendirme</span>
              </div>
            <div className="evaluation-subtitle">
              Bugünkü çalışma deneyiminizi değerlendirin
            </div>
          </div>
        }>
          <div className="evaluation-content">
            {/* Motivasyon ve Genel Durum */}
            <div className="evaluation-section motivation-section">
              <div className="section-header">
                <Title level={5} className="section-title">
                  <FireOutlined /> Motivasyon ve Genel Durum
                </Title>
                <Text type="secondary" className="section-description">
                  Bugün kendinizi nasıl hissediyorsunuz?
                  </Text>
                </div>
              
              <div className="motivation-quick-actions">
                <div className="quick-action-title">
                  <Text strong>Motivasyon Seviyesi</Text>
                </div>
                <div className="quick-actions-grid">
                  {[
                    { value: 3, emoji: '😔', label: 'Zor Gün' },
                    { value: 5, emoji: '😐', label: 'Normal' },
                    { value: 7, emoji: '🙂', label: 'İyi' },
                    { value: 9, emoji: '😊', label: 'Harika' }
                  ].map((action) => (
                    <button
                      key={action.value}
                      className={`quick-action-btn ${motivationScore === action.value ? 'active' : ''}`}
                      onClick={() => setMotivationScore(action.value)}
                    >
                      <span className="action-emoji">{action.emoji}</span>
                      <span className="action-label">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Detaylı Geri Bildirim */}
            <div className="evaluation-section feedback-section">
              <div className="section-header">
                <Title level={5} className="section-title">
                  <BulbOutlined /> Detaylı Geri Bildirim
                </Title>
                <Text type="secondary" className="section-description">
                  Bugünkü çalışma deneyiminizi detaylandırın
                </Text>
              </div>
              
              <div className="feedback-content">
                <div className="feedback-textarea-container">
                  <div className="textarea-header">
                    <Text strong className="textarea-label">Program Değerlendirmesi</Text>
                    <div className="textarea-counter">
                      <span className="current-count">{dailyFeedback.length}</span>
                      <span className="max-count">/500</span>
                    </div>
                  </div>
                  
                  <Input.TextArea
                    value={dailyFeedback}
                    onChange={(e) => setDailyFeedback(e.target.value)}
                    placeholder="Bugünkü çalışma programınız hakkında düşüncelerinizi yazın... Örneğin: Hangi konular zor geldi? Hangi teknikler işe yaradı? Yarın için önerileriniz neler?"
                    rows={4}
                    maxLength={500}
                    className="feedback-textarea"
                    showCount={false}
                  />
                </div>
                
                <div className="feedback-suggestions">
                  <div className="suggestions-header">
                    <Text type="secondary" className="suggestions-title">
                      💡 Önerilen Konular
                    </Text>
                  </div>
                  <div className="suggestions-grid">
                    {[
                      'Hangi konular zor geldi?',
                      'Hangi çalışma teknikleri işe yaradı?',
                      'Yarın için önerileriniz neler?',
                      'Motivasyonunuzu etkileyen faktörler?'
                    ].map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-btn"
                        onClick={() => {
                          if (dailyFeedback.length < 450) {
                            setDailyFeedback(prev => 
                              prev + (prev ? ' ' : '') + suggestion
                            );
                          }
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Performans Özeti */}
            <div className="evaluation-section performance-section">
              <div className="section-header">
                <Title level={5} className="section-title">
                  <TrophyOutlined /> Bugünkü Performans Özeti
                </Title>
                <Text type="secondary" className="section-description">
                  Günlük çalışma istatistikleriniz
                </Text>
              </div>
              
              <div className="performance-grid">
                <div className="performance-card">
                  <div className="performance-icon">
                    <CheckCircleOutlined />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{plan.stats.completionRate}%</div>
                    <div className="performance-label">Tamamlanma Oranı</div>
                  </div>
                </div>
                
                <div className="performance-card">
                  <div className="performance-icon">
                    <TrophyOutlined />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{plan.stats.successRate}%</div>
                    <div className="performance-label">Başarı Oranı</div>
                  </div>
                </div>
                
                <div className="performance-card">
                  <div className="performance-icon">
                    <ClockCircleOutlined />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{Math.round(plan.stats.totalStudyTime / 60)}dk</div>
                    <div className="performance-label">Toplam Süre</div>
                  </div>
                </div>
                
                <div className="performance-card">
                  <div className="performance-icon">
                    <FireOutlined />
                  </div>
                  <div className="performance-content">
                    <div className="performance-value">{plan.stats.netScore.toFixed(1)}</div>
                    <div className="performance-label">Net Puan</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gönder Butonu */}
            <div className="evaluation-submit">
              <div className="submit-content">
                <div className="submit-info">
                  <Text type="secondary" className="submit-description">
                    Değerlendirmeniz koçunuza gönderilecek ve gelecek programlarınızın iyileştirilmesinde kullanılacaktır.
                  </Text>
                </div>
                
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
                    const key = String(index);
                    const inputData = subjectInputs[key];
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
                  className="submit-button"
                  disabled={!dailyFeedback.trim()}
                >
                  Değerlendirmeyi Gönder
            </Button>
              </div>
            </div>
          </div>
        </Card>
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