import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiRequest, getYouTubeVideos, getYouTubePlaylistItems, getCoachSubjectPreferences, getMySubjectPreferences } from '../../../../services/api';
import { 
  Table, 
  Card, 
  Button, 
  Progress, 
  Tag, 
  Typography, 
  Statistic,
  Row,
  Col,
  message,
  Tooltip,
  Input,
  Modal,
  Pagination,
  Select
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import { 
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  FireOutlined,
  InfoCircleOutlined,
  StarOutlined,
  BulbOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import StudyTimer from '../../../StudyTrackerPage/bones/StudyTimer/StudyTimer';
import FullScreenSplitIntro from '../../../../components/animations/FullScreenSplitIntro';
import ekranImage from '../../../../assets/ekran.jpeg';
import { useAuth, useIsStudent } from '../../../../contexts/AuthContext';
import './DailyTable.scss';
import ProgramDetailLayout from './ProgramDetailLayout';

const { Text } = Typography;

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
  videos?: any[];
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
  const [coachProgram, setCoachProgram] = useState<any | null>(null);
  const [videoMetaMap, setVideoMetaMap] = useState<Record<string, any>>({});
  // const [previewPlaylistVideos, setPreviewPlaylistVideos] = useState<any[] | null>(null); // (kullanılmıyor)
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
  // DYB inline inputları kaldırıldı; artık sadece plan verileri gösterilecek.
  
  // Real-time sync state kaldırıldı

  // Advanced notifications state
  
  const tableContainerRef = useRef<HTMLDivElement | null>(null);


  // Online/offline izleme kaldırıldı

  // Auto-refresh setup
  // Otomatik yenileme kaldırıldı

  // (Taşındı) -> effect aşağıda state tanımlarından sonra tanımlanacak

  // When a subject is previewed, fetch coach-saved playlist (if any) and its items
  useEffect(() => {
  const fetchPrefPlaylist = async () => {
      try {
        if (previewSubjectIndex === null || !user || !plan) return;
        const subjCode = plan.subjects[previewSubjectIndex]?.subject;
        if (!subjCode) return;
        // fetch saved preference: if current user is student, call student-facing endpoint, else coach endpoint
        let pref = null;
        try {
          if (user?.role === 'student') {
            const prefRes: any = await getMySubjectPreferences(subjCode);
            pref = prefRes.data?.[0] || null;
          } else {
            const prefRes: any = await getCoachSubjectPreferences(user._id, subjCode);
            pref = prefRes.data?.[0] || null;
          }
        } catch (e) {
          pref = null;
        }
        if (pref?.playlistId) {
          const listRes: any = await getYouTubePlaylistItems(pref.playlistId, { maxResults: 50 });
          const vids = listRes.data?.videos || [];
          // ensure sorted by playlist position
          vids.sort((a:any,b:any) => (Number(a.position||0) - Number(b.position||0)));
          // if (mounted) setPreviewPlaylistVideos(vids);
        }
      } catch (e) {
        // if (mounted) setPreviewPlaylistVideos(null);
      }
    };
    fetchPrefPlaylist();
  return () => { /* cleanup */ };
  }, [previewSubjectIndex, user, plan]);

  const placeholderSvg = encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect width='100%' height='100%' fill='%23e5e7eb'/><polygon points='130,90 210,50 210,130' fill='%239ca3af'/></svg>");
  const placeholderDataUrl = `data:image/svg+xml;charset=UTF-8,${placeholderSvg}`;

  const getThumbnailUrl = (v: any) => {
    if (!v) return placeholderDataUrl;
    return v.thumbnail || v.thumbnailUrl || v.thumb || v.thumbnail?.url || v.thumbnails?.medium?.url || v.thumbnails?.default?.url || v.thumbnails?.high?.url || placeholderDataUrl;
  };

  // Manual refresh handler kaldırıldı

  // Toggle auto refresh
  // toggleAutoRefresh kaldırıldı (kullanılmıyor)

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
  


  

  // Timer modal state
  const [showTimer, setShowTimer] = useState(false);
  const [activeSubject, setActiveSubject] = useState<{ subject: string; targetTime?: number } | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  // Fetch coach program (videos) when plan date changes, timer açılıyor veya aktif ders değişiyor
  useEffect(() => {
    const fetchCoachProgram = async () => {
      try {
        if (!user || !plan) return;
        const dateStr = new Date(plan.date).toISOString().slice(0,10);
        let latestProgram: any = null;
        if (user.role === 'student') {
          try {
            const res = await apiRequest(`/daily-plans/by-date/${dateStr}`);
            latestProgram = res.data || null;
          } catch (e) {
            latestProgram = null;
          }
        } else {
          const res = await apiRequest(`/coach/programs?studentId=${user._id}&date=${dateStr}&limit=1`);
          latestProgram = (res.data || [])[0] || null;
        }
        setCoachProgram(latestProgram);
        const ids: string[] = [];
        if (latestProgram?.subjects) {
          latestProgram.subjects.forEach((s:any) => (s.videos||[]).forEach((v:any)=> v?.videoId && ids.push(v.videoId)));
        }
        (plan.subjects||[]).forEach((s:any)=> (s.videos||[]).forEach((v:any)=> v?.videoId && ids.push(v.videoId)));
        const uniq = Array.from(new Set(ids));
        if (uniq.length) {
          try {
            const metaRes: any = await getYouTubeVideos(uniq);
            const items = metaRes.data?.videos || [];
            const map: Record<string, any> = {};
            items.forEach((it:any) => { map[it.id] = it; });
            setVideoMetaMap(map);
          } catch {}
        } else {
          setVideoMetaMap({});
        }
      } catch {
        setCoachProgram(null);
      }
    };
    fetchCoachProgram();
  }, [user, plan && plan.date, showTimer, activeSubject?.subject]);

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
  // DYB sütunları kaldırıldı
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
    {
      title: 'Çalış',
      key: 'actions',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            if (showIntro) return;
            setActiveSubject({ subject: record.subject, targetTime: record.targetTime });
            setShowIntro(true);
            // 1.2s (intro) + 0ms delay to open modal AFTER split starts fade
            setTimeout(() => {
              setShowTimer(true);
            }, 1200); // match intro duration
            // Remove intro after fade (1200 + 400)
            setTimeout(() => setShowIntro(false), 1200 + 800);
          }}
        >
          Hazır
        </Button>
      )
    }
  ], [isStudent, sorterState]);

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
            <div className="subject-preview-header enhanced">
              <div className="sp-left">
                <h3 className="pdl-heading sp-heading">{getSubjectDisplayName(plan.subjects[previewSubjectIndex].subject)}</h3>
                <p className="pdl-desc sp-desc">{plan.subjects[previewSubjectIndex].description || 'Bu ders için henüz açıklama eklenmemiş.'}</p>
              </div>
              <div className="sp-meta">
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

      {/* Plan Summary (öğrenci olmayan roller için gösterilmeye devam) */}
      {!isStudent && (
        <Card className="plan-summary" size="small">
          <Row gutter={16}>
            <Col xs={12} md={4}>
              <Statistic
                title="Toplam Hedef"
                value={plan.stats.totalTargetQuestions ?? 0}
                prefix={<TrophyOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Tamamlanan"
                value={plan.stats.totalCompletedQuestions ?? 0}
                suffix={`/${plan.stats.totalTargetQuestions ?? 0}`}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Tamamlanma"
                value={Math.round(plan.stats.completionRate ?? 0)}
                suffix="%"
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Başarı Oranı"
                value={Math.round(plan.stats.successRate ?? 0)}
                suffix="%"
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Toplam Süre"
                value={plan.stats.totalStudyTime ?? 0}
                suffix="dk"
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col xs={12} md={4}>
              <Statistic
                title="Net Puan"
                value={Number.isFinite(plan.stats.netScore) ? plan.stats.netScore.toFixed(1) : 0}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Student Feedback Section - Only visible to students */}
      {isStudent && (
        <div className="daily-eval-root">
          <div className="deval-head">
            <h3 className="deval-title"><StarOutlined /> Günlük Değerlendirme</h3>
            <p className="deval-sub">Bugünkü çalışma deneyimini hızlıca değerlendir.</p>
          </div>
          <div className="deval-body">
            <section className="deval-block deval-motivation">
              <div className="block-head">
                <h5 className="block-title"><FireOutlined /> Motivasyon</h5>
                <span className="block-hint">Günün hissi</span>
              </div>
              <div className="deval-quick-actions">
                {[{ value:3, emoji:'😔', label:'Zor Gün' },{ value:5, emoji:'😐', label:'Normal' },{ value:7, emoji:'🙂', label:'İyi' },{ value:9, emoji:'😊', label:'Harika' }].map(a => (
                  <button key={a.value} type="button" className={`qa-btn ${motivationScore===a.value?'active':''}`} onClick={()=>setMotivationScore(a.value)}>
                    <span className="qa-emoji">{a.emoji}</span>
                    <span className="qa-label">{a.label}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="deval-block deval-feedback">
              <div className="block-head">
                <h5 className="block-title"><BulbOutlined /> Geri Bildirim</h5>
                <span className="block-hint">En az 5 karakter</span>
              </div>
              <div className="feedback-grid">
                <div className="fb-left">
                  <div className="fb-label-row">
                    <span className="fb-label">Program Değerlendirmesi</span>
                    <span className="fb-count">{dailyFeedback.length}/500</span>
                  </div>
                  <Input.TextArea
                    value={dailyFeedback}
                    onChange={(e)=>setDailyFeedback(e.target.value)}
                    maxLength={500}
                    rows={5}
                    placeholder="Bugünkü program hakkında düşüncelerini yaz..."
                    className="deval-textarea"
                  />
                </div>
                <div className="fb-right">
                  <div className="suggest-title">💡 Öneriler</div>
                  <div className="suggest-pills">
                    {['Zorlanan konular?','İşe yarayan teknik?','Yarın için odak?','Motivasyonu etkileyen şey?'].map((s,i)=>(
                      <button key={i} type="button" className="suggest-pill" onClick={()=>{
                        if(dailyFeedback.length<460){
                          setDailyFeedback(prev=> prev + (prev?' ':'') + s);
                        }
                      }}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="deval-block deval-metrics">
              <div className="block-head">
                <h5 className="block-title"><TrophyOutlined /> Günlük Metrikler</h5>
                <span className="block-hint">Özet</span>
              </div>
              <div className="metrics-grid">
                {[
                  { key:'target', label:'Hedef', value: String(plan.stats.totalTargetQuestions ?? 0) },
                  { key:'completed', label:'Tamamlanan', value:`${plan.stats.totalCompletedQuestions ?? 0}/${plan.stats.totalTargetQuestions ?? 0}` },
                  { key:'completion', label:'Tamamlanma', value:`${Math.round(plan.stats.completionRate ?? 0)}%` },
                  { key:'success', label:'Başarı', value:`${Math.round(plan.stats.successRate ?? 0)}%` },
                  { key:'time', label:'Süre', value:`${plan.stats.totalStudyTime ?? 0} dk` },
                  { key:'net', label:'Net', value: Number.isFinite(plan.stats.netScore) ? (plan.stats.netScore as number).toFixed(1) : '0' }
                ].map(m => (
                  <div key={m.key} className="metric-chip">
                    <div className="m-value">{m.value}</div>
                    <div className="m-label">{m.label}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="deval-submit">
            <div className="submit-text">Değerlendirmen koçuna gönderilecek ve plan optimizasyonunda kullanılacak.</div>
            <Button
              type="primary"
              size="large"
              icon={<CheckCircleOutlined />}
              className="deval-submit-btn"
              disabled={!dailyFeedback.trim()}
              onClick={async ()=>{
                try {
                  for (let index = 0; index < plan.subjects.length; index++) {
                    const subj = plan.subjects[index];
                    await apiRequest(`/daily-plans/${plan._id}/student-feedback`, {
                      method:'POST',
                      body: JSON.stringify({
                        subjectIndex: index,
                        correctAnswers: subj.correctAnswers,
                        wrongAnswers: subj.wrongAnswers,
                        blankAnswers: subj.blankAnswers,
                        feedbackText: dailyFeedback,
                        motivationScore
                      })
                    });
                  }
                  message.success('Günlük değerlendirmeniz koçunuza gönderildi!');
                  setDailyFeedback('');
                  setMotivationScore(5);
                  onRefresh?.();
                } catch (error:any){
                  console.error(error);
                  message.error(error.message || 'Feedback gönderilirken hata');
                }
              }}
            >Gönder</Button>
          </div>
        </div>
      )}



      {/* Timer Modal */}
  {showIntro && <FullScreenSplitIntro duration={1200} fadeDuration={800} label={activeSubject?.subject} imageSrc={ekranImage} />}
      <Modal
        open={showTimer}
        onCancel={() => { setShowTimer(false); setActiveSubject(null); }}
        footer={null}
  getContainer={false}
        destroyOnClose
        width={activeSubject ? 980 : 520}
        title={activeSubject ? `${activeSubject.subject} • Çalışma Oturumu` : 'Çalışma Oturumu'}
      >
        {activeSubject && (() => {
          const subjIndex = plan.subjects.findIndex(s => s.subject === activeSubject.subject);
          const subj = subjIndex >= 0 ? plan.subjects[subjIndex] : null;
          const subjCode = subj?.subject;
          const cpSub = (subjCode && coachProgram && (coachProgram.subjects || []).find((s:any) => s.subject === subjCode)) || (coachProgram && (coachProgram.subjects || [])[subjIndex]);
          const vidsFromPlan = subj?.videos || [];
          const coachSelected = (cpSub && Array.isArray(cpSub.videos)) ? cpSub.videos : [];
          const vids = (coachSelected && coachSelected.length)
            ? coachSelected
            : vidsFromPlan;
          return (
            <div className="timer-modal-body" style={{ display:'flex', gap: 32, alignItems:'flex-start', flexDirection:'column' }}>
              <div className="timer-panel" style={{ margin: 'auto' }}>
                <StudyTimer
                  size="large"
                  initialConfig={{
                    subject: activeSubject.subject,
                    studyDuration: activeSubject.targetTime && activeSubject.targetTime > 0 ? Math.min(activeSubject.targetTime, 180) : 25,
                    technique: 'Pomodoro'
                  }}
                  onSessionComplete={() => {
                    setShowTimer(false);
                    setActiveSubject(null);
                    if (onRefresh) onRefresh();
                  }}
                />
              </div>
              <div className="timer-program-detail" style={{ flex:1, minWidth:0 }}>
                {subj && vids && vids.length > 0 && (
                  <ProgramDetailLayout
                    key={`pdl-${vids.length}-${vids[0]?.videoId || vids[0]?._id || 'x'}`}
                    subjectName={getSubjectDisplayName(subj.subject)}
                    description={subj.description}
                    videos={vids}
                    getThumbnailUrl={getThumbnailUrl}
                    videoMetaMap={videoMetaMap}
                    onSelectVideo={() => {}}
                  />
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default DailyTable;