import React, { useEffect, useMemo, useState } from 'react';
import { Card, Tag, Typography, DatePicker, Select, Space, Button, Empty, Spin, Pagination, Progress, Badge, Row, Col } from 'antd';
// Link import'u kaldırıldı - artık kullanılmıyor
// Iconlar list view kaldırıldığı için şimdilik kullanılmıyor
import { getStudentPrograms, StudentProgram } from '../../services/api';
import './StudentPrograms.scss';

const { Title, Text } = Typography;

const statusOptions = [
  { label: 'Tümü', value: '' },
  { label: 'Taslak', value: 'draft' },
  { label: 'Aktif', value: 'active' },
  { label: 'Tamamlandı', value: 'completed' },
  { label: 'Başarısız', value: 'failed' },
  { label: 'Arşiv', value: 'archived' },
];

const statusColor: Record<string, string> = {
  draft: 'default',
  active: 'processing', 
  completed: 'success',
  failed: 'error',
  archived: 'purple',
};

const statusText: Record<string, string> = {
  draft: 'Taslak',
  active: 'Aktif',
  completed: 'Tamamlandı', 
  failed: 'Başarısız',
  archived: 'Arşiv',
};

const PAGE_SIZE_DEFAULT = 10;

const StudentPrograms: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StudentProgram[]>([]);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState<string | undefined>();
  const [from, setFrom] = useState<any>(null);
  const [to, setTo] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE_DEFAULT);

  const load = async () => {
    setLoading(true);
    try {
      console.log('🔍 StudentPrograms - API çağrısı başlatılıyor...');
      const res = await getStudentPrograms({
        status: (status as any) || undefined,
        from: from ? from.toDate().toISOString() : undefined,
        to: to ? to.toDate().toISOString() : undefined,
        page,
        limit,
      });
              console.log('StudentPrograms - API yanıtı:', res);
              console.log('Program sayısı:', res.data?.length || 0);
      
      // Demo data ekleme - gerçek veriler yoksa
      const apiData = res.data || [];
   
      setItems(apiData);
      setTotal(apiData.length);
    } catch (error) {
              console.error('StudentPrograms - API hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to, page, limit]);

  const header = useMemo(() => (
    <Space wrap>
      <Select
        options={statusOptions}
        value={status ?? ''}
        style={{ width: 160 }}
        onChange={(v) => { setPage(1); setStatus(v || undefined); }}
      />
      <DatePicker
        placeholder="Başlangıç"
        value={from}
        onChange={(d) => { setPage(1); setFrom(d); }}
      />
      <DatePicker
        placeholder="Bitiş"
        value={to}
        onChange={(d) => { setPage(1); setTo(d); }}
      />
      <Select
        style={{ width: 120 }}
        value={limit}
        onChange={(v) => { setPage(1); setLimit(v); }}
        options={[10, 20, 50].map(n => ({ label: `${n}/sayfa`, value: n }))}
      />
      <Button onClick={() => { setStatus(undefined); setFrom(null); setTo(null); setPage(1); setLimit(PAGE_SIZE_DEFAULT); }}>Temizle</Button>
    </Space>
  ), [status, from, to, limit]);

  return (
    <div className="student-programs modern-grid">
      <div className="programs-toolbar">
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Title level={5} style={{ margin: 0 }}>Programlarım</Title>
          {header}
        </Space>
      </div>
      {loading ? (
        <div className="programs-loading"><Spin /></div>
      ) : items.length === 0 ? (
        <Empty description="Kayıt bulunamadı" />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {items.map(p => {
              const completionRate = p.stats?.completionRate || 0;
              const totalSubjects = p.subjects?.length || 0;
              const completedSubjects = p.subjects?.filter(s => s.status === 'completed')?.length || 0;
              const isToday = new Date(p.date).toDateString() === new Date().toDateString();
              return (
                <Col xs={24} sm={12} md={8} lg={6} xl={6} key={p._id}>
                  <Card hoverable className={`program-card status-${p.status}`} bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                      <Space wrap>
                        <Badge count={isToday ? 'BUGÜN' : null} style={{ backgroundColor: '#52c41a' }}>
                          <span className="program-title">{p.title || 'Çalışma Programı'}</span>
                        </Badge>
                        <Tag color={statusColor[p.status] || 'default'}>{statusText[p.status] || p.status}</Tag>
                      </Space>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(p.date).toLocaleDateString('tr-TR', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </Text>
                    {totalSubjects > 0 && (
                      <div className="progress-row">
                        <Space size={4} wrap>
                          <Text type="secondary" style={{ fontSize: 12 }}>{completedSubjects}/{totalSubjects} konu</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>{p.stats?.totalStudyTime || 0} dk</Text>
                        </Space>
                        <Progress percent={completionRate} size="small" strokeColor={completionRate === 100 ? '#52c41a' : '#1677ff'} showInfo={false} />
                        <div className="progress-label">%{completionRate}</div>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })}
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <Pagination current={page} pageSize={limit} total={total} onChange={(p, ps) => { setPage(p); setLimit(ps); }} size="small" showSizeChanger />
          </div>
        </>
      )}
    </div>
  );
};

export default StudentPrograms;


